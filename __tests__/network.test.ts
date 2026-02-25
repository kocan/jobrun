/**
 * Tests for network state handling
 */

vi.mock('@react-native-community/netinfo', () => ({
  addEventListener: vi.fn((cb: (state: any) => void) => {
    return vi.fn(); // unsubscribe
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
