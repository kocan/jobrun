const component = 'View';

const ReactNativeMock = {
  Alert: { alert: () => undefined },
  AppState: {
    addEventListener: () => ({ remove: () => undefined }),
  },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Keyboard: { dismiss: () => undefined },
  Platform: {
    OS: 'ios',
    select: (options: Record<string, unknown>) => options.ios ?? options.default,
  },
  StyleSheet: {
    create: <T>(styles: T) => styles,
    hairlineWidth: 1,
    flatten: <T>(styles: T) => styles,
  },
  Text: component,
  TextInput: component,
  TouchableOpacity: component,
  View: component,
} as Record<string, unknown>;

const proxy = new Proxy(ReactNativeMock, {
  get(target, prop: string) {
    if (prop in target) {
      return target[prop];
    }
    return component;
  },
});

export default proxy;
export const Alert = ReactNativeMock.Alert;
export const AppState = ReactNativeMock.AppState;
export const Dimensions = ReactNativeMock.Dimensions;
export const Keyboard = ReactNativeMock.Keyboard;
export const Platform = ReactNativeMock.Platform;
export const StyleSheet = ReactNativeMock.StyleSheet;
export const Text = component;
export const TextInput = component;
export const TouchableOpacity = component;
export const View = component;
