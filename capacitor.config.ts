import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.messagerie.app',
  appName: 'Messagerie',
  webDir: 'out',
  server: {
    url: 'https://messagerie-main.vercel.app',
    cleartext: true
  }
};

export default config;
