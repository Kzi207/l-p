# LoveSpace

LoveSpace là web app riêng tư dành cho cặp đôi, được xây dựng theo mô hình `single-repo Next.js`: frontend và backend nằm chung trong một project. Ứng dụng tập trung vào 5 nhu cầu chính:

- Đếm ngày yêu
- Lưu ảnh kỷ niệm
- Viết nhật ký chung
- Quản lý lịch sự kiện chung
- Ghi chú chung

## Tác giả

Theo metadata git hiện có trong repo, dự án đang được phát triển bởi:

- `kzi207`
- Email commit gần nhất: `toi05022020@gmail.com`

Nếu bạn là chủ sở hữu repo và muốn thay đổi tên hiển thị, email liên hệ hoặc thông tin thương hiệu, hãy cập nhật lại mục này.

## Mục tiêu dự án

LoveSpace không phải landing page, không phải mạng xã hội, và cũng không phải ứng dụng chat. Mục tiêu của dự án là tạo ra một không gian riêng cho hai người, nơi mọi dữ liệu đều được gom vào cùng một workspace:

- Một cặp đôi tương ứng một `Couple`
- Mọi `Memory`, `Journal`, `Event`, `Note` đều thuộc về đúng `Couple` đó
- Mỗi user chỉ được đọc và ghi dữ liệu trong không gian của cặp đôi mình

## Công nghệ sử dụng

### Frontend

- `Next.js 16 App Router`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `Framer Motion`

### Backend

- `Next.js Route Handlers` cho API backend
- `Prisma ORM`
- `Neon PostgreSQL`
- `Auth.js / NextAuth` với credentials login
- `bcrypt` để hash mật khẩu
- `zod` để validate request

### Lưu trữ ảnh

- `Catbox.moe`

### Realtime

- Hiện tại đang dùng `polling fallback` 5-10 giây ở phía client
- Chưa bật `WebSocket` trong code hiện tại

## Logic hoạt động của dự án

### 1. Xác thực

- Người dùng đăng ký qua `POST /api/auth/register`
- Mật khẩu được hash bằng `bcrypt`
- Đăng nhập dùng `Auth.js credentials provider`
- Session dùng `JWT strategy`

### 2. Ghép cặp

- User có thể tạo cặp đôi mới qua `POST /api/couples/create`
- Hoặc nhập mã ghép đôi qua `POST /api/couples/join`
- Sau khi ghép thành công, dữ liệu của user sẽ gắn với `coupleId`

### 3. Phân quyền dữ liệu

- Mỗi API đọc/ghi dữ liệu đều lấy user hiện tại từ session
- Backend chỉ truy vấn dữ liệu theo `coupleId` của user đó
- Không có route nào được phép đọc dữ liệu từ couple khác

### 4. Ảnh kỷ niệm

- File ảnh upload lên `Catbox.moe`
- Database chỉ lưu `imageUrl` và metadata
- Không lưu binary/file blob trong PostgreSQL

### 5. Dashboard

- `GET /api/dashboard` tổng hợp:
  - số ngày yêu
  - tổng số memories
  - tổng số journals
  - số sự kiện sắp tới
  - memory mới nhất
  - journal gần nhất
  - ghi chú được ghim

## Kiến trúc dữ liệu

Prisma schema hiện có 6 model chính:

- `User`
- `Couple`
- `Memory`
- `Journal`
- `Event`
- `Note`

Quan hệ chính:

- `User` có thể thuộc một `Couple`
- `Couple` có nhiều `Memory`
- `Couple` có nhiều `Journal`
- `Couple` có nhiều `Event`
- `Couple` có nhiều `Note`
- `Memory` có `author`
- `Journal` có `author`

File schema: [prisma/schema.prisma](./prisma/schema.prisma)

## Biến môi trường

Tạo file `.env` từ `.env.example`:

```env
DATABASE_URL=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL=""
CATBOX_USERHASH=""
```

Ý nghĩa:

- `DATABASE_URL`: chuỗi kết nối Neon PostgreSQL
- `NEXTAUTH_SECRET`: secret để ký session/JWT
- `NEXTAUTH_URL`: URL app đang chạy
- `CATBOX_USERHASH`: user hash của Catbox, có thể để trống nếu không dùng account riêng

## Cài đặt và chạy local

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

App mặc định chạy tại:

```bash
http://localhost:3000
```

## Các route giao diện

- `/`
- `/login`
- `/dashboard`
- `/memories`
- `/journal`
- `/calendar`
- `/notes`
- `/settings`

## API backend hiện có

### Auth

- `POST /api/auth/register`
- `GET|POST /api/auth/[...nextauth]`

### Couple

- `POST /api/couples/create`
- `POST /api/couples/join`
- `GET /api/couples/me`
- `PATCH /api/couples/me`

### Upload

- `POST /api/upload`

### Memories

- `GET /api/memories`
- `POST /api/memories`
- `DELETE /api/memories/:id`

### Journals

- `GET /api/journals`
- `POST /api/journals`
- `PATCH /api/journals/:id`
- `DELETE /api/journals/:id`

### Events

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`

### Dashboard

- `GET /api/dashboard`

## Contract backend quan trọng

Các response chính đang bám theo spec nội bộ của dự án:

### Dashboard

```json
{
  "loveDays": 0,
  "totalMemories": 0,
  "totalJournals": 0,
  "upcomingEvents": 0,
  "latestMemories": [],
  "recentJournals": [],
  "pinnedNote": null
}
```

### Memory item

```json
{
  "id": "string",
  "imageUrl": "string",
  "caption": "string",
  "createdAt": "string",
  "author": {
    "id": "string",
    "name": "string",
    "avatar": "string | null"
  }
}
```

### Journal item

```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "imageUrl": "string | null",
  "createdAt": "string",
  "author": {
    "id": "string",
    "name": "string"
  }
}
```

### Event item

```json
{
  "id": "string",
  "title": "string",
  "eventDate": "string",
  "type": "string"
}
```

### Note item

```json
{
  "id": "string",
  "content": "string",
  "isPinned": false
}
```

## Bảo mật hiện có

Các lớp bảo vệ hiện đang được dùng trong repo:

- `Auth.js` session với JWT
- `bcrypt` hash password
- `zod` validate toàn bộ request chính
- `middleware.ts` chặn truy cập trái phép vào route protected
- Tất cả API couple-scoped theo `session.user.id -> coupleId`
- Không lưu file ảnh trực tiếp trong DB
- Không expose `DATABASE_URL` ra client

Lưu ý:

- Realtime hiện là polling, chưa có WebSocket auth channel riêng
- Repo hiện chưa có tài liệu security hardening riêng kiểu enterprise

## Lỗi thường gặp

### 1. `The table public.User does not exist`

Nguyên nhân:

- Chưa apply schema lên database

Cách xử lý:

```bash
npx prisma db push
```

### 2. `Can't reach database server`

Nguyên nhân:

- `DATABASE_URL` sai
- Neon database đang pause hoặc endpoint không phản hồi

Cách xử lý:

- Kiểm tra lại `DATABASE_URL`
- Mở dashboard Neon để xác nhận database đang hoạt động
- Chạy lại:

```bash
npx prisma validate
```

### 3. `EPERM ... query_engine-windows.dll.node`

Nguyên nhân:

- Trên Windows, Prisma engine đang bị process khác giữ file

Cách xử lý:

1. Dừng `npm run dev`
2. Chạy lại:

```bash
npx prisma generate
npm run dev
```

### 4. Đăng ký thất bại với message liên quan database

Nguyên nhân:

- Database chưa reachable
- Schema chưa được push

Cách xử lý:

```bash
npx prisma db push
npx prisma generate
```

### 5. Giao diện có cảm giác tự reload liên tục

Nguyên nhân:

- App đang dùng polling để làm fallback realtime

Ghi chú:

- Backend hiện không dùng WebSocket
- Polling nền đã được tách khỏi loading chính để giảm cảm giác “reload”

## Triển khai bằng Vercel

Vercel là lựa chọn phù hợp nhất nếu bạn muốn deploy nhanh theo đúng kiểu Next.js fullstack.

### Bước 1. Push code lên GitHub

Đảm bảo repo đã sẵn sàng và có:

- `package.json`
- `prisma/schema.prisma`
- `.env.example`

### Bước 2. Import vào Vercel

- Đăng nhập Vercel
- Chọn `Add New Project`
- Import repo GitHub

### Bước 3. Khai báo biến môi trường

Thêm vào Vercel:

```env
DATABASE_URL=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.vercel.app
CATBOX_USERHASH=...
```

### Bước 4. Build

Vercel sẽ tự chạy:

```bash
npm install
npm run build
```

Trước khi app hoạt động ổn định, cần đảm bảo database đã có schema:

```bash
npx prisma db push
```

Bạn có thể chạy lệnh này local trước khi deploy, hoặc cấu hình workflow CI/CD riêng.

## Chạy server riêng bằng Node

Nếu muốn tự host:

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm run start
```

Sau đó reverse proxy bằng `Nginx`, `Caddy`, hoặc platform bạn đang dùng.

## Dùng Cloudflared Tunnel

`cloudflared` phù hợp để:

- test app local trên internet
- demo nhanh cho người khác
- webhook/callback testing

### Cài và chạy tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

Cloudflared sẽ trả về một URL public dạng:

```bash
https://random-name.trycloudflare.com
```

Khi dùng URL này, hãy cập nhật:

```env
NEXTAUTH_URL=https://random-name.trycloudflare.com
```

Sau đó restart app:

```bash
npm run dev
```

Lưu ý:

- Cloudflared không thay thế production hosting
- Đây là cách expose local app, không phải hạ tầng production chuẩn

## Cấu trúc chính của project

```text
src/
├─ app/
├─ components/
├─ hooks/
├─ lib/
├─ services/
├─ types/
└─ data/

prisma/
└─ schema.prisma
```

## Chính sách sử dụng

- Không dùng dự án này để lưu trữ nội dung vi phạm pháp luật
- Không dùng để phát tán dữ liệu cá nhân của người khác khi chưa có sự đồng ý
- Không lạm dụng hạ tầng upload ảnh cho nội dung độc hại, spam, hoặc vi phạm điều khoản của Catbox
- Khi fork hoặc tái sử dụng, bạn tự chịu trách nhiệm với dữ liệu người dùng và cấu hình bảo mật của bản triển khai mới

## Chính sách bảo mật

Nếu bạn phát hiện lỗ hổng bảo mật:

- Không public ngay lập tức trên issue công khai nếu lỗi có thể gây rò rỉ dữ liệu
- Hãy liên hệ trực tiếp với maintainer/chủ sở hữu repo trước
- Khi báo lỗi, nên kèm:
  - mô tả lỗi
  - bước tái hiện
  - mức độ ảnh hưởng
  - đề xuất hướng xử lý nếu có

Khuyến nghị vận hành:

- Đổi `NEXTAUTH_SECRET` đủ mạnh
- Không commit `.env`
- Không chia sẻ `DATABASE_URL`
- Sao lưu database định kỳ nếu dùng production

## Bản quyền

Repo hiện không có file `LICENSE`.

Điều đó có nghĩa là, mặc định:

- mã nguồn vẫn thuộc quyền kiểm soát của tác giả/chủ sở hữu repo
- mọi quyền sử dụng, phân phối lại, thương mại hóa hoặc cấp phép lại nên được tác giả cho phép rõ ràng trước khi dùng ở môi trường chính thức

Nếu bạn muốn open-source chính thức, nên thêm một file `LICENSE` phù hợp, ví dụ:

- `MIT`
- `Apache-2.0`
- `GPL-3.0`

## Ghi chú cuối

README này được viết lại theo trạng thái code hiện có trong repo, không dựa trên các ghi chú review bảo mật của codebase khác. Nếu logic hoặc API thay đổi trong tương lai, hãy cập nhật lại tài liệu để tránh lệch giữa code và README.
