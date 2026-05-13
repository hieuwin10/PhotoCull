# How-To: Viết Kiểm Thử

Mục tiêu: tạo test thực dụng cho các phần rủi ro cao của PhotoCull.

## Phân loại test

- Unit: helper, selector, store action, scoring.
- Component: grid, toolbar, panel AI, compare view.
- Integration: import ảnh, lưu phiên, phân tích AI giả lập.
- E2E: luồng chọn lọc ảnh từ đầu đến cuối.

## Ưu tiên test

1. Logic chọn giữ/loại/đánh sao.
2. Store và selector lọc ảnh.
3. AI adapter khi thành công, lỗi, timeout.
4. IndexedDB save/load.
5. Keyboard shortcuts.
6. Virtualized grid không mất selection khi scroll.

## Mock cần có

- File ảnh giả.
- AI provider giả.
- IndexedDB giả hoặc test database.
- Timer giả cho debounce/batch.

## Tiêu chí chấp nhận

- Test không gọi API thật.
- Test không phụ thuộc thứ tự file ngoài ý muốn.
- Mỗi bug quan trọng có regression test.
- Build CI chạy được test headless.
