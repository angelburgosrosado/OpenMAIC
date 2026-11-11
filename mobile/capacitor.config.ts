import type { CapacitorConfig } from '@capacitor/cli';

/**
 * One Android build for phones, Fire tablets, Android TV and Fire TV.
 * The app loads the live site, so every web release reaches the apps at once;
 * `www/` is only the offline screen shown when there's no connection.
 */
const config: CapacitorConfig = {
  appId: 'com.quewhat.app',
  appName: 'QuéWhat',
  webDir: 'www',
  server: {
    url: 'https://www.quewhat.com',
    androidScheme: 'https',
    errorPath: 'offline.html',
    allowNavigation: ['www.quewhat.com', 'quewhat.com', 'checkout.stripe.com', 'billing.stripe.com'],
  },
  android: {
    backgroundColor: '#1F3B2D',
    appendUserAgent: 'QueWhatApp/1.0',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#1F3B2D',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#1F3B2D',
      style: 'DARK',
    },
  },
};

export default config;
