declare module '@sentry/react-native' {
  export interface SentryInitOptions {
    dsn?: string;
    debug?: boolean;
    enabled?: boolean;
    tracesSampleRate?: number;
    environment?: string;
  }

  export function init(options?: SentryInitOptions): void;
}
