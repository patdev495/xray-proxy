# 0001. Kiến trúc Control Plane tập trung và giao thức VLESS-Reality

Hệ thống `xray-proxy` tách biệt giữa **Control Plane** (FastAPI + React Dashboard) và **Node** (VPS chạy `xray-core` thuần kết nối qua gRPC), thay vì cài đặt 3x-ui nguyên khối trên từng VPS. Giao thức proxy chủ đạo là **VLESS-Reality** nhằm tối ưu hiệu năng, bảo mật tối đa, loại bỏ hoàn toàn chi phí mua tên miền/Cloudflare CDN, và cho phép giả lập SNI hợp lệ của các dịch vụ lớn tại Nhật (như Yahoo Japan, Apple, LINE) để vượt qua phân loại lưu lượng của nhà mạng.
