/**
 * Tests for network state handling
 */

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((cb: (state: any) => void) => {
    return jest.fn(); // unsubscribe
  }),
}));

describe('Network module', () => {
  it('NetInfo addEventListener is a function', () => {
    const NetInfo = require('@react-native-community/netinfo');
    expect(typeof NetInfo.addEventListener).toBe('function');
  });

  it('addEventListener returns unsubscribe function', () => {
    const NetInfo = require('@react-native-community/netinfo');
    const unsub = NetInfo.addEventListener(() => {});
    expect(typeof unsub).toBe('function');
  });
});
