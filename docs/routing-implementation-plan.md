# Kế hoạch triển khai Routing với URL riêng cho từng trang

## Tổng quan

Hiện tại ứng dụng React đang sử dụng state-based navigation (`currentPage` state), không có URL routing. Cần chuyển sang sử dụng React Router để mỗi trang có URL riêng.

## Mục tiêu

1. ✅ Mỗi trang có URL riêng (ví dụ: `/dashboard`, `/incidents`, `/solutions`)
2. ✅ URL thay đổi khi điều hướng giữa các trang
3. ✅ Có thể bookmark và chia sẻ URL
4. ✅ Browser back/forward buttons hoạt động đúng
5. ✅ Redirect tự động khi chưa đăng nhập

## Các bước triển khai

### Bước 1: Cài đặt React Router DOM

```bash
cd web-admin-react
bun add react-router-dom
bun add -d @types/react-router-dom
```

### Bước 2: Cấu trúc Routes

Tạo mapping giữa `PageType` và URL paths:

- `dashboard` → `/` hoặc `/dashboard`
- `incidents` → `/incidents`
- `solutions` → `/solutions`
- `knowledge` → `/knowledge`
- `chat` → `/chat`
- `settings` → `/settings`

### Bước 3: Cập nhật App.tsx

**Thay đổi chính:**
- Thay thế `useState<PageType>` bằng React Router
- Sử dụng `BrowserRouter`, `Routes`, `Route`
- Tạo `ProtectedRoute` component để bảo vệ các route cần authentication
- Sử dụng `useNavigate` và `useLocation` hooks

**Cấu trúc mới:**
```typescript
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginForm />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/incidents" element={<Layout><IncidentsPage /></Layout>} />
      <Route path="/solutions" element={<Layout><SolutionsPage /></Layout>} />
      <Route path="/knowledge" element={<Layout><KnowledgePage /></Layout>} />
      <Route path="/chat" element={<Layout><ChatPage /></Layout>} />
      <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
    </Route>
  </Routes>
</BrowserRouter>
```

### Bước 4: Tạo ProtectedRoute Component

Component này sẽ:
- Kiểm tra authentication status
- Redirect về `/login` nếu chưa đăng nhập
- Render children nếu đã đăng nhập

### Bước 5: Cập nhật Layout.tsx

**Thay đổi:**
- Loại bỏ prop `currentPage` và `onNavigate`
- Sử dụng `useLocation` để xác định trang hiện tại từ URL
- Tạo helper function để map URL path → PageType

### Bước 6: Cập nhật Sidebar.tsx

**Thay đổi:**
- Thay thế `Button` với `onClick` bằng `Link` component từ React Router
- Sử dụng `NavLink` để highlight active route
- Loại bỏ prop `onNavigate`
- Sử dụng `useLocation` để xác định active page

**Mapping URLs:**
```typescript
const pageToPath: Record<PageType, string> = {
  dashboard: '/dashboard',
  incidents: '/incidents',
  solutions: '/solutions',
  knowledge: '/knowledge',
  chat: '/chat',
  settings: '/settings',
};
```

### Bước 7: Cập nhật LoginForm

**Thay đổi:**
- Sau khi login thành công, redirect đến `/dashboard` thay vì callback
- Sử dụng `useNavigate` hook

### Bước 8: Xử lý Redirect sau Login

- Nếu user truy cập trực tiếp URL khi chưa login → redirect về `/login`
- Sau khi login thành công → redirect về URL ban đầu hoặc `/dashboard`
- Nếu đã login và truy cập `/login` → redirect về `/dashboard`

### Bước 9: Tạo các Page Components riêng (nếu cần)

Tách các inline page components trong `renderCurrentPage()` thành các file riêng:
- `KnowledgePage.tsx`
- `ChatPage.tsx`
- `SettingsPage.tsx`

### Bước 10: Cập nhật Vite Config (nếu cần)

Đảm bảo Vite config hỗ trợ SPA routing:
```typescript
// vite.config.ts
export default {
  // ... existing config
  server: {
    // ... existing config
  },
  // Đảm bảo fallback về index.html cho client-side routing
}
```

## Chi tiết kỹ thuật

### ProtectedRoute Component

```typescript
// components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import apiService from '@/services/api';

export const ProtectedRoute = () => {
  const isAuthenticated = apiService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};
```

### URL Path Mapping

```typescript
// utils/routes.ts
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INCIDENTS: '/incidents',
  SOLUTIONS: '/solutions',
  KNOWLEDGE: '/knowledge',
  CHAT: '/chat',
  SETTINGS: '/settings',
} as const;

export const pageToPath: Record<PageType, string> = {
  dashboard: ROUTES.DASHBOARD,
  incidents: ROUTES.INCIDENTS,
  solutions: ROUTES.SOLUTIONS,
  knowledge: ROUTES.KNOWLEDGE,
  chat: ROUTES.CHAT,
  settings: ROUTES.SETTINGS,
};

export const pathToPage = (path: string): PageType | null => {
  const entry = Object.entries(pageToPath).find(([_, routePath]) => 
    routePath === path || (path === '/' && routePath === ROUTES.DASHBOARD)
  );
  return entry ? (entry[0] as PageType) : null;
};
```

## Testing Checklist

- [ ] Truy cập `/dashboard` khi chưa login → redirect về `/login`
- [ ] Login thành công → redirect về `/dashboard`
- [ ] Click vào menu items → URL thay đổi đúng
- [ ] Browser back/forward buttons hoạt động
- [ ] Bookmark URL và reload → hiển thị đúng trang
- [ ] Truy cập URL không tồn tại → hiển thị 404 hoặc redirect về dashboard
- [ ] Active state của menu item highlight đúng theo URL hiện tại

## Migration Notes

### Breaking Changes
- Props `currentPage` và `onNavigate` sẽ bị loại bỏ khỏi Layout và Sidebar
- Cần cập nhật tất cả nơi sử dụng navigation

### Backward Compatibility
- Giữ nguyên logic authentication
- Giữ nguyên UI/UX hiện tại
- Chỉ thay đổi cách điều hướng

## Ưu tiên triển khai

1. **High Priority:**
   - Cài đặt React Router
   - Cập nhật App.tsx với routing cơ bản
   - Cập nhật Sidebar với Link components
   - ProtectedRoute component

2. **Medium Priority:**
   - Tách các page components
   - Xử lý redirect sau login
   - URL path mapping utilities

3. **Low Priority:**
   - 404 page
   - Route guards nâng cao
   - URL query parameters support

## Timeline ước tính

- Bước 1-3: 30 phút
- Bước 4-6: 45 phút
- Bước 7-8: 30 phút
- Bước 9-10: 30 phút
- Testing: 30 phút

**Tổng cộng: ~2.5 giờ**

