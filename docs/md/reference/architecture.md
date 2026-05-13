# Reference: Kiến Trúc Mục Tiêu

Nguồn: `docs/NEW_ARCHITECTURE.md`.

## Nguyên tắc

- Tách UI, state, service, utility.
- Feature-first structure.
- Store tập trung nhưng chia theo domain.
- AI đi qua adapter.
- Dữ liệu người dùng ưu tiên xử lý local.

## Cấu trúc thư mục

```text
src/
  assets/
  components/
    common/
    layout/
  features/
    image-grid/
    ai-panel/
    culling-view/
    compare-view/
  hooks/
  services/
    ai/
    storage/
    image-processing/
  store/
  types/
  utils/
```

## Store

- `useImageStore`: danh sách ảnh, selection, rating, pick/reject, group.
- `useAIStore`: queue, tiến trình, kết quả, lỗi.
- `useUIStore`: modal, theme, layout, panel state.
- `useSessionStore`: trạng thái phiên nếu cần tách riêng.

## Service

- `AIService`: facade cho Gemini/local/mock provider.
- `StorageService`: lưu IndexedDB.
- `ImageProcessingService`: thumbnail, hash, metadata, similarity.
- `ExportService`: xuất danh sách ảnh giữ/loại.

## Luồng dữ liệu

1. UI nhận file.
2. Image service tạo image record và preview.
3. Image store lưu record.
4. Grid render qua selector và virtualization.
5. AI service phân tích ảnh theo queue.
6. AI store lưu kết quả.
7. Culling view dùng image + AI result để gợi ý.
8. Storage service lưu phiên.

## Ràng buộc

- `App.tsx` chỉ composition, routing/layout và provider.
- Component không gọi trực tiếp IndexedDB hoặc Gemini SDK.
- Không để binary ảnh lớn trong Zustand nếu gây memory pressure.
- URL object phải được revoke khi ảnh bị gỡ khỏi phiên.
