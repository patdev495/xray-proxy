# 04-subscription-vless-client-bundle

Status: ready-for-agent

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng hệ thống quản lý Subscription và dịch vụ phát hành link cấu hình proxy dạng Base64 URI chuẩn VLESS-Reality, tương thích 100% với Shadowrocket và các ứng dụng client phổ biến.

Admin có thể tạo Subscription cho khách hàng (đặt tên khách, hạn mức GB, số ngày hết hạn), nhận đường dẫn Subscription bí mật (`/sub/{token}`). Khi khách dán link này vào Shadowrocket và bấm cập nhật, app sẽ tải về danh sách cấu hình kết nối VLESS-Reality tương ứng với tất cả các Node và SNI Profile đang hoạt động.

## Acceptance criteria

- [ ] Model `Subscription` trong cơ sở dữ liệu với token ngẫu nhiên bảo mật, `traffic_quota_bytes`, `traffic_used_bytes`, `expires_at`, `status` (ACTIVE, SUSPENDED, EXPIRED).
- [ ] Service `subscription_service.py` tạo chuỗi URL chuẩn VLESS-Reality:
  `vless://{uuid}@{host}:{port}?security=reality&encryption=none&pbk={public_key}&headerType=none&type=tcp&sni={sni}&sid={short_id}&fp=chrome#{remark}`
- [ ] Với mỗi Node có N SNI Profile, service sinh ra N dòng cấu hình VLESS tương ứng với nhãn rõ ràng (ví dụ: `🇯🇵 Tokyo 01 - Rakuten Bypass`, `🇯🇵 Tokyo 01 - SoftBank`).
- [ ] Endpoint công khai `GET /sub/{token}` trả về chuỗi Base64 hợp lệ, kèm HTTP header chuẩn (`profile-update-interval`, `subscription-userinfo`).
- [ ] Trang Quản lý Subscription trên Frontend:
  - Bảng danh sách Subscription (Tên khách hàng, Dung lượng đã dùng / Hạn mức, Ngày hết hạn, Trạng thái).
  - Nút Copy Subscription Link nhanh vào clipboard.
  - Nút Tạo mới Subscription, Gia hạn thêm ngày/dung lượng, và Khóa tài khoản tức thì.
- [ ] Unit test kiểm thử tính chính xác của format link VLESS và mã hóa Base64 cho Shadowrocket.

## Blocked by

- .scratch/core-mvp/issues/03-node-sni-management.md
