# Tài Liệu Hệ Thống Hiện Tại - PhotoCull

Tài liệu này mô tả trạng thái hiện tại của dự án PhotoCull trước khi thực hiện việc tái cấu trúc hoặc xây dựng lại.

## 1. Tổng quan công nghệ
- **Framework**: React 19 (Vite)
- **Ngôn ngữ**: TypeScript
- **Quản lý trạng thái**: Hooks tùy chỉnh (Custom Hooks) và State cục bộ.
- **Tích hợp AI**: Sử dụng SDK `@google/genai` (Gemini API).
- **UI & Hiệu suất**: Sử dụng `react-virtuoso` để hiển thị danh sách ảnh lớn mượt mà.

## 2. Cấu trúc thư mục chính
- `/src` (hoặc thư mục gốc theo cấu trúc hiện tại):
  - `App.tsx`: File chính chứa phần lớn logic điều khiển và giao diện chính (khoảng 800 dòng code).
  - `components/`: Chứa các thành phần giao diện nhỏ hơn (Sidebar, Header, v.v.).
  - `hooks/`: Chứa các logic xử lý riêng biệt (ví dụ: `useImageGroups.ts`).
  - `services/`: Chứa các dịch vụ gọi API hoặc xử lý dữ liệu.

## 3. Các tính năng hiện có
- **Tải ảnh lên**: Hỗ trợ kéo thả hoặc chọn file ảnh.
- **Nhóm ảnh**: Tự động hoặc thủ công nhóm các ảnh lại để xử lý.
- **Phân tích AI**: Sử dụng Gemini để phân tích nội dung ảnh, gợi ý loại bỏ ảnh lỗi, mờ, hoặc trùng lặp.
- **Lọc và Sắp xếp**: Cho phép người dùng tìm kiếm và lọc ảnh theo trạng thái.

## 4. Hạn chế hiện tại (Lý do cần đập đi xây lại)
- **File App.tsx quá lớn**: Chứa cả logic xử lý dữ liệu và render UI, gây khó khăn cho việc bảo trì.
- **Quản lý State phức tạp**: Việc truyền state qua nhiều cấp (Prop Drilling) hoặc phụ thuộc vào hooks lồng nhau khiến code khó đọc.
- **Thiếu Unit Test**: Không có hệ thống test tự động để đảm bảo tính ổn định khi mở rộng.
