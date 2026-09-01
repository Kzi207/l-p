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
- Đăng ký FCM token trên trình duyệt và Cloud Function gửi thông báo cho người còn lại.

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

## 4. Deploy Cloud Function gửi FCM

Code nằm trong `functions/src/index.ts`. Bốn Function gửi Web Push cho người còn lại khi có ảnh chung, Locket, ảnh/video kỷ niệm hoặc tin nhắn mới.

```bash
cd functions
npm install
npm run build
cd ..
npx firebase-tools deploy --only functions:notifyPartnerAboutPhoto,functions:notifyPartnerAboutMessage,functions:notifyPartnerAboutLocket,functions:notifyPartnerAboutMemory
```

Lần deploy đầu, CLI sẽ hỏi parameter `APP_URL`; nhập URL HTTPS Vercel đầy đủ, ví dụ `https://love-days.example.vercel.app`.

### Lưu ý bắt buộc về chi phí

Firebase hiện yêu cầu project ở **Blaze (pay-as-you-go)** mới deploy được Cloud Functions. Blaze có quota miễn phí, nhưng có thể phát sinh phí nhỏ (bao gồm lưu artifact khi deploy) và không thể hứa tuyệt đối hóa đơn luôn bằng 0. Nếu giữ Spark plan, thông báo khi app đang mở vẫn hoạt động nhưng Web Push nền khi app đã đóng sẽ không có máy chủ để gửi.

Nếu chấp nhận Blaze, hãy tạo Budget Alert và spend cap cho Cloud Run Functions trong Google Cloud Console, đồng thời theo dõi Artifact Registry. Đây là giới hạn nền tảng chứ không phải giới hạn của code.

## 5. Deploy frontend lên Vercel

1. Đẩy repository lên GitHub/GitLab/Bitbucket riêng tư.
2. Vào [Vercel Dashboard](https://vercel.com/new), chọn **Add New → Project** và import repository.
3. Vercel tự nhận Framework Preset là **Next.js**. Giữ Build Command `npm run build` và Output mặc định.
4. Trong **Settings → Environment Variables**, thêm đủ toàn bộ biến trong `.env.local.example` cho Production, Preview và Development theo nhu cầu.
5. Chọn **Deploy**. Sau khi có domain chính thức, cập nhật `APP_URL` của Cloud Function và deploy lại Function nếu URL đã thay đổi.
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
cd functions && npm run build
```

Timeline và khu Locket đôi tại `/locket` đã được triển khai. Locket đôi hỗ trợ upload tối đa 6 ảnh mỗi lượt, reaction theo người dùng, reply theo ảnh và chat realtime. Bucket list, Bản đồ, Hộp thư tương lai và Playlist vẫn là các phần tiếp theo.
