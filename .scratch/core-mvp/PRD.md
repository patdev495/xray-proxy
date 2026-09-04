# PRD: xray-proxy Core MVP

Hệ thống quản lý dịch vụ proxy tập trung (Control Plane) cho phép quản trị nhiều Node VPS chạy nhân Xray, hỗ trợ cấu hình đa SNI (vượt DPI theo nhà mạng di động), và phân phối cấu hình VLESS-Reality qua liên kết Subscription cho các ứng dụng client (Shadowrocket).

## Goals

1. Cung cấp bảng điều khiển quản trị tập trung cho Admin (FastAPI + React TypeScript Tailwind).
2. Quản lý Node VPS chạy `xray-core` thuần qua kết nối gRPC, kèm script/docker khởi tạo 1 lệnh.
3. Cho phép cấu hình nhiều SNI Profile trên mỗi Node để thích ứng với cơ chế bóp băng thông của từng nhà mạng.
4. Phát hành Subscription link tương thích 100% với Shadowrocket và các client phổ biến.
5. Tự động đồng bộ số liệu dung lượng định kỳ và ngắt kết nối tài khoản khi vượt hạn mức hoặc hết hạn sử dụng.

## Target Architecture

- **Backend**: FastAPI (Python 3.11+, UV, SQLAlchemy 2.0 Async, SQLite, Pydantic v2).
- **Frontend**: React + TypeScript + Tailwind CSS (Vite, Pristine Light Mode, Linear/Stripe style, No AI Glow Slop).
- **Node Core**: `xray-core` với Inbound VLESS-Reality và gRPC API.
