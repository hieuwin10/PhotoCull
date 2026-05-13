# Tutorial: Luồng Xây Lại PhotoCull

Mục tiêu: mô tả một quy trình tuần tự để xây lại PhotoCull từ tài liệu hiện có.

## 1. Chốt yêu cầu

Đầu vào:

- `docs/md/reference/requirements.md`.
- phản hồi người dùng thật.
- ràng buộc quyền riêng tư và hiệu năng.

Đầu ra:

- danh sách tính năng MVP.
- tiêu chí chấp nhận.
- rủi ro kỹ thuật.

MVP đề xuất:

- import ảnh.
- hiển thị grid ảo hóa.
- chọn, giữ, loại, đánh sao.
- nhóm ảnh tương tự ở mức cơ bản.
- AI phân tích ảnh qua adapter.
- lưu phiên bằng IndexedDB.

## 2. Thiết kế kiến trúc

Tách hệ thống thành các lớp:

- UI: component hiển thị và nhận input.
- Feature modules: image-grid, culling-view, ai-panel.
- Store: Zustand stores cho ảnh, AI, UI.
- Services: AI, storage, image processing.
- Types: contract TypeScript dùng chung.

Không đặt logic nghiệp vụ lớn trong `App.tsx`.

## 3. Hiện thực theo lát dọc

Thứ tự khuyến nghị:

1. Tạo skeleton Vite React TypeScript.
2. Định nghĩa `types`.
3. Tạo `useImageStore`.
4. Hiện thực import ảnh và thumbnail URL.
5. Thêm grid ảo hóa.
6. Thêm rating, pick, reject.
7. Thêm IndexedDB session.
8. Thêm `AIService` và Gemini adapter.
9. Thêm màn so sánh.
10. Thêm keyboard shortcuts.

## 4. Kiểm thử liên tục

Mỗi lát dọc cần:

- unit test cho helper và store.
- component test cho UI chính.
- integration test cho import, chọn lọc, lưu phiên.
- smoke E2E cho luồng người dùng chính.

## 5. Vận hành

Trước khi phát hành:

- build production không lỗi.
- bundle size được theo dõi.
- không log dữ liệu ảnh nhạy cảm.
- biến môi trường AI không bị commit.
- tài liệu `docs/md/reference/operations.md` được cập nhật.
