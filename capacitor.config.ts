import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.soiree.roulette',
  appName: 'Roulette Soirée',
  webDir: 'dist',
  backgroundColor: '#0b0614',
  plugins: {
    SplashScreen: { backgroundColor: '#0b0614', launchShowDuration: 800 },
  },
};

export default config;
