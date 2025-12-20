import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aimi.chat', // Khớp với Android Studio
  appName: 'aimi-chat',
  webDir: 'public',
  server: {
    // 👇 Mở lại dòng này để App có giao diện từ Vercel
    url: 'https://aimi-chat-yig9.vercel.app',
    cleartext: true,
    allowNavigation: ['aimi-chat-yig9.vercel.app'] // Cấp quyền tuyệt đối cho domain
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Dùng chung mã Client ID Android cho cả 2 dòng này 👇
      androidClientId: '647583841932-dshut2n2ngg6a60iborrb719i7tpjht9.apps.googleusercontent.com',
      serverClientId: '647583841932-dshut2n2ngg6a60iborrb719i7tpjht9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;
