# Product Requirements Document (PRD) - PhotoCull Thế Hệ Mới

Tài liệu này mô tả yêu cầu cho phiên bản xây dựng lại của PhotoCull, nhằm khắc phục các hạn chế của phiên bản cũ và bổ sung các tính năng mạnh mẽ hơn.

## 1. Tầm nhìn & Mục tiêu
PhotoCull hướng tới trở thành công cụ tối ưu cho các nhiếp ảnh gia để nhanh chóng phân loại, chọn lọc (cull) và đánh giá hàng ngàn bức ảnh bằng cách tận dụng sức mạnh của AI cục bộ và đám mây.

## 2. Đối tượng người dùng
- **Nhiếp ảnh gia sự kiện/đám cưới**: Cần xử lý hàng ngàn file ảnh trong thời gian ngắn nhất.
- **Người dùng đam mê**: Muốn dọn dẹp thư viện ảnh cá nhân, loại bỏ ảnh mờ, xấu.

## 3. Các tính năng cốt lõi (Core Features)
### 3.1. Quản lý Ảnh Hiệu Suất Cao
- Hỗ trợ tải và hiển thị mượt mà hàng ngàn ảnh (Lazy loading / Virtualization).
- Lưu trạng thái làm việc (IndexedDB) để không bị mất dữ liệu khi reload trang.

### 3.2. Trợ Lý AI (Gemini / Local AI)
- **Tự động gắn thẻ (Auto-tagging)**: Nhận diện chủ thể, cảm xúc, độ nét.
- **Gợi ý loại bỏ (Culling suggestions)**: Phát hiện ảnh nhắm mắt, out nét, hoặc biểu cảm không đẹp.
- **Tùy chỉnh Prompt**: Cho phép người dùng tự viết prompt để AI lọc ảnh theo ý muốn (ví dụ: "Tìm ảnh có nụ cười đẹp nhất").

### 3.3. Giao Diện So Sánh & Chọn Lọc
- Chế độ xem so sánh (Side-by-side) 2 hoặc nhiều ảnh cùng lúc.
- Phím tắt (Keyboard shortcuts) để duyệt và đánh giá nhanh (Phím 1-5 để đánh sao, P để giữ, X để loại).

## 4. Yêu cầu phi chức năng (Non-functional Requirements)
- **Tốc độ**: Thời gian phản hồi giao diện < 100ms.
- **Bảo mật**: Ảnh của người dùng không được tự động tải lên server ngoài ý muốn (ưu tiên xử lý local nếu có thể).
