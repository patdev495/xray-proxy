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
Cấu hình nhãn nhà mạng (Carrier) và tên miền SNI (kèm điểm đích `dest` ngụy trang tương ứng) trên Node, nhằm phục vụ cơ chế Zero-Rating / bỏ qua bóp băng thông cước di động khi SIM hết dung lượng tốc độ cao. Trong kiến trúc Reality, mỗi SNI Profile khác gốc chứng chỉ bắt buộc phải đi kèm với một Inbound hoặc cơ chế phân luồng SNI riêng biệt.
_Avoid_: Fake domain, arbitrary SNI, unverified bug host

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

**Plan**:
Bản thiết kế gói dịch vụ do Admin định nghĩa và quản lý (tên gói, giá cước, hạn mức Traffic Quota, số ngày hiệu lực, và danh sách các Region được phép áp dụng).
_Avoid_: Pricing package, product tier

**Region**:
Vùng địa lý hoặc quốc gia (ví dụ: Vietnam 🇻🇳, Singapore 🇸🇬, Japan 🇯🇵) gắn liền với mã quốc gia hoặc cờ hiệu (`flag`) của Node. Customer lựa chọn Region khi khởi tạo Subscription, Control Plane tự động ánh xạ và phân phối các Node thuộc Region đó.
_Avoid_: Location, country filter

**Order**:
Giao dịch mua mới hoặc gia hạn Subscription do Customer khởi tạo, được quản lý theo vòng đời trạng thái (`PENDING`, `PAID`, `CANCELLED`, `EXPIRED`) và mã đối soát thanh toán (VietQR / Webhook).
_Avoid_: Invoice, bill, payment record

**In-place Renewal**:
Cơ chế gia hạn Subscription trực tiếp trên bản ghi hiện tại (cộng thêm ngày hết hạn và cấp lại dung lượng mới) mà không thay đổi UUID và Subscription Token, đảm bảo Client App trên thiết bị người dùng tiếp tục hoạt động mà không cần cấu hình lại.
_Avoid_: Re-subscription, token refresh

**Node Capacity**:
Hạn mức số lượng Subscription tối đa mà một Node có thể tiếp nhận (`max_subscriptions`), do Admin cấu hình nhằm bảo vệ tài nguyên phần cứng và tránh nghẽn băng thông VPS.
_Avoid_: Node limit, max connections, bandwidth saturation

**Node Load Balancing**:
Thuật toán phân phối tải của Control Plane, tự động lựa chọn Node có số lượng Subscription đang hoạt động ít nhất (Least Subscriptions) trong một Region chưa chạm trần Node Capacity để gán cho Customer.
_Avoid_: Round-robin, random allocation

**Grace Period**:
Khoảng thời gian ân hạn (mặc định 3 ngày) sau khi Subscription hết hạn (`EXPIRED`), trong đó vị trí slot trên Node Capacity và cặp khóa UUID/Token vẫn được bảo lưu nhằm cho phép Customer thực hiện In-place Renewal mà không bị tranh chấp slot bởi người dùng mới.
_Avoid_: Extension window, buffer time

**Support Channel**:
Kênh liên hệ hỗ trợ trực tiếp (Telegram URL, Zalo URL) do Admin thiết lập linh hoạt trong Control Plane và hiển thị trên giao diện công khai và Customer Portal.
_Avoid_: Help desk, ticket system

**Node Switching**:
Tính năng tự phục vụ trên Customer Portal cho phép Customer chủ động chuyển đổi sang một Node khả dụng khác cùng Region khi Node hiện tại gặp sự cố hoặc suy giảm chất lượng mạng. Hệ thống giải phóng slot và gỡ UUID ở Node cũ, đăng ký sang Node mới qua gRPC mà giữ nguyên UUID và Subscription Token.
_Avoid_: Re-provisioning, manual re-assignment

## Relationships

- Một **Control Plane** quản lý nhiều **Node** qua **Xray gRPC Service**
- Mỗi **Node** được cấu hình một **Node Capacity** (`max_subscriptions`)
- **Admin** thiết lập và điều chỉnh các **Plan** cùng thông tin liên hệ **Support Channel**
- **Customer** tạo **Order** thanh toán để sở hữu một hoặc nhiều **Subscription**
- Mỗi **Subscription** thuộc về một **Customer** và được cấp phát dựa trên **Plan** và **Region** đã chọn
- **Control Plane** áp dụng **Node Load Balancing** để tự động phân phối Node tối ưu trong Region vào **Subscription**
- **Customer** có thể thực hiện **Node Switching** để đổi sang Node khác cùng Region khi cần
- Khi hết hạn, **Grace Period** bảo lưu slot của **Subscription** trên **Node** trong 3 ngày trước khi giải phóng hoàn toàn
- **In-place Renewal** gia hạn một **Subscription** mà không làm thay đổi Subscription Token hay Client App
- Quá trình **Node Sync** định kỳ cập nhật số liệu tiêu thụ vào **Traffic Quota** của từng **Subscription**
- Mỗi **Node** chạy một hoặc nhiều **Inbound** (VLESS-Reality)
- Một **Subscription** cung cấp thông tin kết nối tới các **Node** được phân phối cho một **Client App**
- Một **Subscription** bị kiểm soát bởi **Traffic Quota**

## Flagged ambiguities

- "VPS" thường bị dùng lẫn giữa máy chủ chạy web quản trị và máy chủ làm proxy — đã phân tách: Control Plane (Web) và Node (Proxy Xray).
- "3x-ui" bị nhầm là thành phần bắt buộc — đã làm rõ: Node chỉ cần chạy `xray-core` với gRPC API, Control Plane tự viết sẽ thay thế 3x-ui.
- "Gia hạn" dễ bị nhầm là tạo cấu hình mới — đã làm rõ với khái niệm In-place Renewal: giữ nguyên UUID/Token để người dùng không phải cài lại app.
- "Chọn Node" bị nhầm là việc của người dùng — đã làm rõ: Customer chỉ chọn Region, Control Plane tự động cân bằng tải Node (Node Load Balancing) dựa trên Node Capacity.
- "Node chết bị kẹt" — đã giải quyết bằng cơ chế Node Switching: đổi server ngay trong Portal, giữ nguyên UUID.
- "Thu hồi slot ngay khi hết hạn" — đã làm rõ bằng Grace Period: bảo lưu 3 ngày để người dùng cũ gia hạn mượt mà.
