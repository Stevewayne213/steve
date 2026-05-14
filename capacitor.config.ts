import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evgrama.charge',
  appName: 'EV-Grama Charge',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
