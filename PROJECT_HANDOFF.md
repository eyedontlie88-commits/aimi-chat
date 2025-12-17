# 🧠 PROJECT MAP – ALMI CHAT

> Handover document cho AI dev buddy. Đọc kỹ trước khi code.

---

## 1️⃣ TỔNG QUAN

**Almi Chat** = Web app mô phỏng AI companion / AI lover (Next.js 14 App Router)

### Hai mode hoạt động:
| Mode | Mục đích |
|------|----------|
| **User** | Bị giới hạn (tương lai có ads/monetization) |
| **Dev** | Bypass toàn bộ để test & debug nhanh |

> ⚠️ **QUAN TRỌNG**: Dev & User dùng chung database, chỉ khác role & logic xử lý.

---

## 2️⃣ SƠ ĐỒ KỸ THUẬT

```
[ Browser (Client) ]
        |
        | authFetch (Bearer Token)
        v
[ Next.js API Routes ]
        |
        | Prisma
        v
[ PostgreSQL (Supabase) ]
```

### Auth Flow:
```
Firebase Auth (Client)
   ↓ getIdToken()
Authorization: Bearer <token>
   ↓
Next.js API → getAuthContext()
```

---

## 3️⃣ CẤU TRÚC THƯ MỤC

### 📁 app/
| Path | Chức năng |
|------|-----------|
| `layout.tsx` | Root layout với `#viewport-wrapper` và `#app-root` |
| `characters/` | Danh sách + chi tiết nhân vật |
| `chat/[characterId]/` | **Trang chat chính** – CỰC KỲ NHẠY layout |

### 📁 components/
| File | Ghi chú |
|------|---------|
| `ViewportSimulator.tsx` | Giả lập device (Desktop/Realme 10) – CHỈ test |
| `Character*.tsx` | Card, Form, Settings, Modal |
| `MessageBubble.tsx` | Bubble chat với responsive width |
| `*Modal.tsx` | **PHẢI dùng `absolute`, KHÔNG `fixed`** |

---

## 4️⃣ NGUYÊN TẮC AUTH

### ❌ TUYỆT ĐỐI KHÔNG:
- `fetch()` trực tiếp tới API cần auth
- Fetch API auth-required trong Server Component

### ✅ LUÔN DÙNG:
```typescript
import { authFetch, authFetchJson } from '@/lib/firebase/auth-fetch'

// Trong Client Component + useEffect
const res = await authFetch('/api/characters')
const data = await authFetchJson<T>('/api/user-profile')
```

> 📌 **Lý do**: `getIdToken()` đã được fix để chờ `onAuthStateChanged`, tránh request guest nhầm.

---

## 5️⃣ LUỒNG CHAT

```
User opens chat page
   ↓
Load: profile, character, messages, memories
   ↓
User sends message
   ↓
POST /api/chat → LLM Router → Response
   ↓
Save message + update relationship
```

### ⚠️ API có thể trả thiếu field:
```typescript
// LUÔN dùng default value
setMessages(data.messages || [])
setMemories(data.memories || [])
```

---

## 6️⃣ LAYOUT RULES

### ❌ SAI:
- Nhét UI desktop vào khung Android rồi kéo ngang
- Dùng `fixed` trong modal/overlay

### ✅ ĐÚNG:
- Desktop UI giữ nguyên
- Android UI: **Không scroll ngang, chỉ scroll dọc**
- Simulator chỉ là khung test, KHÔNG phải giải pháp layout

---

## 7️⃣ LỖI ĐÃ GẶP (KHÔNG TÁI PHẠM)

| Lỗi | Nguyên nhân |
|-----|-------------|
| Auth rơi về guest (uid=me) | Dùng `fetch()` thay vì `authFetch()` |
| Crash `.length` undefined | Không có default `|| []` |
| Tràn khung simulator | Dùng `fixed` + `w-screen` |
| Modal vượt viewport | `fixed` thay vì `absolute` |
| Horizontal scroll trên Android | `max-w-[480px]` không responsive |

---

## 8️⃣ TRẠNG THÁI HIỆN TẠI

| Mục | Status |
|-----|--------|
| Auth | ✅ Ổn |
| Chat | ✅ Hoạt động |
| Crash | ✅ Không còn |
| Layout | 🟡 Giai đoạn 1 – nền tảng |
| Mobile UI redesign | ❌ CHƯA làm |

> ⚠️ **Không được tự ý nhảy sang giai đoạn 2+**

---

## 9️⃣ CÁCH LÀM VIỆC

### ✅ LUÔN:
- Nói rõ đang ở **giai đoạn mấy**
- Đề xuất **1 bước tiếp theo**

### ❌ KHÔNG:
- Over-engineering
- Rewrite kiến trúc
- Thiết kế cho "sau này" khi chưa hỏi

---

## 🔚 KẾT

> "Mục tiêu là **tiếp nối, không phá**.
> Ưu tiên fix nhỏ – thấy kết quả ngay – không tạo thêm rủi ro."
