# 01-scaffold-foundation

Status: done

## Parent

.scratch/core-mvp/PRD.md

## What to build

Thiết lập khung dự án full-stack hoàn chỉnh bao gồm Backend FastAPI (quản lý bằng `uv`) và Frontend React + TypeScript + Tailwind CSS (Vite), kèm theo kết nối cơ sở dữ liệu SQLite Async và kiểm tra sức khỏe hệ thống (Health Check) xuyên suốt.

Người dùng khi chạy backend và frontend có thể mở trình duyệt, nhìn thấy giao diện shell của bảng điều khiển Control Plane với trạng thái hệ thống hiển thị trực tiếp từ API `/api/health`.

## Acceptance criteria

- [x] Backend khởi tạo bằng `uv` với `pyproject.toml`, cài đặt đầy đủ các gói cốt lõi (FastAPI, uvicorn, sqlalchemy, aiosqlite, pydantic, pydantic-settings).
- [x] Kết nối SQLite Async qua SQLAlchemy 2.0 hoạt động ổn định và tự động tạo bảng khi khởi động.
- [x] Endpoint `GET /api/health` trả về JSON trạng thái hệ thống `{"status": "ok", "app": "xray-proxy"}`.
- [x] Frontend khởi tạo bằng Vite + React + TypeScript (`strict: true`) kết hợp Tailwind CSS với theme Dark Mode hiện đại.
- [x] Giao diện Web hiển thị được trạng thái kết nối Backend (Health indicator) theo thời gian thực.
- [x] Code Python đạt 100% type hint và vượt qua kiểm tra static type checker không có cảnh báo.

## Blocked by

- None - can start immediately

## Comments

> *This was completed by AI.*
- Backend đã khởi tạo bằng `uv`, cấu hình `pydantic-settings`, SQLAlchemy 2.0 Async với SQLite (`backend/app/core/database.py`).
- Endpoint `GET /api/health` hoạt động chính xác và đã vượt qua unit test với `uv run pytest` (1 passed).
- Code Python tuân thủ 100% strict type hints và vượt qua kiểm tra `uv run mypy app` (12 source files, 0 issues).
- Frontend khởi tạo với Vite + React 19 + TypeScript (`strict: true`) + Tailwind CSS v4.
- Giao diện Dashboard Control Plane thẩm mỹ cao (Dark Mode Glassmorphism) hiển thị trạng thái kết nối theo thời gian thực.
- Kiểm tra build frontend production (`tsc -b && vite build`) hoàn thành xuất sắc trong 23s.
