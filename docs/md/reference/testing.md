# Reference: Chiến Lược Kiểm Thử

## Mục tiêu

Giảm rủi ro khi xử lý bộ ảnh lớn, AI bất định, lưu phiên local và thao tác phím tắt.

## Ma trận kiểm thử

| Khu vực | Loại test | Ví dụ |
| --- | --- | --- |
| Store ảnh | Unit | pick, reject, rating, selection |
| Grid | Component | render list ảo hóa, giữ selection |
| AI service | Unit/integration | success, timeout, quota error |
| Storage | Integration | save/load/delete session |
| Keyboard | Component/E2E | phím 1-5, P, X |
| Luồng chính | E2E | import, phân tích mock, chọn ảnh, export |

## Test data

- Ảnh nhỏ cố định cho test import.
- Mock metadata.
- Mock AI response có confidence và reason.
- Session fixture cho IndexedDB.

## Không làm trong test

- Không gọi Gemini thật.
- Không phụ thuộc mạng.
- Không snapshot UI lớn khi component thay đổi thường xuyên.
- Không dùng ảnh dung lượng lớn trong repo test.

## Definition of Done

- Tính năng mới có test cho đường thành công và lỗi chính.
- Bug đã sửa có regression test.
- `npm run test` và `npm run build` pass trước release.
