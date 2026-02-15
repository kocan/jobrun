import { isSupabaseConfigured } from '../lib/supabase';

describe('Supabase configuration', () => {
  test('isSupabaseConfigured is false when env vars are not set', () => {
    // In test environment, EXPO_PUBLIC_SUPABASE_URL is not set
    expect(isSupabaseConfigured).toBe(false);
  });

  test('getSupabase returns null when not configured', () => {
    const { getSupabase } = require('../lib/supabase');
    expect(getSupabase()).toBeNull();
  });
});

describe('Email validation', () => {
  // Same regex used in login screen
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('user+tag@domain.org')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@missing.com')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});
