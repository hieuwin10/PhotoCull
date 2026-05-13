# Reference: Quy Ước Hiện Thực

## Stack mục tiêu

- React 19.
- Vite.
- TypeScript.
- Zustand.
- React Virtuoso.
- Gemini SDK qua adapter.
- IndexedDB.
- Vitest, Testing Library, Playwright nếu có E2E.

## TypeScript

- Type domain đặt trong `src/types`.
- Không dùng `any` cho dữ liệu ảnh, AI result, store state.
- Service trả lỗi có kiểu rõ hoặc dùng result object.

## Component

- Component UI nhận props đã chuẩn hóa.
- Component feature được phép đọc store qua selector.
- Component common không chứa logic domain PhotoCull.

## State

- Store action phải nhỏ và có tên theo nghiệp vụ.
- Selector dùng để tránh re-render thừa.
- Không lưu API response thô nếu không cần.

## Performance

- Dùng virtualization cho danh sách lớn.
- Dùng thumbnail thay ảnh gốc trong grid.
- Batch AI request.
- Debounce filter/search.
- Revoke object URL khi không dùng.

## Accessibility

- Phím tắt không chặn nhập liệu trong input/textarea.
- Nút icon phải có `aria-label`.
- Trạng thái selected/rejected/rating phải có text thay thế.
