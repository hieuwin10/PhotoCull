# How-To: Thêm Tính Năng Mới

Mục tiêu: hướng dẫn thêm tính năng mà không làm phình `App.tsx` hoặc phá kiến trúc module.

## Quy trình

1. Xác định tính năng thuộc domain nào: image, AI, culling, storage, UI.
2. Cập nhật yêu cầu trong `reference/requirements.md` nếu thay đổi hành vi sản phẩm.
3. Thêm hoặc cập nhật type trong `src/types`.
4. Thêm logic trạng thái vào store phù hợp.
5. Thêm service nếu cần IO, AI, IndexedDB hoặc xử lý file.
6. Tạo component trong `src/features/<feature-name>`.
7. Viết test trước hoặc cùng lúc với code.
8. Cập nhật how-to/reference nếu có contract mới.

## Quy ước module

Ví dụ tính năng `compare-view`:

```text
src/features/compare-view/
  CompareView.tsx
  CompareToolbar.tsx
  compareSelectors.ts
  compareView.test.tsx
  index.ts
```

## Tiêu chí hoàn thành

- Tính năng có tiêu chí chấp nhận rõ.
- Không thêm logic nghiệp vụ lớn vào `App.tsx`.
- Store không chứa object không serialize được trừ khi có lý do rõ.
- Test bao phủ trạng thái chính và lỗi chính.
- Tài liệu reference được cập nhật khi API nội bộ đổi.
