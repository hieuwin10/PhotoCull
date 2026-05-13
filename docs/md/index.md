# PhotoCull Documentation

Ngôn ngữ: Tiếng Việt.
Mục tiêu: tài liệu thuần chữ, ngắn gọn, dễ cho AI và lập trình viên dùng khi xây dựng lại PhotoCull.

## Trạng thái dự án

PhotoCull là ứng dụng chọn lọc ảnh cho nhiếp ảnh gia. Sản phẩm hướng tới xử lý hàng nghìn ảnh, nhóm ảnh tương tự, phân tích chất lượng bằng AI và hỗ trợ quyết định giữ hoặc loại ảnh nhanh.

Workspace hiện tại có:

- `README.md`: mô tả ngắn về PhotoCull AI.
- `metadata.json`: tên và mô tả ứng dụng.
- `docs/CURRENT_SYSTEM.md`: mô tả hệ thống cũ.
- `docs/NEW_SYSTEM_PRD.md`: yêu cầu sản phẩm thế hệ mới.
- `docs/NEW_ARCHITECTURE.md`: kiến trúc mục tiêu.
- `dist/`: bản build tĩnh hiện có.

Workspace hiện tại chưa có mã nguồn `src`, vì vậy tài liệu này dùng các tài liệu nền và artifact build làm nguồn sự thật hiện tại.

## Cấu trúc Diátaxis

| Nhánh | Mục đích | Khi dùng |
| --- | --- | --- |
| Tutorials | Học theo luồng từng bước | Người mới cần hiểu dự án và quy trình |
| How-To | Giải quyết tác vụ cụ thể | Dev cần làm một việc rõ ràng |
| Reference | Tra cứu thông tin chuẩn | AI/dev cần contract, cấu trúc, tiêu chí |
| Explanation | Hiểu lý do thiết kế | Reviewer/architect cần bối cảnh |

## Bản đồ tài liệu

### Tutorials

- `tutorials/project-onboarding.md`: làm quen dự án.
- `tutorials/rebuild-workflow.md`: luồng xây lại từ yêu cầu đến vận hành.

### How-To

- `how-to/add-feature.md`: thêm tính năng.
- `how-to/integrate-ai-provider.md`: tích hợp Gemini hoặc nhà cung cấp AI khác.
- `how-to/write-tests.md`: viết kiểm thử.
- `how-to/operate-build.md`: build, phát hành, vận hành.

### Reference

- `reference/requirements.md`: yêu cầu sản phẩm.
- `reference/architecture.md`: kiến trúc mục tiêu.
- `reference/implementation.md`: quy ước hiện thực.
- `reference/testing.md`: chiến lược kiểm thử.
- `reference/operations.md`: vận hành.
- `reference/data-model.md`: mô hình dữ liệu.

### Explanation

- `explanation/product-rationale.md`: lý do sản phẩm.
- `explanation/architecture-rationale.md`: lý do kiến trúc.
- `explanation/ai-and-privacy.md`: AI và quyền riêng tư.
- `explanation/development-lifecycle.md`: vòng đời phát triển phần mềm.

## Giai đoạn phát triển được bao phủ

- Yêu cầu: `reference/requirements.md`, `explanation/product-rationale.md`.
- Kiến trúc: `reference/architecture.md`, `explanation/architecture-rationale.md`.
- Hiện thực: `reference/implementation.md`, `how-to/add-feature.md`.
- Kiểm thử: `reference/testing.md`, `how-to/write-tests.md`.
- Vận hành: `reference/operations.md`, `how-to/operate-build.md`.

## Quy tắc mở rộng

- Thêm tài liệu theo đúng mục đích Diátaxis, không trộn tutorial với reference.
- Mỗi file phải có: mục tiêu, phạm vi, nguồn sự thật, đầu ra kỳ vọng.
- Tài liệu cho AI nên ưu tiên bullet rõ ràng, contract cụ thể, tránh văn phong marketing.
- Khi mã nguồn `src` được khôi phục, cập nhật các file `reference/*` trước, sau đó cập nhật `how-to/*`.
