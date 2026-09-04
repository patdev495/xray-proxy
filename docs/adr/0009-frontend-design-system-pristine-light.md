# 0009. Chuẩn thiết kế giao diện Frontend ProMax Pristine Light (Anti-AI Slop)

Hệ thống frontend của **Control Plane** chuẩn hóa theo phong cách **Pristine Light** (lấy cảm hứng từ Linear, Stripe, Raycast), loại bỏ triệt để các phong cách giao diện tối nhòe và neon glow thường gặp của AI (AI slop: nền đen `#0b0f19`, frosted glassmorphism nặng, viền đổ bóng neon tím/xanh phát sáng).

### Quyết định kỹ thuật:
1. **Bảng màu & Tương phản**: Canvas nền `slate-50` / `zinc-50`, thẻ nội dung `white`, viền hairline sắc sảo 1px `border-slate-200/80`. Tiêu đề chữ `text-slate-900` tương phản cao, nút hành động chính (Primary Action) dạng khối đậm `bg-slate-900` hoặc deep navy.
2. **Hiệu ứng & Đổ bóng**: Sử dụng bóng mờ tự nhiên tinh tế (`shadow-xs`, `shadow-sm`), cấm tuyệt đối các class hiệu ứng neon phát sáng (`glow-*`) hoặc làm mờ kính che khuất dữ liệu.
3. **Typography & Dữ liệu**: Font Inter/Geist không chân hiện đại; toàn bộ số liệu IP, Port, Token và dung lượng băng thông bắt buộc dùng `font-mono` hoặc `tabular-nums` để đối soát dễ dàng.
4. **Nhất quán phiên làm việc**: Toàn bộ các Agent trong tương lai bắt buộc tuân thủ quy chuẩn này trong `AGENTS.md` khi xây dựng hoặc cập nhật bất kỳ component giao diện nào.
