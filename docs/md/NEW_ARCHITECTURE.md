# Kiến Trúc Hệ Thống Mục Tiêu - PhotoCull

Tài liệu này đề xuất kiến trúc mới cho dự án PhotoCull nhằm đảm bảo tính dễ mở rộng, dễ bảo trì và hiệu suất cao.

## 1. Nguyên tắc thiết kế (Design Principles)
- **Separation of Concerns (SoC)**: Chia nhỏ hệ thống thành các lớp riêng biệt (UI, Logic, Service).
- **Component-Based**: Mỗi component chỉ làm một việc duy nhất.
- **Centralized State**: Quản lý trạng thái tập trung thay vì truyền prop lồng nhau.

## 2. Cấu trúc thư mục đề xuất (Proposed Folder Structure)
```text
/src
  /assets          # Hình ảnh, font, css toàn cục
  /components      # Các component UI dùng chung (Button, Modal,...)
    /common
    /layout
  /features        # Chia theo tính năng (Module-based)
    /image-grid
    /ai-panel
    /culling-view
  /hooks           # Custom hooks toàn cục
  /services        # Gọi API (Gemini, Local API,...)
  /store           # Quản lý state tập trung (Zustand)
  /types           # Định nghĩa TypeScript types
  /utils           # Hàm helper dùng chung
```

## 3. Quản lý trạng thái (State Management)
- Sử dụng **Zustand** để tạo các store riêng biệt cho từng mảng dữ liệu:
  - `useImageStore`: Quản lý danh sách ảnh, trạng thái chọn, lọc.
  - `useAIStore`: Quản lý tiến trình phân tích của AI, kết quả trả về.
  - `useUIStore`: Quản lý trạng thái giao diện (modal, loading, theme).

## 4. Tích hợp AI
- Tạo một lớp `AIService` riêng biệt để bọc (wrap) SDK của Gemini. Điều này giúp dễ dàng chuyển đổi sang nhà cung cấp AI khác (như OpenAI hoặc Ollama chạy local) mà không cần sửa code ở phần UI.

## 5. Tối ưu hiệu suất
- Tiếp tục sử dụng `react-virtuoso` cho danh sách ảnh.
- Sử dụng `useMemo` và `useCallback` để tránh re-render không cần thiết trong các component danh sách.
