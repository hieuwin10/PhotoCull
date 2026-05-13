# Reference: Yêu Cầu Sản Phẩm

Nguồn: `docs/NEW_SYSTEM_PRD.md`, `docs/CURRENT_SYSTEM.md`, `metadata.json`.

## Tầm nhìn

PhotoCull giúp nhiếp ảnh gia chọn lọc ảnh nhanh hơn bằng AI, nhóm ảnh tương tự, giao diện so sánh và phím tắt.

## Người dùng

- Nhiếp ảnh gia sự kiện hoặc đám cưới.
- Người dùng cá nhân có thư viện ảnh lớn.
- Editor cần loại ảnh lỗi trước khi hậu kỳ.

## Tính năng MVP

| ID | Tính năng | Bắt buộc |
| --- | --- | --- |
| REQ-001 | Nhập nhiều ảnh từ máy người dùng | Có |
| REQ-002 | Hiển thị hàng nghìn ảnh bằng virtualization | Có |
| REQ-003 | Chọn ảnh, giữ ảnh, loại ảnh, đánh sao | Có |
| REQ-004 | Nhóm ảnh tương tự để so sánh | Có |
| REQ-005 | AI phân tích nội dung, độ nét, biểu cảm | Có |
| REQ-006 | Prompt tùy chỉnh cho tiêu chí lọc | Nên có |
| REQ-007 | Lưu phiên làm việc bằng IndexedDB | Có |
| REQ-008 | Chế độ so sánh nhiều ảnh | Có |
| REQ-009 | Phím tắt duyệt nhanh | Có |

## Yêu cầu phi chức năng

- UI phản hồi thao tác chính dưới 100 ms trong phiên bình thường.
- Ảnh không tự động rời thiết bị nếu người dùng chưa chọn AI cloud.
- App xử lý được bộ ảnh lớn bằng lazy loading và virtualization.
- Kiến trúc phải dễ thay nhà cung cấp AI.
- Test tự động phải có trước khi mở rộng lớn.

## Ngoài phạm vi MVP

- Đồng bộ cloud nhiều thiết bị.
- Chỉnh sửa ảnh chuyên sâu.
- Quản lý album thay thế Lightroom.
- Nhận diện khuôn mặt định danh cá nhân nếu chưa có chính sách riêng tư rõ.
