# 0010. Kiến trúc Self-Service Customer Portal, Tự động Cân Bằng Tải Node và Thanh Toán VietQR

Hệ thống mở rộng từ mô hình nội bộ sang nền tảng bán gói cước proxy thương mại tự phục vụ (Self-Service) chuyên biệt cho nhu cầu **vượt bóp băng thông 4G (Zero-Rating SNI bypass)** qua **VLESS-Reality**.

### 1. Bối cảnh & Thách thức
Trước đây, hệ thống hoạt động ở chế độ Admin-Only (Admin trực tiếp gán Node và phát hành link Subscription cho từng người quen). Khi mở rộng thương mại công khai:
- Người dùng cần tự đăng ký tài khoản, chọn gói cước (Plan) theo nhu cầu và thanh toán tức thời.
- Việc để khách tự chọn từng VPS Node sẽ làm lộ hạ tầng và gây lệch tải nghiêm trọng (tập trung vào 1 Node gây sập VPS).
- Khách hàng không muốn mỗi tháng phải cài đặt lại link/QR trên app điện thoại (Shadowrocket/v2rayNG).
- Quản lý gian lận chia sẻ tài khoản trên mạng di động 4G nếu chặn IP đồng thời sẽ gây khóa nhầm khi điện thoại đổi trạm BTS.

### 2. Các Quyết định Kiến trúc

#### A. Kiến trúc Giao diện Single SPA & Phân quyền
- Mở rộng ứng dụng React hiện tại thành một Single SPA đồng nhất theo chuẩn thiết kế *Pristine Light*:
  - Trang chủ tối giản: Giới thiệu bảng giá các gói cước, nút Đăng ký/Đăng nhập và nút liên hệ Kênh hỗ trợ (Telegram/Zalo do Admin cấu hình).
  - Phân luồng điều hướng theo vai trò (`UserRole`): `ADMIN` truy cập `/admin`, `CUSTOMER` truy cập `/portal`.
  - Hỗ trợ đăng ký/đăng nhập bằng Username/Password và Google OAuth (với cơ chế graceful fallback tự ẩn nút khi chưa khai báo Google Client ID trong biến môi trường).

#### B. Phân phối Node tự động (Node Load Balancing & Node Capacity)
- **Node Capacity (`max_subscriptions`)**: Mỗi Node được Admin gán một hạn mức dung lượng số lượng subscription tối đa nhằm bảo vệ tài nguyên phần cứng và băng thông VPS.
- **Phân bổ theo Region**: Customer chỉ cần chọn Vùng quốc gia (Region: Việt Nam 🇻🇳, Singapore 🇸🇬, Nhật Bản 🇯🇵...).
- **Thuật toán Least Subscriptions**: Control Plane tự động lọc các Node đang hoạt động trong Region đó có `current_subs < max_subscriptions` và gán Node có số lượng sub thấp nhất cho Subscription mới của khách.
- **Trạng thái Hết chỗ (Sold Out)**: Nếu toàn bộ Node trong Region chạm ngưỡng `max_subscriptions`, hệ thống khóa chức năng mua vùng đó trên giao diện và hiển thị trạng thái "Hết chỗ".

#### C. Gia hạn tại chỗ (In-place Renewal) & Thời gian ân hạn (Grace Period)
- Khi khách gia hạn hoặc mua thêm thời hạn cho Subscription, hệ thống giữ nguyên UUID và Subscription Token, chỉ cộng dồn thời hạn hết hạn (`expires_at`) và làm mới Traffic Quota. Khách hàng không cần phải cấu hình lại app.
- Áp dụng **Grace Period (3 ngày)** sau khi hết hạn: Node vẫn bảo lưu vị trí slot và cặp khóa UUID của khách, tránh việc bị khách mới tranh chấp slot và giúp khách cũ gia hạn thông suốt. Sau 3 ngày nếu không gia hạn, hệ thống mới giải phóng slot trên Node.

#### D. Kiểm soát Lạm dụng & Giới hạn Băng thông
- Áp dụng chính sách Fair Usage Policy (FUP) hoàn toàn dựa trên **Traffic Quota** (tổng dung lượng GB cấp theo gói).
- Không chặn số lượng IP đồng thời để tránh lỗi nhận diện nhầm trên mạng di động 4G. Khi vượt quá Quota, cơ chế Node Sync tự động suspend kết nối qua gRPC.

#### E. Thanh toán Tự động VietQR & Xử lý Ngoại lệ
- Khách đặt mua gói -> Hệ thống tạo `Order` (mã `ORD-XXXX`) và hiển thị mã QR thanh toán VietQR với nội dung chuyển khoản là mã đơn hàng.
- Tích hợp SePay Webhook để đối soát tự động và kích hoạt Subscription ngay lập tức (3-5 giây).
- Trang Admin cung cấp bảng điều khiển Đơn hàng với nút "Xác nhận thanh toán thủ công" dự phòng cho các trường hợp khách gõ sai cú pháp chuyển tiền.

#### F. Cơ chế Đổi Node Tự Phục Vụ (Node Switching Self-Healing)
- Giải quyết bài toán VPS chết hoặc mạng lag mà không phá vỡ mô hình Node Capacity:
- Customer Portal cung cấp nút "Đổi Server": Liệt kê các Node khả dụng khác trong cùng Region (còn slot `active_subs < max_subscriptions`).
- Khách xác nhận đổi: Backend gọi gRPC xóa UUID khỏi Node cũ, nạp UUID vào Node mới, cập nhật liên kết Subscription.
- Giữ nguyên UUID và Token: Khách chỉ cần bấm "Cập nhật gói" trên Shadowrocket/v2rayNG là kết nối thông suốt với máy chủ mới.
