# 0005. Quản lý đa cấu hình SNI theo nhà mạng (Multi-Carrier Multi-Port Inbounds)

Mỗi Node cho phép cấu hình danh sách nhiều **SNI Profile** tương ứng với các nhà mạng di động mục tiêu (Docomo, SoftBank/Linemo, Viettel, VNPT...).

### Vấn đề kỹ thuật
Trong giao thức **VLESS-Reality**, máy chủ proxy mượn chứng chỉ TLS từ máy chủ đích (`dest`). Khi các tên miền thuộc các tổ chức khác nhau (ví dụ `images.apple.com` của Apple và `www.linemo.jp` của SoftBank), chúng có chứng chỉ SAN độc lập. Một Inbound Reality đơn lẻ không thể phục vụ nhiều chứng chỉ khác nhau cùng lúc mà không gây lỗi lệch chứng chỉ (TLS Certificate Mismatch) trên Client App.

### Quyết định kiến trúc (Multi-Port Inbound)
1. **Mỗi SNI Profile sở hữu 1 Inbound Port riêng**:
   - `Docomo (images.apple.com)`: Cổng 8443 -> `dest: images.apple.com:443`
   - `Linemo (www.linemo.jp)`: Cổng 8444 -> `dest: www.linemo.jp:443`
   - `Viettel (gateway.icloud.com)`: Cổng 8445 -> `dest: gateway.icloud.com:443`
2. **Cách ly an toàn cho VPS (Port Isolation)**:
   - Toàn bộ proxy chạy trên dải cổng cao độc lập (8443, 8444, 8445...), tuyệt đối không chạm vào cổng 80, 443 hay cổng cơ sở dữ liệu của các dịch vụ website đang chạy trên VPS.
3. **Đồng bộ tài khoản người dùng qua gRPC đa Inbound**:
   - Khi cấp phát hoặc thu hồi Subscription, Control Plane tự động đăng ký UUID của khách vào tất cả các tag Inbound (`vless-reality-{port}`) trên Node.
4. **Subscription Bundle đa cổng**:
   - Client App (Shadowrocket, v2rayNG...) tự động nhận các liên kết VLESS trỏ chính xác vào cổng của từng nhà mạng, cho phép người dùng chuyển mạng mượt mà chỉ bằng 1 chạm.
