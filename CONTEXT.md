# xray-proxy

Hệ thống quản lý dịch vụ proxy tập trung (Control Plane) điều khiển các node VPS chạy nhân Xray và phân phối cấu hình kết nối (Subscription) cho người dùng cuối.

## Language

**Control Plane**:
Hệ thống quản trị trung tâm (FastAPI backend + React frontend) chịu trách nhiệm quản lý người dùng, gói cước, node và phân phối subscription.
_Avoid_: Master server, main site

**Admin**:
Người quản trị hệ thống có toàn quyền thêm/xóa Node, khởi tạo và điều chỉnh Subscription, thiết lập hạn mức dung lượng.
_Avoid_: Superuser, root

**Customer**:
Người dùng cuối sử dụng dịch vụ thông qua Subscription. Trong giai đoạn đầu được quản lý trực tiếp bởi Admin, mô hình dữ liệu sẵn sàng mở rộng cổng tự phục vụ.
_Avoid_: User, member, client

**Subscription**:
Cấu hình liên kết gồm các node proxy, hạn mức dung lượng và ngày hết hạn, được cấp cho một Customer cụ thể.
_Avoid_: Config link, proxy link, sub URL

**Subscription Token**:
Khóa bảo mật ngẫu nhiên trong đường dẫn Subscription URL, cho phép Client App tải về danh sách cấu hình mà không cần lộ mật khẩu tài khoản.
_Avoid_: Secret key, access token

**Client App**:
Ứng dụng proxy trên thiết bị người dùng cuối (ví dụ Shadowrocket trên iOS, v2rayNG trên Android, Clash).
_Avoid_: Phone app, client software

**Node**:
Một máy chủ VPS từ xa đặt tại bất kỳ quốc gia nào (Nhật Bản, Việt Nam, Singapore, Mỹ...) chỉ chạy nhân `xray-core` và mở cổng điều khiển gRPC, không chạy giao diện web.
_Avoid_: Server, proxy host, worker

**Inbound**:
Cổng tiếp nhận kết nối proxy trên Node, sử dụng giao thức VLESS kết hợp Reality để che giấu lưu lượng.
_Avoid_: Port, listener

**SNI Profile**:
Cấu hình nhãn hiển thị và tên miền SNI tùy biến trên Node, cho phép Admin tự do khai báo bất kỳ tên miền nào (nhằm tối ưu DPI theo từng nhà mạng ở bất kỳ quốc gia nào, hoặc cho mục đích vượt tường lửa, ẩn danh).
_Avoid_: Fake domain, bug host

**Subscription Bundle**:
Tập hợp danh sách các kết nối đại diện cho từng Node và các SNI Profile tương ứng, được định dạng chuẩn (Base64 URL) để Client App tự động cập nhật.
_Avoid_: Config list, proxy list

**Traffic Quota**:
Hạn mức dung lượng băng thông (GB) được cấp cho một tài khoản trong chu kỳ sử dụng.
_Avoid_: Data limit, bandwidth cap

**Xray gRPC Service**:
Giao diện API chuẩn của `xray-core` (HandlerService và StatsService) chạy trên Node, cho phép thêm/xóa user và truy vấn số liệu băng thông theo thời gian thực.
_Avoid_: Xray API, remote controller

**Node Sync**:
Cơ chế đồng bộ trực tiếp qua gRPC giữa Control Plane và các Node để cập nhật danh sách người dùng và đối soát dung lượng định kỳ.
_Avoid_: Background sync, cron updater

## Relationships

- Một **Control Plane** quản lý nhiều **Node** qua **Xray gRPC Service**
- Quá trình **Node Sync** định kỳ cập nhật số liệu tiêu thụ vào **Traffic Quota** của từng **Subscription**
- Mỗi **Node** chạy một hoặc nhiều **Inbound** (VLESS-Reality)
- Một **Subscription** cung cấp thông tin kết nối tới một hoặc nhiều **Node** cho một **Client App**
- Một **Subscription** bị kiểm soát bởi **Traffic Quota**

## Flagged ambiguities

- "VPS" thường bị dùng lẫn giữa máy chủ chạy web quản trị và máy chủ làm proxy — đã phân tách: Control Plane (Web) và Node (Proxy Xray).
- "3x-ui" bị nhầm là thành phần bắt buộc — đã làm rõ: Node chỉ cần chạy `xray-core` với gRPC API, Control Plane tự viết sẽ thay thế 3x-ui.
