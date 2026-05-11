# 🖼️ Nâng Cấp Trình Xem Ảnh (Image Viewer Pro)

> **Mục tiêu**: Biến trình xem ảnh hiện tại thành một "Studio thu nhỏ" chuyên nghiệp, tối ưu diện tích, tăng tốc độ và thêm các tính năng đỉnh cao cho việc hậu kỳ.
> **Lưu ý từ User**: Tính năng Split View phải là **tùy chọn** (on-demand), không ép buộc.

---

## 1. Các Tính Năng Nâng Cấp Chính

### 🚀 1.1 Bố cục "Lightroom" (Tối ưu không gian)
- **Khu vực ảnh (75% bên trái)**: Nền tối/sáng thuần khiết, không viền, tôn vinh bức ảnh tối đa.
- **Sidebar công cụ (25% bên phải)**: Gom tất cả các thanh trượt (brightness, contrast...), gợi ý AI, và danh sách biến thể vào đây.
- **Tính năng ẩn/hiện**: Người dùng có thể nhấn phím `Tab` hoặc click icon để thu gọn sidebar, dành 100% không gian cho ảnh.

### 🎚️ 1.2 So Sánh "Trước / Sau" (Split View) — [TÙY CHỌN]
- **Cách hoạt động**: Khi ảnh có phiên bản sửa đổi bởi AI (Magic Fix), một icon "So sánh" sẽ sáng lên.
- **Trải nghiệm người dùng**:
    - Mặc định: Chỉ hiện ảnh sau khi sửa (hoặc ảnh gốc nếu chưa sửa).
    - Khi KÍCH HOẠT (Click icon hoặc giữ phím `\`): Một thanh trượt đứng sẽ xuất hiện ở giữa ảnh. Người dùng kéo thanh này sang trái/phải để so sánh trực quan sự khác biệt.
    - Giúp người dùng dễ dàng đánh giá xem AI sửa có hợp ý mình không.

### 🎞️ 1.3 Dải Ảnh Phụ (Filmstrip) Cạnh Dưới
- **Vấn đề hiện tại**: Chỉ có nút `<` và `>` để chuyển ảnh, không biết ảnh tiếp theo là gì.
- **Giải pháp**: Thêm một hàng ngang chứa các ảnh thu nhỏ (thumbnails) của nhóm hiện tại ở đáy màn hình.
- **Lợi ích**: Nhìn tổng quan được cả nhóm, click nhảy cóc đến ảnh bất kỳ, biết mình đang ở đâu trong nhóm.

### 🔍 1.4 Zoom & Pan 60fps (Bằng Cuộn Chuột)
- **Vấn đề hiện tại**: Nút zoom click chuột khá chậm và không trực quan.
- **Giải pháp**:
    - Dùng con lăn chuột (scroll wheel) để phóng to/thu nhỏ thẳng vào vị trí con trỏ chuột.
    - Dùng chuột trái giữ và kéo (drag) để di chuyển ảnh khi đang zoom.
    - Sử dụng thuộc tính CSS `transform: translate3d` để tận dụng GPU, đảm bảo mượt mà 60fps kể cả với ảnh 4K.

### ⏳ 1.5 Gọi API Theo Nhu Cầu (On-Demand API)
- **Vấn đề hiện tại**: Mở modal là tự động gọi API lấy gợi ý (tốn tiền và chậm).
- **Giải pháp**:
    - Khi mở modal, chỉ hiển thị ảnh và các công cụ chỉnh sửa thủ công.
    - Có nút "🤖 Hỏi AI gợi ý" nổi bật. Chỉ khi người dùng click vào, app mới gửi ảnh lên API.
    - Tiết kiệm token, giảm chi phí và mở modal nhanh tức thì.

---

## 2. Bản Đồ Tách File (Decomposition)

Để quản lý đống tính năng khổng lồ này, file `ImageModal.tsx` (873 dòng) sẽ được chặt nhỏ thành:

```text
ImageModal.tsx (Hệ khung & Quản lý State chính)
├── components/
│   ├── ImageViewer.tsx       ← Zoom, Pan, Split View (Ảnh chính)
│   ├── AIEditorPanel.tsx     ← Gợi ý AI & Các thanh trượt CSS
│   ├── GenerativePanel.tsx   ← Magic Fix & Tạo biến thể
│   ├── Filmstrip.tsx         ← Dải ảnh nhỏ ở đáy
│   └── ModalToolbar.tsx      ← Thanh công cụ trên cùng (Download, Close, Trash)
```

---

## 3. UI/UX Mockup Flow (Nền Tối)

```text
┌──────────────────────────────────────────────────────────────┐
│ [←] Ảnh 5 / 12  [ Icon Download ] [ Icon Trash ]      [ X ] │
├──────────────────────────────────────────────┬───────────────┤
│                                              │ 🤖 GỢI Ý AI   │
│                                              │ "Ảnh hơi tối, │
│                                              │ nên tăng sáng"│
│                   ẢNH CHÍNH                  │ [Áp dụng]     │
│             (Chiếm 75% màn hình)             ├───────────────┤
│                                              │ 🎚️ CHỈNH SỬA  │
│        [ ↔ Thanh kéo Split View ]            │ Sáng  ─●───  │
│                                              │ Nét    ──●──  │
│                                              ├───────────────┤
│                                              │ ✨ MAGIC FIX  │
│                                              │ [ Tạo ảnh ]  │
├──────────────────────────────────────────────┴───────────────┤
│ [ 🖼️ ] [ 🖼️ ] [ 🖼️ (Đang xem) ] [ 🖼️ ] [ 🖼️ ] [ 🖼️ ]      │
│ (Dải ảnh Filmstrip cạnh dưới)                                │
└──────────────────────────────────────────────────────────────┘
```
