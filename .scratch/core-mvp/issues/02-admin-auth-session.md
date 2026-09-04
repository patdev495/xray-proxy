# 02-admin-auth-session

Status: ready-for-agent

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng hệ thống xác thực người quản trị (Admin Authentication) và phiên làm việc bảo mật (Protected Session) xuyên suốt từ Database đến giao diện người dùng.

Admin có thể nhập tên đăng nhập và mật khẩu tại trang Login, nhận JWT Token bảo mật, và được điều hướng vào Dashboard quản trị. Nếu chưa đăng nhập hoặc token hết hạn, người dùng sẽ tự động bị chặn và chuyển hướng về trang Login.

## Acceptance criteria

- [ ] Model `User` trong cơ sở dữ liệu hỗ trợ `role` (ADMIN, CUSTOMER), lưu trữ mật khẩu đã được hash bằng bcrypt.
- [ ] Script hoặc startup event tự động tạo tài khoản Admin mặc định nếu chưa tồn tại.
- [ ] Endpoint `POST /api/v1/auth/token` xác thực thông tin đăng nhập và trả về access token JWT (OAuth2 Password Bearer).
- [ ] Dependency `get_current_admin` bảo vệ các router nội bộ, từ chối các request không có token hoặc sai quyền.
- [ ] Trang Login trên Frontend với thiết kế thẩm mỹ cao (Dark glassmorphism card, hiệu ứng input focus, hiển thị thông báo lỗi khi sai tài khoản).
- [ ] Frontend lưu trữ JWT token trong localStorage/session và tự động đính kèm Authorization header vào các API request sau đó.
- [ ] Cơ chế Protected Route trên Frontend ngăn chặn truy cập trái phép vào các trang quản trị khi chưa đăng nhập.

## Blocked by

- .scratch/core-mvp/issues/01-scaffold-foundation.md
