import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aimi.chat',
  appName: 'AImi chat',
  webDir: 'public',
  server: {
    url: 'https://aimi-chat-production.up.railway.app',
    cleartext: false
  }
};

export default config;
