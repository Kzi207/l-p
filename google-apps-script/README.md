# Google Sheets database cho Love Days

1. Tạo một Google Sheet trống và sao chép ID nằm giữa `/d/` và `/edit` trên URL.
2. Mở **Extensions → Apps Script**, dán toàn bộ `Code.gs` vào project.
   - Trong **Project Settings**, bật hiển thị file manifest rồi dán `appsscript.json` của thư mục này. Manifest đặt quyền Web App là `ANYONE_ANONYMOUS` và chạy bằng tài khoản deploy.
3. Mở **Project Settings → Script Properties**, thêm:
   - `SPREADSHEET_ID`: ID Google Sheet.
   - `FIREBASE_API_KEY`: cùng giá trị với `NEXT_PUBLIC_FIREBASE_API_KEY` của web.
   - `SERVER_SECRET`: chuỗi bí mật dài ngẫu nhiên, tối thiểu 32 ký tự.
4. Chọn **Deploy → New deployment → Web app**:
   - Execute as: **Me**.
   - Who has access: **Anyone** (không phải **Anyone with Google account**).
5. Copy URL kết thúc bằng `/exec`, đặt vào môi trường web:

   `NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec`

   Trên Render/Vercel thêm tiếp `SERVER_SECRET`; giá trị phải giống hệt Script Property `SERVER_SECRET`. Cả client và server chỉ dùng một URL `NEXT_PUBLIC_APPS_SCRIPT_URL`.

6. Deploy lại web. Sheet `Records` sẽ được tạo tự động ở request đầu tiên.

## Chuyển dữ liệu Firestore hiện có

Sau khi đã cấu hình `FIREBASE_ADMIN_SA_BASE64` (hoặc file local `serviceAccountKey.json`), `NEXT_PUBLIC_APPS_SCRIPT_URL` và `SERVER_SECRET`, chạy một lần:

`npm run migrate:firestore-to-sheets`

Script chỉ sao chép/ghi đè cùng document path, không xóa dữ liệu Firestore cũ. Hãy giữ Firestore làm bản dự phòng cho đến khi kiểm tra đủ dữ liệu trên Sheet.

Mỗi request đều gửi Firebase ID token. Apps Script xác minh token bằng Firebase Auth REST API và chỉ cho hai UID trong cùng `couple` đọc dữ liệu của nhau.
