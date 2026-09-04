# 02-admin-auth-session

Status: done

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng hệ thống xác thực người quản trị (Admin Authentication) và phiên làm việc bảo mật (Protected Session) xuyên suốt từ Database đến giao diện người dùng.

Admin có thể nhập tên đăng nhập và mật khẩu tại trang Login, nhận JWT Token bảo mật, và được điều hướng vào Dashboard quản trị. Nếu chưa đăng nhập hoặc token hết hạn, người dùng sẽ tự động bị chặn và chuyển hướng về trang Login.

## Acceptance criteria

- [x] Model `User` trong cơ sở dữ liệu hỗ trợ `role` (ADMIN, CUSTOMER), lưu trữ mật khẩu đã được hash bằng bcrypt.
- [x] Script hoặc startup event tự động tạo tài khoản Admin mặc định nếu chưa tồn tại.
- [x] Endpoint `POST /api/v1/auth/token` xác thực thông tin đăng nhập và trả về access token JWT (OAuth2 Password Bearer).
- [x] Dependency `get_current_admin` bảo vệ các router nội bộ, từ chối các request không có token hoặc sai quyền.
- [x] Trang Login trên Frontend với thiết kế thẩm mỹ cao (Dark glassmorphism card, hiệu ứng input focus, hiển thị thông báo lỗi khi sai tài khoản).
- [x] Frontend lưu trữ JWT token trong localStorage/session và tự động đính kèm Authorization header vào các API request sau đó.
- [x] Cơ chế Protected Route trên Frontend ngăn chặn truy cập trái phép vào các trang quản trị khi chưa đăng nhập.

## Blocked by

- .scratch/core-mvp/issues/01-scaffold-foundation.md

## Comments

> *This was completed by AI using TDD.*
- Đã triển khai TDD: test_admin_login_success, test_admin_login_invalid_password, test_read_current_user_profile, test_read_current_user_unauthorized.
- Model User (`app/models/user.py`), bcrypt hash (`app/core/security.py`), Pydantic schemas (`app/schemas/auth.py`).
- Seed admin mặc định (`admin` / `adminpassword`) khi khởi chạy lifespan.
- Frontend LoginPage (`LoginPage.tsx`), AuthContext (`AuthContext.tsx`), AuthGate bảo vệ Dashboard, hiển thị profile và logout.
- 5/5 backend unit tests passed. Mypy 18 files clean. Frontend build production thành công.
