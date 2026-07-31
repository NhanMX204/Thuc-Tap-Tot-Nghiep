# 📰 Backend – Báo Điện Tử

Backend RESTful API cho hệ thống báo điện tử, xây dựng bằng **NestJS**, **TypeORM** và **MySQL**.

---

## 🛠️ Công nghệ sử dụng

| Công nghệ | Phiên bản | Mô tả |
|---|---|---|
| [NestJS](https://nestjs.com/) | ^11 | Framework Node.js chính |
| [TypeORM](https://typeorm.io/) | ^1.1 | ORM tương tác cơ sở dữ liệu |
| MySQL | ≥ 8.0 | Cơ sở dữ liệu quan hệ |
| [JWT](https://jwt.io/) | - | Xác thực người dùng |
| [Cloudinary](https://cloudinary.com/) | ^2 | Lưu trữ & quản lý ảnh |
| [Swagger](https://swagger.io/) | ^11 | Tài liệu API tự động |
| Nodemailer | ^9 | Gửi email (quên mật khẩu, v.v.) |
| VNPay | - | Thanh toán trực tuyến |
| PDFKit | ^0.19 | Xuất file PDF |

---

## 📁 Cấu trúc thư mục

```
src/
├── app.module.ts              # Module gốc
├── main.ts                    # Entry point
│
├── auth/                      # Xác thực (đăng nhập, đăng ký, JWT)
├── users/                     # Quản lý người dùng
├── articles/                  # Quản lý bài viết
├── article-views/             # Theo dõi lượt xem bài viết
├── categories/                # Danh mục bài viết
├── comments/                  # Bình luận
├── subscriptions/             # Gói đăng ký VIP
├── vip-packages/              # Quản lý gói VIP
├── transactions/              # Giao dịch & thanh toán VNPay
├── stats/                     # Thống kê
├── sessions/                  # Quản lý phiên đăng nhập
├── cloudinary/                # Upload & quản lý ảnh Cloudinary
├── mail/                      # Gửi email
├── password-resets/           # Quên mật khẩu / đặt lại mật khẩu
├── database/                  # Seed data
└── common/                    # Guards, filters, decorators dùng chung
```

---

## ⚙️ Yêu cầu hệ thống

Trước khi chạy dự án, hãy đảm bảo máy bạn đã cài:

- **Node.js** ≥ 18.x — [Tải về](https://nodejs.org/)
- **npm** ≥ 9.x (đi kèm Node.js)
- **MySQL** ≥ 8.0 — [Tải về](https://dev.mysql.com/downloads/)
- **Git** — [Tải về](https://git-scm.com/)

---

## 🚀 Hướng dẫn cài đặt & chạy dự án

### 1. Clone repository

```bash
git clone https://github.com/NhanMX204/Thuc-Tap-Tot-Nghiep.git
cd Thuc-Tap-Tot-Nghiep/backend-bao-dien-tu
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Sau đó mở file `.env` và điền đầy đủ các giá trị:

```env
# ===== SERVER =====
PORT=8080

# ===== DATABASE (MySQL) =====
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_DATABASE=bao_dien_tu
DB_SYNC=true

# ===== JWT =====
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=1d

# ===== FRONTEND =====
FRONTEND_URL=http://localhost:3000

# ===== VNPAY (thanh toán) =====
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:8080/api/transactions/vnpay-return

# ===== CLOUDINARY (upload ảnh) =====
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=bao-dien-tu
```

> **Lưu ý:** Xem hướng dẫn lấy thông tin Cloudinary tại mục [Cấu hình Cloudinary](#-cấu-hình-cloudinary) bên dưới.

### 4. Tạo cơ sở dữ liệu MySQL

Mở MySQL và tạo database:

```sql
CREATE DATABASE bao_dien_tu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> **Lưu ý:** Khi `DB_SYNC=true`, TypeORM sẽ **tự động tạo các bảng** khi server khởi động lần đầu. Không cần chạy migration thủ công.

### 5. (Tuỳ chọn) Seed dữ liệu mẫu

Nếu bạn muốn có dữ liệu mẫu ban đầu:

```bash
npm run seed
```

### 6. Khởi động server

**Chế độ phát triển (có hot-reload):**

```bash
npm run start:dev
```

**Chế độ production:**

```bash
npm run build
npm run start:prod
```

---

## 🌐 Truy cập sau khi khởi động

| Đường dẫn | Mô tả |
|---|---|
| `http://localhost:8080/api` | Base URL của tất cả API |
| `http://localhost:8080/swagger` | Giao diện Swagger UI – tài liệu API |

---

## 📋 Danh sách các lệnh npm

| Lệnh | Mô tả |
|---|---|
| `npm run start:dev` | Chạy server ở chế độ development (watch mode) |
| `npm run start:prod` | Chạy server ở chế độ production |
| `npm run build` | Build dự án ra thư mục `dist/` |
| `npm run seed` | Chạy seed dữ liệu mẫu vào database |
| `npm run lint` | Kiểm tra và tự fix lỗi ESLint |
| `npm run format` | Format code bằng Prettier |
| `npm run test` | Chạy unit test |
| `npm run test:cov` | Chạy test với báo cáo coverage |

---

## ☁️ Cấu hình Cloudinary

Cloudinary được dùng để lưu trữ ảnh bìa bài viết và ảnh đại diện người dùng.

1. Đăng ký tài khoản miễn phí tại [cloudinary.com](https://cloudinary.com/)
2. Vào **Dashboard** → sao chép các thông tin:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Điền vào file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=bao-dien-tu
```

---

## 💳 Cấu hình VNPay (Sandbox)

VNPay được dùng cho tính năng thanh toán gói VIP.

1. Đăng ký tài khoản sandbox tại [sandbox.vnpayment.vn](https://sandbox.vnpayment.vn/)
2. Lấy `TmnCode` và `HashSecret` từ cổng thanh toán sandbox
3. Điền vào file `.env`:

```env
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
```

---

## 🔐 Xác thực & Phân quyền

- API sử dụng **JWT (JSON Web Token)** lưu trong **HTTP-Only Cookie**
- Các route được bảo vệ mặc định bởi `JwtAuthGuard`
- Phân quyền theo role bằng `RolesGuard`
- Để bỏ bảo vệ cho một route cụ thể, dùng decorator `@Public()`

---

## 📖 Tài liệu API (Swagger)

Sau khi khởi động server, truy cập:

```
http://localhost:8080/swagger
```

Swagger UI liệt kê đầy đủ tất cả các endpoint, tham số và cho phép test API trực tiếp trên trình duyệt.

Để test các API cần xác thực:
1. Đăng nhập qua `POST /api/auth/login`
2. Nhấn nút **Authorize 🔒** ở góc trên phải Swagger UI
3. Nhập Bearer token nhận được

---

## 🐛 Xử lý lỗi phổ biến

**Lỗi kết nối MySQL:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
→ Kiểm tra MySQL đang chạy và thông tin `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` trong `.env` đúng chưa.

---

**Lỗi thiếu biến môi trường:**
```
Error: JWT_SECRET is not defined
```
→ Đảm bảo đã tạo file `.env` từ `.env.example` và điền đầy đủ giá trị.

---

**Port đã bị chiếm dụng:**
```
Error: listen EADDRINUSE :::8080
```
→ Đổi `PORT` trong `.env` sang giá trị khác (vd: `3001`, `4000`).

---

## 👤 Tác giả
Mai Xuan Nhan
