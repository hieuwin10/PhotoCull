# Reference: Vận Hành

## Kiểu triển khai

PhotoCull phù hợp triển khai như ứng dụng web tĩnh từ `dist/`. Có thể mở rộng sang desktop wrapper sau khi kiến trúc ổn định.

## Artifact

- Source: `src/`.
- Build output: `dist/`.
- Static entry: `dist/index.html`.

## Biến môi trường

| Biến | Mục đích | Bắt buộc |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | Gọi Gemini cloud | Chỉ khi bật Gemini |
| `VITE_AI_PROVIDER` | Chọn provider | Không |
| `VITE_APP_VERSION` | Gắn version | Không |

## Bảo mật

- Không commit API key.
- Không gửi ảnh lên cloud mặc định.
- Không log tên file đầy đủ nếu có thể chứa thông tin cá nhân.
- Cần thông báo rõ khi bật AI cloud.

## Khả năng phục hồi

- Lỗi AI không được làm mất phiên.
- Lỗi IndexedDB phải có thông báo và fallback.
- Khi reload, app nên khôi phục phiên gần nhất nếu người dùng cho phép.
