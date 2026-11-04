# Đăng nhập bằng tài khoản Locket

Ứng dụng dùng package npm `locket.js` của https://github.com/hmkk69/locket.js.
Backend tạo một `LocketClient({ sessionPath: null, autoEmulate: true })` riêng cho
mỗi lần đăng nhập và gọi `client.login(email, password)`. Phiên không được ghi
vào file dùng chung giữa các tài khoản.

## Cấu hình

1. Chạy `npm install`.
2. Cấu hình các biến `NEXT_PUBLIC_FIREBASE_*` và `DATABASE_URL` theo `.env.local.example`.
3. Cấu hình `FIREBASE_ADMIN_SA_BASE64` bằng base64 của toàn bộ JSON Service Account
   thuộc cùng Firebase project với web app. Khi chạy local có thể đặt file
   `serviceAccountKey.json` ở thư mục gốc thay thế. Không commit khóa này.
4. Khởi động lại server bằng `npm run dev`.
5. Chọn **Tài khoản Locket**, nhập email và mật khẩu Locket rồi đăng nhập.

Sau khi Locket xác thực thành công, backend lưu liên kết vào Neon với UID
`locket_<Locket UID>` và tạo Firebase custom token cho UID đó. Trình duyệt dùng
`signInWithCustomToken` để mở phiên của website. Vì ứng dụng hiện dùng Firebase
Authentication, cấu hình Firebase Admin vẫn cần thiết cho bước này.

Kiểm tra code bằng `npm run typecheck` và `node --test scripts/test-locket-auth.cjs`.
Các test dùng mock, không đăng nhập tài khoản Locket thực tế.
