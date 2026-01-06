# ⚠️ Important Note: Prisma and Mobile Apps

## Prisma Does NOT Work in Mobile Apps

**Prisma Client requires Node.js** and cannot run directly in React Native/Capacitor mobile apps.

### Why?
- Prisma Client is a Node.js library
- Mobile apps run JavaScript in a WebView (not Node.js)
- Database connections require native Node.js modules

### Your App Architecture
Your "Aimi Chat" app is a **Capacitor app** that:
1. Loads a web interface (Next.js) in a WebView
2. Makes API calls to a **backend server** (Vercel deployment)
3. The backend server uses Prisma to connect to PostgreSQL

### What This Means
✅ **Web version** (Vercel): Prisma works - runs on server
✅ **Android/iOS app**: Must call API endpoints - Prisma on server only
❌ **Android/iOS app**: Cannot use Prisma directly

### Correct Setup for Android

#### capacitor.config.ts - Production
```typescript
server: {
  url: 'https://aimi-chat-yig9.vercel.app', // Your Vercel backend
  cleartext: true
}
```

#### capacitor.config.ts - Local Development
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:3000', // Your local Next.js dev server
  cleartext: true
}
// Note: Use your computer's IP address, not localhost
// Run 'ipconfig' to find your IP (e.g., 192.168.1.100)
```

### Database Access Flow

```
Android App (WebView)
    ↓ HTTPS Request
Backend API (Vercel/Local)
    ↓ Prisma Client
PostgreSQL Database
```

### Environment Variables

**Mobile app does NOT need:**
- ❌ DATABASE_URL
- ❌ DIRECT_URL
- ❌ Prisma environment variables

**Mobile app DOES need:**
- ✅ NEXT_PUBLIC_FIREBASE_* (client-side auth)
- ✅ Backend server URL (in capacitor.config.ts)

**Backend server DOES need:**
- ✅ DATABASE_URL
- ✅ All environment variables from .env.example

### Testing Locally

1. **Start backend server:**
   ```bash
   npm run dev
   # Runs on http://localhost:3000
   ```

2. **Find your local IP:**
   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

3. **Update capacitor.config.ts:**
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000', // Your IP here
     cleartext: true
   }
   ```

4. **Sync and run:**
   ```bash
   npx cap sync android
   npx cap open android
   ```

### Production Deployment

For production Android app:
1. Backend must be deployed (Vercel, Railway, etc.)
2. Database must be accessible from backend
3. Update capacitor.config.ts with production URL
4. Build signed APK/AAB for Play Store

### Common Errors

**"Prisma Client could not be found"**
- Expected in mobile app
- Solution: Ensure app calls backend API, not Prisma directly

**"Cannot connect to database"**
- Expected in mobile app
- Solution: Check backend server is running and accessible

**"Network request failed"**
- Check capacitor.config.ts server URL
- Check android:usesCleartextTraffic="true" in manifest
- Check firewall allows connections
- For local dev: Use IP address, not localhost

### Summary
✅ Prisma runs on your **backend server** (Vercel/local)
✅ Android app is just a **web client**
✅ All database operations go through **API endpoints**
❌ Never try to use Prisma directly in mobile app code
