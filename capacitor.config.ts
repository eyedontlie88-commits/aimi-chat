import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurgilabs.aimichat',
  appName: 'aimi-chat',
  webDir: 'public',
  server: {
    url: 'https://aimi-chat-yig9.vercel.app',
    cleartext: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Android Client ID for package com.aurgilabs.aimichat
      androidClientId: '647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com',
      // Web Client ID for server-side token verification
      serverClientId: '647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;
