/**
 * Tests for network state handling
 */

import NetInfo from '@react-native-community/netinfo';

describe('Network module', () => {
  it('NetInfo addEventListener is a function', () => {
    expect(typeof NetInfo.addEventListener).toBe('function');
  });

  it('addEventListener returns unsubscribe function', () => {
    const unsub = NetInfo.addEventListener(() => {});
    expect(typeof unsub).toBe('function');
  });
});
