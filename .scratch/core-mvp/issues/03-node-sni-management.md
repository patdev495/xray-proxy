# 03-node-sni-management

Status: done

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng tính năng quản lý Node proxy và cấu hình đa SNI Profile linh hoạt theo từng nhà mạng/quốc gia, kèm theo bộ sinh cấu hình cài đặt Node (1-line script / Docker compose).

Admin có thể quản lý danh sách Node VPS (tên node, IP, cổng kết nối, cổng gRPC, Reality public/private key), gắn thêm nhiều SNI Profile tùy biến cho mỗi Node (ví dụ: Rakuten, SoftBank, Docomo, Viettel, Apple...), và tải/sao chép script cài đặt để triển khai nhanh lên VPS mới.

## Acceptance criteria

- [x] Model `Node` và `SniProfile` trong cơ sở dữ liệu với quan hệ 1-N (Một Node có nhiều SNI Profile).
- [x] Tính năng tự động sinh Reality X25519 Keypair (public key, private key, short id) ngẫu nhiên nếu Admin không nhập thủ công.
- [x] API endpoints đầy đủ tại `/api/v1/admin/nodes` hỗ trợ:
  - Liệt kê danh sách Node kèm trạng thái và số lượng SNI.
  - Thêm mới Node và thêm/sửa/xóa các SNI Profile trực thuộc.
  - Bật / tắt trạng thái kích hoạt của Node.
  - Endpoint `GET /api/v1/admin/nodes/{id}/install-script` trả về script cài đặt tự động 1 lệnh cho VPS (chạy `xray-core` bằng Docker).
- [x] Giao diện Quản lý Node trên Frontend:
  - Bảng danh sách Node kèm cờ quốc gia, IP, trạng thái, danh sách SNI tags.
  - Modal thêm/sửa Node với nút "Generate Reality Keys" tự động.
  - Modal quản lý các SNI Profile cho từng Node (thêm SNI mới, gán nhãn nhà mạng).
  - Nút sao chép "1-Line Setup Script" để paste vào terminal của VPS.

## Blocked by

- .scratch/core-mvp/issues/02-admin-auth-session.md

## Comments

> *This was completed by AI using TDD & Caveman.*
- Triển khai TDD: test_generate_reality_keypair, test_generate_reality_keys_endpoint, test_create_node_with_auto_generated_keys, test_node_crud_and_status_toggle, test_sni_profile_crud, test_get_node_install_script.
- Backend:
  - Models `Node` và `SniProfile` (`backend/app/models/node.py`).
  - Cryptography Reality X25519 keypair generator (`backend/app/services/reality_service.py`).
  - CRUD Node, SNI, Docker setup script generator (`backend/app/services/node_service.py`).
  - Endpoints RESTful tại `/api/v1/admin/nodes` (`backend/app/api/v1/nodes.py`).
- Frontend:
  - TypeScript types (`frontend/src/types/node.ts`).
  - API Client methods (`frontend/src/services/apiClient.ts`).
  - `NodesTab.tsx`: Bảng quản trị Node, Slide-over sheet tạo node có auto-generate keys, Modal quản lý carrier SNIs, Modal xem & copy 1-line Docker VPS script.
- 11/11 tests pass (`uv run pytest`), mypy 27 files pass clean, frontend build production thành công.
