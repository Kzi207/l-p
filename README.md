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
- Đăng ký FCM token trên trình duyệt và Vercel API Routes gửi thông báo cho người còn lại, không cần Firebase Blaze.

## 1. Chạy project lần đầu

Yêu cầu: Node.js 20 hoặc mới hơn và npm.

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Khi chưa điền biến môi trường, app sẽ hiện màn hình hướng dẫn cấu hình thay vì crash.

> PWA service worker được tắt ở môi trường development để tránh cache code cũ. Test PWA bằng `npm run build && npm run start` hoặc trên URL Vercel HTTPS.

## 2. Setup Firebase từ đầu

### 2.1 Tạo project và Web App

1. Vào [Firebase Console](https://console.firebase.google.com), chọn **Add project** và đặt tên tùy ý.
2. Trong **Project settings → General → Your apps**, chọn biểu tượng Web `</>`.
3. Đăng ký app; không cần bật Firebase Hosting vì frontend sẽ ở Vercel.
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
2. Chọn region gần hai bạn; nếu sẽ deploy Cloud Function hiện tại, chọn `asia-southeast1` để đồng vùng.
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

## 4. Web Push bằng Vercel API Routes — không cần Firebase Blaze

Bốn route `/api/notify/photo`, `/api/notify/locket`, `/api/notify/memory` và `/api/notify/chat` thay cho bốn Firestore trigger cũ. Client gọi route tương ứng ngay sau khi ghi Firestore thành công. Server bắt buộc xác thực Firebase ID token, kiểm tra UID người gửi, couple và document vừa tạo trước khi gửi FCM cho người còn lại.

### 4.1 Lấy Firebase Service Account

1. Vào **Firebase Console → Project settings → Service accounts**.
2. Chọn **Generate new private key** và xác nhận để tải file JSON.
3. Không đổi tên file thành tên chung như `config.json`, không đặt trong `public/` và tuyệt đối không commit lên Git. `.gitignore` đã chặn `service-account*.json` và `firebase-admin-key*.json`.
4. Mở JSON, lấy ba giá trị `project_id`, `client_email`, `private_key` để tạo biến môi trường. Admin SDK server-side không phải Cloud Functions nên bước này không yêu cầu nâng gói Blaze.

### 4.2 Biến môi trường mới trên Vercel

Vào **Vercel → Project → Settings → Environment Variables**, thêm cho Production (và Preview nếu cần):

```env
FIREBASE_ADMIN_PROJECT_ID=khanhduyyyy-bee16
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@khanhduyyyy-bee16.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APP_URL=https://love.khanhduy.id.vn
CRON_SECRET=mot-chuoi-ngau-nhien-dai-va-kho-doan
```

Giữ nguyên ký tự `\n` trong `FIREBASE_ADMIN_PRIVATE_KEY`; code sẽ đổi chúng thành xuống dòng thật khi khởi tạo Admin SDK. Không thêm tiền tố `NEXT_PUBLIC_` cho bất kỳ biến nào ở trên. Sau khi lưu biến, redeploy project Vercel.

### 4.3 Retry và hàng đợi thông báo

Request thông báo chạy nền nên không làm chậm upload hoặc gửi tin nhắn. Nếu request thất bại, client thử lại thêm 2 lần, mỗi lần cách 2 giây. Nếu vẫn lỗi, request được giữ trong `localStorage` và tự thử lại khi app mở lần sau hoặc thiết bị có mạng trở lại.

Đánh đổi cần biết: Firestore trigger trên Cloud Functions đáng tin cậy hơn vì không phụ thuộc client. Cách Vercel vẫn có xác suất nhỏ bỏ lỡ thông báo nếu người dùng đóng app ngay sau khi ghi dữ liệu, trước khi request hoặc hàng đợi kịp được lưu. Với app hai người dùng thường xuyên, retry và hàng đợi giúp rủi ro này ở mức chấp nhận được.

Thư mục `functions/` cũ chỉ còn để tham khảo. `firebase.json` đã bỏ cấu hình Functions nên quy trình hiện tại không deploy các function cũ nữa. Nếu trước đây đã deploy chúng, xóa một lần để tránh nhận thông báo trùng:

```bash
npx firebase-tools functions:delete notifyPartnerAboutPhoto notifyPartnerAboutMessage notifyPartnerAboutLocket notifyPartnerAboutMemory --region asia-southeast1
```

### 4.4 Cron cho thư tới ngày mở

Route `/api/notify/timecapsule-check` được bảo vệ bằng header `x-cron-secret`. Workflow `.github/workflows/timecapsule-cron.yml` gọi route lúc **01:00 UTC / 08:00 Việt Nam** mỗi ngày.

1. Vào GitHub repository → **Settings → Secrets and variables → Actions**.
2. Tạo Repository secret tên `CRON_SECRET`, giá trị phải giống hệt biến trên Vercel.
3. Vào tab **Actions → Kiểm tra thư tới ngày mở → Run workflow** để test thủ công bằng trigger `workflow_dispatch`.
4. Kết quả thành công trả JSON gồm ngày kiểm tra, số thư phù hợp và số notification đã gửi.

Deploy index collection-group cho trường `timeCapsules.openDate` cùng Firestore Rules:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Nếu đổi domain production, cập nhật cả `APP_URL` trên Vercel và URL trong `.github/workflows/timecapsule-cron.yml`.

## 5. Deploy frontend lên Vercel

1. Đẩy repository lên GitHub/GitLab/Bitbucket riêng tư.
2. Vào [Vercel Dashboard](https://vercel.com/new), chọn **Add New → Project** và import repository.
3. Vercel tự nhận Framework Preset là **Next.js**. Giữ Build Command `npm run build` và Output mặc định.
4. Trong **Settings → Environment Variables**, thêm đủ toàn bộ biến trong `.env.local.example` cho Production, Preview và Development theo nhu cầu.
5. Chọn **Deploy**. Sau khi có domain chính thức, cập nhật biến `APP_URL` trên Vercel và redeploy nếu URL đã thay đổi.
6. Trong Firebase Authentication, thêm domain Vercel vào **Settings → Authorized domains** nếu chưa có.

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
