# Kiến trúc Dự án - PhotoCull AI

## 1. Mục tiêu
Tái cấu trúc file `App.tsx` để dễ bảo trì và mở rộng.

## 2. Các component cần tách
- `Header`: Chứa logo và thông tin tổng quan.
- `Toolbar`: Thanh công cụ tìm kiếm và lọc.
- `MainView`: Vùng hiển thị danh sách ảnh.

## 3. State Management
- Sử dụng **Zustand** để quản lý state tập trung.
