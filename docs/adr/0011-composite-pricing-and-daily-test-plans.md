# 0011. Định Giá Kép (Composite Pricing) Cho Gói Cước và Kiểm Soát Tài Nguyên Gói Ngày Dùng Thử

Quyết định kiến trúc cho phép hỗ trợ song song hai chu kỳ cước (Tháng chính thức và Ngày dùng thử) trên cùng một thực thể `Plan`, đồng thời áp dụng chính sách giải phóng tài nguyên tức thời để bảo vệ Node Capacity.

### 1. Bối cảnh & Thách thức
- **Nhu cầu dùng thử (Test)**: Khách hàng mới cần kiểm tra độ ổn định của đường truyền 4G Zero-Rating SNI bypass trước khi cam kết mua gói dài hạn (ví dụ gói dùng thử 1 ngày: 3.000đ / 6GB so với gói tháng: 50.000đ / 200GB).
- **Trải nghiệm Admin**: Nếu chia thành hai Plan độc lập cho mỗi gói cước, Admin phải cấu hình và bảo trì trùng lặp thông tin (tên gói, vùng Region, mô tả) hai lần mỗi khi tạo hoặc cập nhật gói mới.
- **Nguy cơ cạn kiệt Node Capacity (The 1-Day Grace Period Bottleneck)**:
  - Theo ADR 0010, gói hết hạn được bảo lưu vị trí slot trên Node trong 3 ngày (Grace Period).
  - Nếu áp dụng nguyên vẹn Grace Period 3 ngày cho gói 1 ngày 3.000đ: Một khách chỉ trả 3.000đ nhưng sẽ chiếm giữ 1 slot Node trong 4 ngày (1 ngày sử dụng + 3 ngày ân hạn).
  - Hậu quả: Node nhanh chóng chạm trần `max_subscriptions`, gây "cháy hàng ảo" (Sold Out) và chặn đứng các khách hàng tiềm năng mua gói tháng 50.000đ.

### 2. Các Quyết định Kiến trúc

#### A. Định Giá Kép Trên Cùng Một Bản Ghi Plan (Composite Pricing)
- Không tạo các Plan rời rạc. Bản ghi `Plan` tích hợp trực tiếp thông số cho hai chu kỳ:
  - **Chu kỳ Tháng (`MONTHLY`)**: Bắt buộc có `price_monthly_vnd` (vd 50.000đ), `quota_monthly_bytes` (vd 200GB), thời hạn cố định 30 ngày.
  - **Chu kỳ Ngày (`DAILY`)**: Tùy chọn kích hoạt qua cờ `enable_daily` (boolean), đi kèm `price_daily_vnd` (vd 3.000đ), `quota_daily_bytes` (vd 6GB), thời hạn cố định đúng 24 giờ.
- **Admin Portal**: 1 Form duy nhất khi tạo/sửa gói cước. Admin có thể chủ động bật hoặc tắt tùy chọn bán gói ngày cho từng gói riêng biệt.
- **Storefront**: Mỗi thẻ Plan hiển thị bộ chuyển đổi chu kỳ (`[30 Ngày - 50.000đ]` / `[1 Ngày - 3.000đ]`).

#### B. Kiểm Soát Vòng Đời & Thu Hồi Slot Tức Thời Cho Gói 1 Ngày (Zero Grace Period)
- **Hiệu lực chuẩn xác 24 giờ**: `expires_at = payment_time + timedelta(hours=24)`.
- **Không áp dụng Grace Period (0 ngày)**:
  - Công thức tính slot Node Capacity: Chỉ gói `MONTHLY` mới được tính thêm 3 ngày ân hạn sau khi hết hạn (`expires_at + 3 days`).
  - Gói `DAILY` ngay khi chạm mốc `expires_at < now`: Slot trên Node được giải phóng ngay lập tức (`available_slots` tăng lại ngay), không chiếm dụng vị trí của khách mới.
  - Node Sync tự động gỡ user khỏi Node qua gRPC ngay khi hết 24 giờ hoặc vượt quá Quota ngày (6GB).

#### C. Chính Sách Gia Hạn & Nâng Cấp (Upgrade Path)
- **Gói 1 ngày không hỗ trợ In-place Renewal**:
  - Không cho phép gia hạn gói 1 ngày liên tiếp để ngăn ngừa hành vi cày cuốc proxy giá rẻ ngắn hạn gây biến động tải Node.
  - Trên Customer Portal (`/portal`), Subscription chu kỳ `DAILY` hiển thị nhãn `Gói ngày (Dùng thử)` và ẩn nút "Gia hạn".
- **Đường dẫn nâng cấp (Upgrade Path)**:
  - Thay thế nút Gia hạn bằng nút "Nâng cấp gói tháng", điều hướng khách về Cửa hàng chọn gói tháng chính thức để khởi tạo Subscription ổn định dài hạn.
  - In-place Renewal tiếp tục áp dụng độc quyền cho các Subscription chu kỳ `MONTHLY`.

#### D. Kiểm Soát Đơn Hàng & Chống Spam
- Mỗi khách hàng chỉ được có tối đa 1 đơn `PENDING` chưa thanh toán tại một thời điểm (hủy đơn cũ khi tạo đơn mới).
- Không giới hạn số lần mua gói ngày vì đơn giá theo ngày (3k/ngày = 90k/tháng) đắt hơn đáng kể so với gói tháng (50k/tháng), đảm bảo tính kinh tế cho nhà vận hành.
