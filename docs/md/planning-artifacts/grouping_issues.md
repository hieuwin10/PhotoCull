# Phân tích Vấn đề Quản lý Nhóm Ảnh — PhotoCull AI

## 1. Tổng quan Hệ thống Nhóm Ảnh Hiện tại

### File liên quan:
- `services/imageUtils.ts` → Thuật toán nhóm ảnh (pHash + Chain Comparison)
- `hooks/useImageGroups.ts` → CRUD nhóm ảnh (Move, Split, Merge, Delete, Trash)
- `hooks/useProjectManager.ts` → Lưu/Load project, xử lý file
- `components/PhotoGroup.tsx` → UI hiển thị nhóm
- `services/geminiService.ts` → AI refine/merge nhóm

---

## 2. Các Vấn đề Nghiêm trọng ❌

### 2.1. 🔴 Thuật toán Nhóm chỉ so sánh ảnh LIỀN KỀ (Chain Comparison)

**File**: `imageUtils.ts` dòng 228-244

```typescript
for (let i = 1; i < validImages.length; i++) {
    const currentImg = validImages[i];
    const prevImg = currentGroup.images[currentGroup.images.length - 1];
    const distance = getHammingDistance(currentImg.hash, prevImg.hash);
    if (distance <= THRESHOLD) {
        currentGroup.images.push(currentImg);
    } else {
        groups.push(currentGroup);
        // Tạo nhóm mới...
    }
}
```

**Vấn đề**: Chỉ so sánh ảnh `[i]` với ảnh `[i-1]`. Nếu ảnh không được sắp xếp theo thời gian từ trước (ví dụ: tên file không tuần tự, hoặc ảnh từ nhiều thiết bị), 2 ảnh giống nhau nhưng **cách xa** trong danh sách sẽ **KHÔNG BAO GIỜ** được nhóm chung.

**Ví dụ thực tế**:
```
IMG_001.jpg (cảnh A)  ← Nhóm 1
IMG_002.jpg (cảnh B)  ← Nhóm 2 (khác A)
IMG_003.jpg (cảnh A)  ← Nhóm 3 (giống 001, nhưng KHÔNG so sánh với 001!)
```

**Mức độ**: 🔴 NGHIÊM TRỌNG — Đây là lỗi logic ảnh hưởng trực tiếp đến chất lượng nhóm.

---

### 2.2. 🔴 Không sắp xếp file trước khi nhóm

**File**: `useProjectManager.ts` dòng 260

```typescript
const groupedImages = await groupSimilarImages(newFiles, ...);
```

`newFiles` là `File[]` từ `<input>` hoặc `showDirectoryPicker()`. **Thứ tự file hoàn toàn phụ thuộc vào trình duyệt/OS**, không đảm bảo sắp xếp theo tên hay thời gian.

**Vấn đề**: Vì Chain Comparison chỉ so sánh liền kề, nếu file không được sort trước → kết quả nhóm sẽ **bị lỗi nặng** với tập ảnh lớn.

**Mức độ**: 🔴 NGHIÊM TRỌNG — Sort file trước khi nhóm là bước bắt buộc.

---

### 2.3. 🟡 Không dùng EXIF timestamp để nhóm

**Vấn đề**: Code hiện tại chỉ dùng pHash (nội dung ảnh) để nhóm. Không đọc EXIF `DateTimeOriginal`.

**Hậu quả**:
- Ảnh burst shot (chụp liên tục) có thể bị tách ra nếu có ảnh xen giữa (do không sort theo thời gian chụp).
- Ảnh chụp cùng cảnh nhưng khác góc lớn (pHash khác) sẽ bị tách thành nhóm riêng, dù thời gian chụp liên tiếp.

**Giải pháp**: Kết hợp EXIF timestamp + pHash để tạo "siêu nhóm" chính xác hơn.

---

### 2.4. 🟡 Threshold cứng, không tự điều chỉnh

**File**: `imageUtils.ts` dòng 216

```typescript
const THRESHOLD = 12; // 12 trên 64 bit
```

**Vấn đề**: Ngưỡng cố định 12/64 (~19%) có thể:
- **Quá rộng** cho ảnh chân dung (nhóm nhầm 2 người khác nhau).
- **Quá hẹp** cho ảnh phong cảnh (không nhóm được 2 góc chụp khác nhau cùng cảnh).

**Giải pháp**: Threshold nên được điều chỉnh tự động hoặc cho phép người dùng tùy chỉnh qua UI (slider).

---

### 2.5. 🟡 Không có phát hiện trùng lặp (Duplicate Detection)

**Vấn đề**: Nếu người dùng kéo thả cùng 1 thư mục 2 lần (hoặc có ảnh copy), hệ thống sẽ tạo ra 2 bản riêng biệt mà không cảnh báo.

**Giải pháp**: Kiểm tra pHash + fileName để phát hiện ảnh trùng và cảnh báo người dùng.

---

### 2.6. 🟡 Memory Leak khi Xóa/Restore ảnh

**File**: `useImageGroups.ts` dòng 160-196

**Vấn đề**: Khi xóa ảnh vào Trash, `ObjectURL` (previewUrl, thumbnailUrl) **không được revoke**. Ảnh xóa vẫn chiếm RAM. Khi Trash bị Empty, các ObjectURL cũng không được dọn.

**Hậu quả**: Với 10k ảnh, xóa đi xóa lại → memory leak.

---

### 2.7. 🟡 handleMergeGroups không reset trạng thái phân tích

**File**: `useImageGroups.ts` dòng 106-129

**Vấn đề**: Khi merge 2 nhóm đã phân tích (status='done'), `bestImageIds` được gộp lại nhưng **selectionReason** và **rejectionReason** chỉ giữ từ nhóm trên. Kết quả phân tích AI bị sai ngữ cảnh.

**Giải pháp**: Khi merge, nên reset `status` về `pending` và xóa `selectionReason`/`rejectionReason` cũ.

---

### 2.8. 🟢 Nhóm rỗng không được tự dọn dẹp nhất quán

**Vấn đề**: `handleDeleteImage` kiểm tra nhóm rỗng và xóa (dòng 181-183), nhưng `handleMoveImage` **KHÔNG** kiểm tra. Nếu di chuyển ảnh cuối cùng ra khỏi nhóm → nhóm rỗng vẫn tồn tại.

---

### 2.9. 🟢 handleSortGroups sort theo `file.lastModified`

**File**: `useImageGroups.ts` dòng 141

```typescript
case 'time_desc':
    return imgB.file.lastModified - imgA.file.lastModified;
```

**Vấn đề**: `file.lastModified` là **thời gian sửa file** trên ổ cứng, KHÔNG phải thời gian chụp. Nếu ảnh được copy/di chuyển, thời gian sẽ sai.

**Giải pháp**: Nên dùng EXIF `DateTimeOriginal` thay vì `lastModified`.

---

## 3. Bảng Tổng hợp Vấn đề

| # | Vấn đề | Mức độ | Loại | Giải pháp |
|---|--------|--------|------|-----------|
| 2.1 | Chain Comparison chỉ so liền kề | 🔴 Nghiêm trọng | Thuật toán | Dùng BK-Tree hoặc Union-Find để so sánh ALL-to-ALL |
| 2.2 | File không được sort trước | 🔴 Nghiêm trọng | Logic | Sort theo name/EXIF time trước khi nhóm |
| 2.3 | Không dùng EXIF timestamp | 🟡 Quan trọng | Thiếu tính năng | Thêm EXIF parsing, nhóm theo thời gian |
| 2.4 | Threshold cứng | 🟡 Quan trọng | UX | Cho phép tùy chỉnh hoặc tự điều chỉnh |
| 2.5 | Không phát hiện ảnh trùng | 🟡 Quan trọng | Thiếu tính năng | Kiểm tra hash + fileName |
| 2.6 | Memory Leak khi Trash | 🟡 Quan trọng | Hiệu năng | Revoke ObjectURL khi xóa |
| 2.7 | Merge không reset analysis | 🟡 Quan trọng | Logic | Reset status khi merge |
| 2.8 | Nhóm rỗng sau Move | 🟢 Nhỏ | Logic | Thêm kiểm tra trong handleMoveImage |
| 2.9 | Sort dùng lastModified | 🟢 Nhỏ | Dữ liệu | Dùng EXIF DateTimeOriginal |

---

## 4. Đề xuất Thuật toán Nhóm Cải tiến

### Thuật toán hiện tại: O(n) — Chain Comparison
```
So ảnh 1 với 2, 2 với 3, 3 với 4...
→ Nhanh nhưng dễ sai
```

### Đề xuất: Multi-Pass Grouping
```
Pass 1: Sort file theo tên/EXIF time         ← O(n log n)
Pass 2: Chain Comparison với pHash            ← O(n) — nhóm thô
Pass 3: Kiểm tra ảnh lẻ (nhóm 1 ảnh) so với  ← O(k × m) — k nhóm lẻ, m nhóm
        tất cả nhóm khác bằng Hamming dist
Pass 4: (Optional) Laplacian Score để pre-    ← O(n)
        select ảnh nét nhất mỗi nhóm
```

Cách tiếp cận này giữ được **tốc độ O(n)** cho phần lớn ảnh (Pass 2), nhưng bổ sung Pass 3 để xử lý các "ảnh lạc loài" mà Chain Comparison bỏ sót. Tổng thời gian vẫn rất nhanh vì Pass 3 chỉ chạy trên ảnh lẻ (thường ~5-10% tổng số).
