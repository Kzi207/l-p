# Love Days — Giai đoạn 1

Web app mobile-first dành cho hai người: đăng nhập riêng tư, đếm ngày yêu theo thời gian thực, hiển thị một ảnh chung mới nhất có thể thay đổi bất cứ lúc nào và lưu các khoảnh khắc Locket. Ảnh được nén còn tối đa khoảng 1 MB trước khi tải lên Cloudinary; metadata, caption và reaction được lưu trong Firestore.

## Tính năng đã có

- Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion.
- PWA bằng `next-pwa`, có manifest và service worker production.
- Firebase Authentication bằng Google, không có đăng ký email/mật khẩu.
- Mọi tài khoản Google đã xác thực đều có thể sử dụng app theo cấu hình hiện tại.
- Bộ đếm ngày/giờ/phút/giây realtime với flip animation và cột mốc 100 ngày/năm gần nhất.
- Ảnh Locket mới nhất dạng tròn, nền blur, caption tối đa 100 ký tự và một emoji reaction.
- Chọn ảnh từ thư viện hoặc mở camera sau trên mobile, nén client-side và upload unsigned lên Cloudinary.
- Ảnh chung trên trang chủ có thể được một trong hai người thay đổi bất cứ lúc nào.
- Nút camera Locket nằm giữa thanh điều hướng để mở nhanh khu ảnh, reaction, reply và chat realtime.
- Đăng ký FCM token trên trình duyệt và Next.js API Routes trên Render gửi thông báo cho người còn lại, không cần Firebase Blaze.

## 1. Chạy project lần đầu

Yêu cầu: Node.js 20 hoặc mới hơn và npm.

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Khi chưa điền biến môi trường, app sẽ hiện màn hình hướng dẫn cấu hình thay vì crash.

> PWA service worker được tắt ở môi trường development để tránh cache code cũ. Test PWA bằng `npm run build && npm run start` hoặc trên URL Render HTTPS.

## 2. Setup Firebase từ đầu

### 2.1 Tạo project và Web App

1. Vào [Firebase Console](https://console.firebase.google.com), chọn **Add project** và đặt tên tùy ý.
2. Trong **Project settings → General → Your apps**, chọn biểu tượng Web `</>`.
3. Đăng ký app; không cần bật Firebase Hosting vì frontend sẽ ở Render.
4. Sao chép từng giá trị trong `firebaseConfig` vào `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Các biến `NEXT_PUBLIC_*` của Firebase Web config không phải secret. Quyền truy cập dữ liệu được bảo vệ bằng Auth và `firestore.rules`.

### 2.2 Bật đăng nhập Google

1. Vào **Build → Authentication → Get started → Sign-in method**.
2. Chọn **Google → Enable**, chọn email hỗ trợ của project rồi lưu.
3. Mỗi người bấm **Tiếp tục với Google** trên app để đăng nhập.
4. Các tài khoản đã đăng nhập có thể xem trong **Authentication → Users**.

Google Authentication cho phép mọi tài khoản Google xác thực danh tính. Firestore Rules hiện cho phép mọi tài khoản đã xác thực đọc/ghi dữ liệu; không còn bước duyệt UID thủ công.

### 2.3 Tạo Firestore

1. Vào **Build → Firestore Database → Create database**.
2. Chọn region gần hai bạn để giảm độ trễ khi đọc và ghi dữ liệu.
3. Cài Firebase CLI và deploy rules từ thư mục gốc:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules
```

Sau lần đăng nhập đầu tiên, app sẽ hỏi tên hai người và ngày bắt đầu yêu, rồi tạo duy nhất document `couple/info`. Không có tên, ảnh hay ngày cá nhân nào bị hardcode trong source.

### 2.4 Tạo Web Push key cho FCM

1. Vào **Project settings → Cloud Messaging**.
2. Ở **Web Push certificates**, chọn **Generate key pair**.
3. Sao chép key vào:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Sau khi deploy trên HTTPS, mỗi người đăng nhập trên thiết bị của mình và bấm biểu tượng chuông ở góc trên. Token sẽ được lưu trong `users/{uid}.fcmTokens`.

## 3. Setup Cloudinary unsigned upload

1. Tạo tài khoản tại [Cloudinary](https://cloudinary.com) và mở Console.
2. Sao chép **Cloud name** vào `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. Vào **Settings → Upload → Upload presets → Add upload preset**.
4. Chọn **Signing mode: Unsigned** và đặt tên preset, ví dụ `love_days_unsigned`.
5. Khuyến nghị cấu hình preset: cho phép `jpg,jpeg,png,webp,heic,mp4,mov,webm`, giới hạn kích thước phù hợp và tắt các tùy chọn không dùng. Album kỷ niệm dùng folder `love-days/media-memories`.
6. Sao chép tên preset vào `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

Unsigned preset và cloud name là dữ liệu phía client, không đặt API secret Cloudinary trong `.env.local`. Client nén ảnh về tối đa khoảng 1 MB trước khi upload.

## 4. Web Push bằng Next.js API Routes trên Render

Bốn route `/api/notify/photo`, `/api/notify/locket`, `/api/notify/memory` và `/api/notify/chat` thay cho Firestore trigger cũ. Client gọi route sau khi ghi Firestore thành công. Server xác thực Firebase ID token, UID, cặp đôi và document vừa tạo trước khi gửi FCM cho người còn lại.

### 4.1 Lấy và encode Firebase Service Account

1. Vào **Firebase Console → Project settings → Service accounts**.
2. Chọn **Generate new private key** để tải file JSON. Admin SDK chạy trên Render không phải Cloud Functions nên không yêu cầu Firebase Blaze.
3. Không đặt JSON trong `public/` và không commit lên Git. `.gitignore` đã chặn các tên `service-account*.json` và `firebase-admin-key*.json`.
4. Encode toàn bộ file JSON thành một chuỗi base64, tránh lỗi xuống dòng của `private_key` trên Render.

macOS/Linux:

```bash
base64 -i serviceAccountKey.json | tr -d '\n' > encoded.txt
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json")) | Set-Clipboard
```

Copy toàn bộ chuỗi base64 vào biến `FIREBASE_ADMIN_SA_BASE64`. Sau khi cấu hình xong, xóa file JSON và `encoded.txt` khỏi máy nếu không còn cần dùng.

### 4.2 Retry, timeout và độ tin cậy

Request notify chạy nền, timeout sau 65 giây, thử lại thêm 2 lần cách nhau 2 giây. Nếu vẫn lỗi, request được giữ trong `localStorage` và tự gửi lại khi app mở hoặc có mạng trở lại. Delivery receipt phía server ngăn retry tạo thông báo trùng.

Render Free có thể ngủ khi không có traffic, vì vậy request đầu tiên đôi lúc phản hồi chậm. Cloud Functions đáng tin cậy hơn vì trigger không phụ thuộc client hoặc trạng thái server; cách Render đã giảm rủi ro bằng timeout dài, retry, hàng đợi và bước đánh thức cron nhưng vẫn có xác suất nhỏ thông báo đến trễ hoặc bị bỏ lỡ nếu app bị đóng quá sớm.

Thư mục `functions/` chỉ còn để tham khảo và `firebase.json` không còn deploy Functions. Nếu Functions cũ từng được deploy, xóa một lần để tránh thông báo trùng:

```bash
npx firebase-tools functions:delete notifyPartnerAboutPhoto notifyPartnerAboutMessage notifyPartnerAboutLocket notifyPartnerAboutMemory --region asia-southeast1
```

### 4.3 Cron thư tới ngày mở

Workflow `.github/workflows/timecapsule-cron.yml` chạy lúc **01:00 UTC / 08:00 Việt Nam**. Workflow gọi `/api/health` để đánh thức Render, chờ 50 giây rồi mới gọi `/api/notify/timecapsule-check` với retry.

Trong GitHub repository → **Settings → Secrets and variables → Actions**, tạo:

- `RENDER_APP_URL`: URL không có dấu `/` cuối, ví dụ `https://love-days.onrender.com`.
- `CRON_SECRET`: chuỗi dài, ngẫu nhiên và giống hệt biến `CRON_SECRET` trên Render.

Vào **Actions → Kiểm tra thư tới ngày mở → Run workflow** để chạy thử thủ công bằng `workflow_dispatch`. Deploy index trước khi dùng cron:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

### 4.4 Giữ Render thức bằng UptimeRobot (tùy chọn)

1. Tạo tài khoản UptimeRobot và chọn **Add New Monitor**.
2. Chọn monitor HTTP(S), đặt URL là `https://<service>.onrender.com/api/health`.
3. Chọn khoảng kiểm tra khoảng 10 phút nếu gói hiện tại cho phép, rồi lưu monitor.
4. Kiểm tra lịch sử để chắc chắn route trả HTTP 200 và `{ "status": "ok" }`.

Cách này giảm cold start nhưng phụ thuộc chính sách gói miễn phí của Render và UptimeRobot; nếu dịch vụ vẫn ngủ, timeout và hàng đợi client vẫn là lớp dự phòng.

## 5. Deploy Next.js lên Render

`next.config.mjs` đang dùng SSR mặc định và không có `output: "export"`, vì vậy sáu API Routes hoạt động bình thường.

1. Đẩy repository lên GitHub và vào Render Dashboard → **New → Web Service**.
2. Kết nối repository, chọn **Environment: Node** và gói **Free**.
3. Đặt **Build Command**: `npm install && npm run build`.
4. Đặt **Start Command**: `npm run start`. Script đã dùng `next start -p $PORT` để lắng nghe đúng cổng Render cấp.
5. Trong **Environment**, thêm đầy đủ:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
FIREBASE_ADMIN_SA_BASE64=
APP_URL=https://your-service.onrender.com
CRON_SECRET=
```

6. Deploy, sau đó mở `https://your-service.onrender.com/api/health`; kết quả đúng là `{ "status": "ok" }`.
7. Thêm domain Render hoặc custom domain vào **Firebase Authentication → Settings → Authorized domains**.
8. Nếu đổi domain, cập nhật `APP_URL` trên Render và `RENDER_APP_URL` trong GitHub Secrets.

Trên iOS dùng Safari **Share → Add to Home Screen**. Trên Android/Chrome chọn **Install app** khi trình duyệt hiện lời mời.

## 6. Cách test Giai đoạn 1

1. Đăng nhập tài khoản A; nếu là lần đầu, nhập hai tên và ngày yêu.
2. Kiểm tra bộ đếm thay đổi mỗi giây và cột mốc hiển thị ngày còn lại.
3. Bấm camera, thử cả **Chọn từ thư viện** và **Chụp ảnh mới**, thêm caption dưới 100 ký tự rồi gửi.
4. Kiểm tra Cloudinary có file trong `love-days/locket` và Firestore có document mới trong `photos`.
5. Đổi ảnh chung liên tiếp để xác nhận không còn giới hạn thời gian và trang chủ luôn hiện ảnh mới nhất.
6. Đăng nhập tài khoản B trên trình duyệt/thiết bị khác, bật chuông, sau đó tạo ảnh mới từ A khi đã hết giới hạn để test FCM.
7. Từ B, chọn một reaction; reaction phải cập nhật realtime trên cả hai thiết bị.

## 7. Cách test Timeline

1. Deploy lại `firestore.rules` để mở collection `memories`.
2. Mở tab **Timeline**, bấm **Thêm kỷ niệm** và chọn ảnh, ngày, tiêu đề, mô tả cùng tag.
3. Sau khi lưu, kiểm tra ảnh nằm trong folder `love-days/memories` trên Cloudinary và document mới xuất hiện trong Firestore.
4. Thử lọc theo tag, tháng/năm và chuyển giữa **Timeline** với **Lưới ảnh**.
5. Bấm vào một thẻ hoặc ảnh để mở modal chi tiết.

## Cấu trúc dữ liệu riêng tư theo cặp

```text
users/{uid}                    # hồ sơ tự đặt, coupleId, FCM token
pairInvites/{inviteId}         # lời mời qua link hoặc UID
couples/{coupleId}             # memberIds[2], startDate, inviteId
  photos/{photoId}             # ảnh chung mới nhất
  memories/{memoryId}          # Timeline riêng của cặp
  locketPosts/{postId}         # ảnh Locket và reactions
    replies/{replyId}          # trả lời theo ảnh
  locketMessages/{messageId}   # chat realtime riêng của cặp
```

Firestore Rules chỉ cho hai UID trong `memberIds` đọc hoặc ghi các subcollection của cặp. Lời mời UID và link đều cần người nhận đăng nhập rồi bấm chấp nhận.

## Kiểm tra code

```bash
npm run typecheck
npm run lint
npm run build
```

Timeline và khu Locket đôi tại `/locket` đã được triển khai. Locket đôi hỗ trợ upload tối đa 6 ảnh mỗi lượt, reaction theo người dùng, reply theo ảnh và chat realtime. Bucket list, Bản đồ, Hộp thư tương lai và Playlist vẫn là các phần tiếp theo.
