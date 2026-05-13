# Explanation: AI Và Quyền Riêng Tư

AI giúp PhotoCull nhận diện ảnh mờ, ảnh nhắm mắt, biểu cảm kém, chủ thể chính và các tiêu chí theo prompt. Tuy nhiên ảnh cá nhân và ảnh sự kiện có thể chứa dữ liệu nhạy cảm.

## Nguyên tắc

- Mặc định không upload ảnh.
- Cloud AI phải là lựa chọn rõ ràng của người dùng.
- Người dùng cần biết provider nào xử lý ảnh.
- App nên gửi bản resize/preview nếu đủ cho phân tích.
- Kết quả AI phải xóa được khỏi phiên.

## Thiết kế phù hợp

`AIService` nhận ảnh từ UI qua queue, áp dụng giới hạn batch, gọi provider, rồi lưu kết quả phân tích. Provider có thể là Gemini, local model hoặc mock trong test.

Thiết kế này cho phép:

- đổi provider mà không sửa UI.
- test không cần mạng.
- áp dụng chính sách quyền riêng tư ở một điểm tập trung.
