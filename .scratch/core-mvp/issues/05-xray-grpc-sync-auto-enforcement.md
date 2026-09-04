# 05-xray-grpc-sync-auto-enforcement

Status: ready-for-agent

## Parent

.scratch/core-mvp/PRD.md

## What to build

Xây dựng dịch vụ kết nối gRPC trực tiếp đến `xray-core` trên các Node, cơ chế đồng bộ lưu lượng định kỳ qua Background Task, và hệ thống tự động khóa tài khoản / ngắt kết nối khi hết hạn hoặc vượt hạn mức dung lượng.

Hệ thống tự động chạy tác vụ nền (Periodic Poller) gọi `StatsService` trên các Node để cập nhật số byte upload/download của từng UUID vào cơ sở dữ liệu. Nếu tài khoản vi phạm chính sách (quá hạn ngày hoặc vượt hạn mức GB), hệ thống chuyển trạng thái sang `SUSPENDED` và gửi lệnh gRPC `RemoveUser` sang tất cả các Node. Khi Admin gia hạn, hệ thống tự động gọi gRPC `AddUser` để mở lại kết nối tức thì.

## Acceptance criteria

- [ ] Module `xray_grpc_service.py` tích hợp client gRPC của Xray (HandlerService và StatsService) kết nối an toàn tới cổng API của Node.
- [ ] Hàm `sync_user_to_nodes(subscription)`: Tự động gửi lệnh `AddUser` thêm UUID khách hàng vào các Node đang hoạt động khi Subscription được tạo mới hoặc kích hoạt lại.
- [ ] Hàm `remove_user_from_nodes(subscription)`: Tự động gửi lệnh `RemoveUser` thu hồi UUID khỏi các Node khi Subscription bị khóa, hết hạn hoặc hết dung lượng.
- [ ] Background Task định kỳ (Poller service chạy mỗi 5 phút) quét toàn bộ subscription, lấy dung lượng thực tế qua `QueryStats`, cộng dồn vào database, và tự động xử lý khóa nếu vi phạm hạn mức.
- [ ] Nút "Sync Live Stats" và "Force Check Limits" trên Frontend để Admin có thể kích hoạt đồng bộ và kiểm tra trạng thái tức thì mà không cần chờ chu kỳ nền.
- [ ] Hiển thị thanh tiến trình dung lượng trực quan (đổi màu xanh -> vàng -> đỏ theo % sử dụng) trên bảng điều khiển.

## Blocked by

- .scratch/core-mvp/issues/04-subscription-vless-client-bundle.md
