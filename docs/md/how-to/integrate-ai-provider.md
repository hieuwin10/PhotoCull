# How-To: Tích Hợp Nhà Cung Cấp AI

Mục tiêu: tích hợp Gemini hoặc AI local mà không khóa UI vào một SDK cụ thể.

## Nguyên tắc

- UI không gọi trực tiếp SDK AI.
- Mọi nhà cung cấp đi qua `AIService`.
- Dữ liệu gửi ra ngoài phải minh bạch với người dùng.
- Prompt, model, quota, lỗi mạng phải có trạng thái rõ.

## Interface đề xuất

```ts
export interface AIProvider {
  analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageResult>;
  analyzeGroup(input: AnalyzeGroupInput): Promise<AnalyzeGroupResult>;
}
```

## Các bước

1. Tạo `src/services/ai/types.ts`.
2. Tạo `src/services/ai/AIService.ts`.
3. Tạo adapter `GeminiProvider`.
4. Thêm cấu hình API key qua biến môi trường.
5. Thêm giới hạn batch và retry có backoff.
6. Ghi kết quả vào `useAIStore`.
7. Hiển thị trạng thái: idle, queued, running, failed, completed.
8. Viết test bằng mock provider.

## Lưu ý quyền riêng tư

- Không tự động upload ảnh nếu người dùng chưa bật phân tích cloud AI.
- Nên resize hoặc tạo preview trước khi gửi AI.
- Không lưu API key vào source hoặc localStorage nếu không cần.
- Cho phép xóa kết quả phân tích AI khỏi phiên.
