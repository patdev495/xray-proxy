# 03-node-sni-management

Status: ready-for-agent

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng tính năng quản lý Node proxy và cấu hình đa SNI Profile linh hoạt theo từng nhà mạng/quốc gia, kèm theo bộ sinh cấu hình cài đặt Node (1-line script / Docker compose).

Admin có thể quản lý danh sách Node VPS (tên node, IP, cổng kết nối, cổng gRPC, Reality public/private key), gắn thêm nhiều SNI Profile tùy biến cho mỗi Node (ví dụ: Rakuten, SoftBank, Docomo, Viettel, Apple...), và tải/sao chép script cài đặt để triển khai nhanh lên VPS mới.

## Acceptance criteria

- [ ] Model `Node` và `SniProfile` trong cơ sở dữ liệu với quan hệ 1-N (Một Node có nhiều SNI Profile).
- [ ] Tính năng tự động sinh Reality X25519 Keypair (public key, private key, short id) ngẫu nhiên nếu Admin không nhập thủ công.
- [ ] API endpoints đầy đủ tại `/api/v1/admin/nodes` hỗ trợ:
  - Liệt kê danh sách Node kèm trạng thái và số lượng SNI.
  - Thêm mới Node và thêm/sửa/xóa các SNI Profile trực thuộc.
  - Bật / tắt trạng thái kích hoạt của Node.
  - Endpoint `GET /api/v1/admin/nodes/{id}/install-script` trả về script cài đặt tự động 1 lệnh cho VPS (chạy `xray-core` bằng Docker).
- [ ] Giao diện Quản lý Node trên Frontend:
  - Bảng danh sách Node kèm cờ quốc gia, IP, trạng thái, danh sách SNI tags.
  - Modal thêm/sửa Node với nút "Generate Reality Keys" tự động.
  - Modal quản lý các SNI Profile cho từng Node (thêm SNI mới, gán nhãn nhà mạng).
  - Nút sao chép "1-Line Setup Script" để paste vào terminal của VPS.

## Blocked by

- .scratch/core-mvp/issues/02-admin-auth-session.md
