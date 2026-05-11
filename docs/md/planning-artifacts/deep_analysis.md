# Phân tích Chuyên sâu: Tối ưu Xử lý 10,000+ Ảnh — Thuần Thuật toán, Không AI

## 1. Bài toán Thực tế

Khi người dùng mở một thư mục chứa **10,000+ file ảnh** (mỗi file 5-20MB), tổng dung lượng có thể lên tới **50-200GB**. Trình duyệt chỉ có khoảng **2-4GB RAM** khả dụng. Nếu không xử lý đúng cách, hệ thống sẽ:
- Treo cứng hoặc crash tab trình duyệt.
- Tiêu tốn hàng phút chỉ để load file.
- Không thể cuộn mượt danh sách ảnh.

**Nguyên tắc vàng**: Không bao giờ load toàn bộ ảnh vào bộ nhớ. Xử lý từng lô nhỏ, giải phóng bộ nhớ ngay sau khi dùng xong.

---

## 2. Phân tích Code Hiện tại (`imageUtils.ts`)

### 2.1. Điều đã làm tốt ✅
- **Dùng `createImageBitmap()`** thay vì `new Image()` — nhanh hơn vì decode ảnh bằng native C++ của trình duyệt.
- **pHash 8×8 (64-bit)** — kích thước hash nhỏ, tính toán nhanh.
- **Batch processing** (50 file/lô) — không load hết 10k file cùng lúc.
- **`bitmap.close()`** — giải phóng bitmap sau khi dùng, tránh memory leak.
- **`setTimeout(resolve, 0)`** — nhường CPU cho UI giữa các batch.

### 2.2. Điều cần cải thiện ❌
- **ObjectURL không được revoke khi không cần**: `URL.createObjectURL(file)` tạo blob URL giữ tham chiếu đến file trong RAM. Với 10k ảnh, đây là 10k blob URLs tiêu tốn **hàng GB RAM**.
- **Chain Comparison chỉ so sánh ảnh liền kề**: Nếu file không được sắp xếp theo thời gian từ trước, 2 ảnh tương tự nhưng cách xa nhau trong danh sách sẽ không được nhóm chung.
- **Không có EXIF parsing**: Bỏ lỡ thông tin thời gian chụp cực kỳ hữu ích để nhóm burst shots.
- **Không có Laplacian sharpness scoring**: Chưa tự động đánh giá độ nét để pre-select ảnh tốt nhất.
- **Không dùng Web Worker**: Toàn bộ xử lý chạy trên Main Thread — UI đơ khi xử lý lô lớn.

---

## 3. Kỹ thuật Tối ưu Chi tiết (Không dùng AI)

### 3.1. 🔧 Web Worker Pool — Đa luồng Song song

**Vấn đề**: JavaScript là single-threaded. Xử lý 10k ảnh trên Main Thread = UI chết.

**Giải pháp**: Tạo một pool gồm 4-8 Web Workers (bằng số nhân CPU). Mỗi Worker nhận 1 batch file và trả về kết quả (hash, EXIF, sharpness score).

```
Main Thread: Giao diện người dùng (luôn mượt)
├── Worker 1: Xử lý ảnh 1-50
├── Worker 2: Xử lý ảnh 51-100
├── Worker 3: Xử lý ảnh 101-150
└── Worker 4: Xử lý ảnh 151-200
```

**Hiệu quả**: Tăng tốc 4-8 lần trên máy đa nhân. UI hoàn toàn không bị ảnh hưởng.

**Lưu ý quan trọng**: Sử dụng `OffscreenCanvas` trong Worker (thay vì `document.createElement('canvas')` vì Worker không có quyền truy cập DOM).

---

### 3.2. 📊 Laplacian Variance — Chấm điểm Độ nét

**Cách hoạt động**:
1. Resize ảnh xuống **64×64** hoặc **128×128** (cực nhanh vì kích thước rất nhỏ).
2. Chuyển sang grayscale.
3. Áp dụng kernel Laplacian 3×3: `[0, 1, 0], [1, -4, 1], [0, 1, 0]`.
4. Tính **phương sai (variance)** của kết quả. Phương sai CAO = ảnh NÉT. Phương sai THẤP = ảnh MỜ.

**Tại sao resize nhỏ?**: Với 10k ảnh, ta KHÔNG xử lý ảnh gốc (5000×3000 pixel). Resize xuống 128×128 giảm lượng pixel cần xử lý **1400 lần** mà vẫn đủ chính xác để phát hiện ảnh mờ.

**Ứng dụng**: Trong mỗi nhóm ảnh tương tự, tự động chọn ảnh có điểm Laplacian cao nhất làm "ảnh tốt nhất" — **hoàn toàn không cần AI**.

---

### 3.3. 📷 EXIF Parsing — Nhóm theo Thời gian Chụp

**Thư viện**: `exifr` (chỉ ~10KB gzipped, hỗ trợ đọc EXIF từ Blob/File trực tiếp).

**Cách hoạt động**:
1. Đọc trường `DateTimeOriginal` từ metadata EXIF (chỉ cần đọc vài KB đầu file, KHÔNG load toàn bộ ảnh).
2. Sắp xếp ảnh theo thời gian chụp.
3. Nếu 2 ảnh liên tiếp có khoảng cách thời gian < **2 giây** → cùng nhóm (burst shot).

**Tại sao EXIF trước, pHash sau?**:
- Đọc EXIF chỉ đọc **vài KB header** của file → cực nhanh, KHÔNG decode pixel.
- pHash phải decode toàn bộ ảnh → chậm hơn nhiều.
- Pipeline tối ưu: **EXIF (nhóm thô) → pHash (refine nhóm) → Laplacian (chấm điểm)**.

---

### 3.4. 🎨 Color Histogram Comparison — Phát hiện Bối cảnh Giống nhau

**Cách hoạt động**:
1. Resize ảnh xuống **32×32**.
2. Tính histogram 3 kênh RGB (chia mỗi kênh thành 16 bin = tổng 48 giá trị).
3. So sánh 2 ảnh bằng **Chi-Square Distance** hoặc **Bhattacharyya Distance**.

**Ứng dụng**: Bổ sung cho pHash. Hai ảnh chụp cùng cảnh nhưng khác góc (pHash khác nhau) vẫn có histogram tương tự → có thể nhóm chung.

---

### 3.5. 💾 Quản lý Bộ nhớ Nghiêm ngặt (Critical cho 10k+ ảnh)

**Chiến lược "Load On Demand"**:
1. **Lúc khởi tạo**: Chỉ đọc EXIF (vài KB/file). KHÔNG tạo ObjectURL, KHÔNG decode ảnh.
2. **Khi cuộn đến nhóm**: Mới tạo ObjectURL cho các ảnh trong viewport + overscan.
3. **Khi cuộn đi**: Gọi `URL.revokeObjectURL()` cho các ảnh ra khỏi viewport.

**Kỹ thuật cụ thể**:
- Dùng `IntersectionObserver` hoặc callback của `react-virtuoso` để biết ảnh nào đang visible.
- Giữ tối đa **50-100 ObjectURL** trong bộ nhớ tại mọi thời điểm (thay vì 10,000).
- Sử dụng `WeakRef` hoặc LRU Cache cho thumbnails.

---

### 3.6. 🗂️ IndexedDB Cache — Không Tính Lại Khi Mở Lại

**Vấn đề**: Nếu người dùng mở lại cùng thư mục, phải tính hash, EXIF, sharpness lại từ đầu?

**Giải pháp**: Lưu kết quả tính toán vào IndexedDB với key = `fileName + fileSize + lastModified`.
- Lần đầu mở thư mục: Tính toán đầy đủ → lưu cache.
- Lần sau mở lại: Đọc cache → **khởi động gần như tức thời**.

---

### 3.7. 📐 Pipeline Xử lý Tối ưu (Kết hợp tất cả)

```
[10,000 files]
      │
      ▼
  ┌─────────────────────────────────────┐
  │ Phase 1: EXIF Parse (chỉ header)    │ ← Cực nhanh, ~1-2ms/file
  │ → Sắp xếp theo thời gian chụp      │    10k file ≈ 10-20 giây
  │ → Nhóm thô theo khoảng cách thời   │
  │   gian (burst detection)            │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────┐
  │ Phase 2: pHash (resize 8×8)         │ ← Nhanh, ~5-10ms/file
  │ → Chạy trên Worker Pool (4 workers) │    10k file ≈ 15-25 giây
  │ → Refine nhóm: Tách nhóm EXIF nếu  │    (song song 4 luồng)
  │   ảnh trong nhóm thực sự khác nhau  │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────┐
  │ Phase 3: Laplacian Score (resize    │ ← Trung bình, ~10-15ms/file
  │ 128×128)                            │    10k file ≈ 25-40 giây
  │ → Chấm điểm độ nét mỗi ảnh         │    (song song 4 luồng)
  │ → Pre-select ảnh nét nhất mỗi nhóm │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────┐
  │ Phase 4: Hiển thị & Lazy Load      │ ← Tức thì (chỉ load viewport)
  │ → Virtualized list + On-demand URL  │
  │ → Cache kết quả vào IndexedDB       │
  └─────────────────────────────────────┘

  ⏱️ Tổng thời gian ước tính: 50-85 giây cho 10,000 ảnh
  💾 RAM sử dụng: ~200-500MB (thay vì 5-10GB nếu load hết)
```

---

## 4. Kết luận

Bằng cách kết hợp:
- **EXIF** → Nhóm thô nhanh (không decode ảnh)
- **pHash** → Nhóm chính xác (decode 8×8 pixel)
- **Laplacian** → Chấm điểm nét (decode 128×128 pixel)
- **Web Worker Pool** → Chạy song song, UI mượt
- **Lazy Load + ObjectURL Management** → RAM luôn ổn định
- **IndexedDB Cache** → Mở lại tức thì

Chúng ta có thể xử lý **10,000+ ảnh trong khoảng 1-2 phút**, tự động nhóm và pre-select ảnh tốt nhất **hoàn toàn bằng thuật toán**, với RAM ổn định và UI không bao giờ bị đơ.

Phần AI (Gemini) chỉ được gọi khi người dùng **chủ động yêu cầu** phân tích chi tiết cho từng nhóm cụ thể, giúp **tiết kiệm chi phí API** đáng kể.
