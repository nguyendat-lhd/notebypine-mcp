# 🚀 Hướng dẫn Khởi động NoteByPine

## Khởi động Tất cả Services (Khuyến nghị)

Cách đơn giản nhất để khởi động tất cả services cùng lúc:

```bash
bun run start:all
```

Hoặc:

```bash
./scripts/start-all.sh
```

Script này sẽ tự động:
1. ✅ Khởi động PocketBase (port 8090)
2. ✅ Kiểm tra và setup database nếu cần
3. ✅ Khởi động API Server (port 3000) - **yêu cầu PocketBase phải chạy**
4. ✅ Khởi động Web Admin React (port 5173)

## Khởi động Từng Service Riêng Lẻ

### 1. PocketBase (Bắt buộc phải chạy trước)

```bash
# Terminal 1
bun run pb:serve
```

Hoặc:

```bash
./pocketbase serve --dir ./pb_data
```

**Lưu ý**: PocketBase phải chạy trước khi khởi động API Server.

### 2. API Server

```bash
# Terminal 2 (sau khi PocketBase đã chạy)
bun run start:api
```

Hoặc:

```bash
cd api
bun run dev
```

**Quan trọng**: 
- API Server **KHÔNG THỂ** khởi động nếu PocketBase chưa chạy
- Server sẽ tự động kiểm tra kết nối PocketBase và dừng nếu không kết nối được

### 3. Web Admin React

```bash
# Terminal 3
bun run start:web
```

Hoặc:

```bash
cd web-admin-react
bun run dev
```

## Kiểm tra Services

Sau khi khởi động, kiểm tra các services:

- **PocketBase**: http://localhost:8090
- **PocketBase Admin**: http://localhost:8090/_/
- **API Server**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **Web Admin**: http://localhost:5173

## Thông tin Đăng nhập

- **Email**: admin@example.com
- **Password**: admin123456

## Xử lý Lỗi

### Lỗi: "PocketBase connection failed"

**Nguyên nhân**: PocketBase chưa được khởi động hoặc không thể kết nối.

**Giải pháp**:
1. Kiểm tra PocketBase đã chạy: `curl http://localhost:8090/api/health`
2. Khởi động PocketBase: `bun run pb:serve`
3. Đợi vài giây để PocketBase khởi động hoàn toàn
4. Thử khởi động API Server lại

### Lỗi: "Port already in use"

**Nguyên nhân**: Port đã được sử dụng bởi process khác.

**Giải pháp**:
```bash
# Tìm process đang dùng port
lsof -i :8090  # PocketBase
lsof -i :3000  # API Server
lsof -i :5173  # Web Admin

# Dừng process
kill <PID>
```

### Lỗi: "Database connection required"

**Nguyên nhân**: API Server không thể kết nối với PocketBase.

**Giải pháp**:
1. Đảm bảo PocketBase đang chạy
2. Kiểm tra biến môi trường `POCKETBASE_URL` (mặc định: http://127.0.0.1:8090)
3. Kiểm tra credentials trong `.env` hoặc environment variables

## Log Files

Khi chạy `start-all.sh`, logs được lưu tại:

- PocketBase: `/tmp/pocketbase.log`
- API Server: `/tmp/api-server.log`
- Web Admin: `/tmp/web-admin.log`

Xem logs:

```bash
tail -f /tmp/pocketbase.log
tail -f /tmp/api-server.log
tail -f /tmp/web-admin.log
```

## Dừng Services

### Nếu chạy bằng `start-all.sh`:

Nhấn `Ctrl+C` để dừng tất cả services.

### Nếu chạy riêng lẻ:

Dừng từng process bằng `Ctrl+C` trong terminal tương ứng.

Hoặc tìm và kill process:

```bash
# Tìm PIDs
ps aux | grep pocketbase
ps aux | grep "bun.*api"
ps aux | grep "bun.*web-admin"

# Kill processes
kill <PID>
```

## Thứ tự Khởi động Quan trọng

⚠️ **QUAN TRỌNG**: Thứ tự khởi động phải đúng:

1. **PocketBase** (phải chạy đầu tiên)
2. **API Server** (yêu cầu PocketBase)
3. **Web Admin React** (yêu cầu API Server)

API Server sẽ **KHÔNG THỂ** khởi động nếu PocketBase chưa sẵn sàng.

## Environment Variables

### API Server (`api/.env`)

```env
PORT=3000
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=admin123456
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

### Web Admin React (`web-admin-react/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Troubleshooting

### Kiểm tra Services đang chạy

```bash
# Kiểm tra ports
lsof -i :8090  # PocketBase
lsof -i :3000  # API Server  
lsof -i :5173  # Web Admin

# Kiểm tra health endpoints
curl http://localhost:8090/api/health  # PocketBase
curl http://localhost:3000/health      # API Server
curl http://localhost:5173             # Web Admin
```

### Reset Database

Nếu cần reset database:

```bash
# Dừng PocketBase
# Xóa pb_data directory (backup trước!)
rm -rf pb_data

# Khởi động lại PocketBase
bun run pb:serve

# Setup lại database
bun run setup:pocketbase
```

---

**Lưu ý**: Luôn đảm bảo PocketBase chạy trước khi khởi động API Server!
