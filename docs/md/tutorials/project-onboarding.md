# Tutorial: Làm Quen Dự Án PhotoCull

Mục tiêu: giúp người mới hiểu PhotoCull đủ để bắt đầu đọc tài liệu và tham gia phát triển.

## 1. Hiểu sản phẩm

PhotoCull là công cụ chọn lọc ảnh cho các bộ ảnh lớn. Người dùng chính là nhiếp ảnh gia sự kiện, đám cưới hoặc người dùng cá nhân cần dọn thư viện ảnh.

Luồng giá trị chính:

1. Người dùng nhập nhiều ảnh.
2. Ứng dụng hiển thị ảnh mượt với virtualization.
3. Hệ thống nhóm ảnh tương tự.
4. AI phân tích ảnh theo độ nét, nội dung, biểu cảm, lỗi thường gặp.
5. Người dùng so sánh, đánh sao, giữ hoặc loại ảnh.
6. Trạng thái phiên làm việc được lưu để tiếp tục sau.

## 2. Nhận diện trạng thái repo

Các file quan trọng:

- `docs/CURRENT_SYSTEM.md`: mô tả vấn đề hệ thống cũ.
- `docs/NEW_SYSTEM_PRD.md`: mục tiêu sản phẩm mới.
- `docs/NEW_ARCHITECTURE.md`: hướng kiến trúc.
- `dist/index.html`: artifact build tĩnh.

Chưa thấy mã nguồn `src` trong workspace hiện tại. Khi khôi phục source, ưu tiên kiểm tra `App.tsx`, `components`, `hooks`, `services`, `store`, `types`.

## 3. Đọc tài liệu theo thứ tự

1. Đọc `docs/md/index.md`.
2. Đọc `docs/md/reference/requirements.md`.
3. Đọc `docs/md/reference/architecture.md`.
4. Đọc `docs/md/how-to/add-feature.md`.
5. Đọc `docs/md/reference/testing.md`.
6. Đọc `docs/md/reference/operations.md`.

## 4. Chuẩn bị môi trường khi có source

Kỳ vọng stack mục tiêu:

- React 19.
- Vite.
- TypeScript.
- Zustand.
- `@google/genai` hoặc adapter AI tương thích.
- `react-virtuoso`.
- IndexedDB cho lưu phiên.
- Vitest và Testing Library cho kiểm thử.

## 5. Hoàn thành onboarding

Bạn đã sẵn sàng khi có thể trả lời:

- PhotoCull giải quyết vấn đề gì?
- Vì sao cần tách UI, state, service và AI adapter?
- Dữ liệu ảnh cần các trạng thái nào?
- Tác vụ nào cần test unit, integration, E2E?
- Ảnh người dùng được xử lý local hay gửi AI khi nào?
