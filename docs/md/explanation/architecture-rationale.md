# Explanation: Lý Do Kiến Trúc

Hệ thống cũ bị mô tả là có `App.tsx` quá lớn, state phức tạp và thiếu test. Đây là dấu hiệu kiến trúc cần tách theo trách nhiệm.

## Vì sao feature-first

PhotoCull có các miền rõ: image grid, AI panel, culling view, compare view, storage. Tách theo feature giúp mỗi nhóm code chứa UI, selector và test liên quan.

## Vì sao dùng store tập trung

Các quyết định như selected image, rating, group và AI result được nhiều màn hình dùng chung. Store tập trung giúp tránh prop drilling và làm selector dễ test.

## Vì sao dùng AI adapter

Gemini là provider hiện tại, nhưng yêu cầu sản phẩm nhắc đến local AI và khả năng đổi provider. Adapter giữ UI ổn định khi SDK hoặc provider thay đổi.

## Vì sao ưu tiên local-first

Ảnh là dữ liệu riêng tư. Xử lý local-first giảm rủi ro bảo mật, giảm phụ thuộc mạng và tạo niềm tin cho người dùng chuyên nghiệp.
