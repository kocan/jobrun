import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export { Sentry };
