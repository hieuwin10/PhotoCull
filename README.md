# PhotoCull AI

PhotoCull là công cụ hỗ trợ nhiếp ảnh gia phân loại, so sánh và chọn lọc ảnh nhanh bằng AI. Dự án đang trong giai đoạn tái cấu trúc để xây lại theo kiến trúc dễ mở rộng, local-first và có kiểm thử rõ ràng.

## Tính năng mục tiêu

- Nhập và hiển thị mượt hàng nghìn ảnh bằng virtualization.
- Nhóm ảnh tương tự để so sánh nhanh.
- Phân tích ảnh bằng AI qua adapter, ưu tiên quyền riêng tư.
- Đánh sao, giữ, loại ảnh bằng UI và phím tắt.
- Lưu phiên làm việc bằng IndexedDB.

## Stack mục tiêu

- React 19 + Vite.
- TypeScript.
- Zustand.
- Gemini AI SDK qua `AIService`.
- React Virtuoso.
- IndexedDB.
- Vitest, Testing Library, Playwright nếu có E2E.

## Tài liệu

Bộ tài liệu mới nằm trong:

- `docs/md/`: Markdown thuần chữ, tối ưu cho AI và lập trình viên.
- `docs/html/`: HTML/CSS tiếng Việt với giao diện trực quan.

Điểm bắt đầu:

- Markdown: `docs/md/index.md`.
- HTML: `docs/html/index.html`.

Tài liệu được tổ chức theo Diátaxis:

- Tutorials: học theo luồng từng bước.
- How-To: hướng dẫn làm tác vụ cụ thể.
- Reference: tra cứu yêu cầu, kiến trúc, test, vận hành, dữ liệu.
- Explanation: giải thích lý do sản phẩm và kiến trúc.
