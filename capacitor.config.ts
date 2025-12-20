import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aimi.chat', // Khớp với Android Studio
  appName: 'aimi-chat',
  webDir: 'public',
  server: {
    // 👇 Vercel deployment URL
    url: 'https://aimi-chat-mcj3.vercel.app',
    cleartext: true
  }
};

export default config;
