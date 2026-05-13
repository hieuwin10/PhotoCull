# How-To: Build Và Vận Hành

Mục tiêu: vận hành PhotoCull như một ứng dụng web tĩnh hoặc desktop/web wrapper trong tương lai.

## Build

Khi source được khôi phục, quy trình kỳ vọng:

```bash
npm install
npm run test
npm run build
```

Artifact production nằm trong `dist/`.

## Cấu hình

Biến môi trường dự kiến:

- `VITE_GEMINI_API_KEY`: API key nếu dùng Gemini cloud.
- `VITE_AI_PROVIDER`: `gemini`, `local`, hoặc `mock`.
- `VITE_APP_VERSION`: phiên bản hiển thị trong UI.

## Checklist trước phát hành

- Không commit `.env`.
- Không log API key hoặc metadata ảnh nhạy cảm.
- Không upload ảnh nếu người dùng chưa bật phân tích cloud.
- `dist/index.html` mở được.
- Kiểm thử smoke pass.
- Tài liệu vận hành cập nhật.

## Giám sát thủ công

Vì ứng dụng ưu tiên chạy local, telemetry phải opt-in. Các chỉ số có thể theo dõi nếu người dùng đồng ý:

- số ảnh mỗi phiên.
- thời gian render grid.
- thời gian phân tích AI.
- tỷ lệ lỗi AI.
- thời gian lưu và khôi phục phiên.
