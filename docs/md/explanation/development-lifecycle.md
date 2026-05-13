# Explanation: Vòng Đời Phát Triển

PhotoCull nên được phát triển theo các giai đoạn rõ để tránh lặp lại vấn đề của hệ thống cũ.

## Yêu cầu

Mục tiêu là chốt luồng người dùng, tiêu chí chấp nhận và ràng buộc quyền riêng tư. Tài liệu chính: `reference/requirements.md`.

## Kiến trúc

Mục tiêu là tách module, xác định store, service và contract dữ liệu. Tài liệu chính: `reference/architecture.md`.

## Hiện thực

Mục tiêu là xây theo lát dọc nhỏ, mỗi lát có UI, state, service và test cần thiết. Tài liệu chính: `how-to/add-feature.md`.

## Kiểm thử

Mục tiêu là bảo vệ các hành vi rủi ro: chọn lọc, AI, IndexedDB, phím tắt, grid lớn. Tài liệu chính: `reference/testing.md`.

## Vận hành

Mục tiêu là build ổn định, bảo vệ API key, kiểm soát upload ảnh và phát hành artifact tĩnh. Tài liệu chính: `reference/operations.md`.
