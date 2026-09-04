# 04-subscription-vless-client-bundle

Status: done

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng hệ thống quản lý Subscription và dịch vụ phát hành link cấu hình proxy dạng Base64 URI chuẩn VLESS-Reality, tương thích 100% với Shadowrocket và các ứng dụng client phổ biến.

Admin có thể tạo Subscription cho khách hàng (đặt tên khách, hạn mức GB, số ngày hết hạn), nhận đường dẫn Subscription bí mật (`/sub/{token}`). Khi khách dán link này vào Shadowrocket và bấm cập nhật, app sẽ tải về danh sách cấu hình kết nối VLESS-Reality tương ứng với tất cả các Node và SNI Profile đang hoạt động.

## Acceptance criteria

- [x] Model `Subscription` trong cơ sở dữ liệu với token ngẫu nhiên bảo mật, `traffic_quota_bytes`, `traffic_used_bytes`, `expires_at`, `status` (ACTIVE, SUSPENDED, EXPIRED).
- [x] Service `subscription_service.py` tạo chuỗi URL chuẩn VLESS-Reality:
  `vless://{uuid}@{host}:{port}?security=reality&encryption=none&pbk={public_key}&headerType=none&type=tcp&sni={sni}&sid={short_id}&fp=chrome#{remark}`
- [x] Với mỗi Node có N SNI Profile, service sinh ra N dòng cấu hình VLESS tương ứng với nhãn rõ ràng (ví dụ: `🇯🇵 Tokyo 01 - Rakuten Bypass`, `🇯🇵 Tokyo 01 - SoftBank`).
- [x] Endpoint công khai `GET /sub/{token}` trả về chuỗi Base64 hợp lệ, kèm HTTP header chuẩn (`profile-update-interval`, `subscription-userinfo`).
- [x] Trang Quản lý Subscription trên Frontend:
  - Bảng danh sách Subscription (Tên khách hàng, Dung lượng đã dùng / Hạn mức, Ngày hết hạn, Trạng thái).
  - Nút Copy Subscription Link nhanh vào clipboard.
  - Nút Tạo mới Subscription, Gia hạn thêm ngày/dung lượng, và Khóa tài khoản tức thì.
- [x] Unit test kiểm thử tính chính xác của format link VLESS và mã hóa Base64 cho Shadowrocket.

## Blocked by

- .scratch/core-mvp/issues/03-node-sni-management.md

## Comments

> *This was completed by AI using TDD & Caveman.*
- Triển khai TDD: test_build_vless_link, test_build_subscription_bundle, test_create_and_list_subscription, test_public_subscription_endpoint, test_subscription_lifecycle_crud_and_suspend.
- Backend:
  - Model `Subscription` (`backend/app/models/subscription.py`) kèm `SubscriptionStatus` (ACTIVE, SUSPENDED, EXPIRED).
  - Generator VLESS URL & Base64 bundle generator (`backend/app/services/subscription_service.py`).
  - Endpoint công khai `GET /sub/{token}` trả về Base64 text/plain cùng `Subscription-Userinfo` và `Profile-Update-Interval` headers (`backend/app/api/v1/public_sub.py`).
  - Admin CRUD endpoints tại `/api/v1/admin/subscriptions` (`backend/app/api/v1/subscriptions.py`).
- Frontend:
  - TypeScript types (`frontend/src/types/subscription.ts`).
  - API Client methods (`frontend/src/services/apiClient.ts`).
  - `SubscriptionsTab.tsx`: Bảng quản lý Subscription, thanh tiến trình quota băng thông, nút sao chép link, Modal hiển thị QR Code để quét trực tiếp từ Shadowrocket camera, Modal gia hạn thêm ngày/dung lượng, nút khóa/mở khóa tức thì.
- 16/16 backend tests pass, mypy 33 files clean, frontend build production thành công.
