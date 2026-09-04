# 0008. Môi trường phát triển trên Windows và Triển khai Production bằng Docker trên VPS

Quy định rạch ròi giữa hai môi trường:
1. **Môi trường phát triển cục bộ (Local Development)**: Thực hiện trực tiếp trên hệ điều hành **Windows** để tối ưu tốc độ lập trình và phản hồi nhanh của HMR (Hot Module Replacement), không bắt buộc phải chạy Docker lúc code hàng ngày (Backend chạy bằng `uv run uvicorn`, Frontend chạy bằng `npm run dev`).
2. **Môi trường triển khai thực tế (Production Deployment)**: Triển khai lên một máy chủ **VPS Linux** duy nhất thông qua **Docker và Docker Compose**. Toàn bộ mã nguồn Backend (với image `ghcr.io/astral-sh/uv`), Frontend (Nginx static bundle), cơ sở dữ liệu SQLite và cấu hình mạng được đóng gói vào các container độc lập, cho phép đưa toàn bộ hệ thống lên production chỉ bằng lệnh `docker compose up -d --build`.
