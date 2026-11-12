import { resolveBackendUrl } from '../backendUrl';

const LOCAL = 'http://10.0.2.2:54321';

describe('resolveBackendUrl', () => {
  it('uses localhost in the iOS Simulator', () => {
    expect(resolveBackendUrl(LOCAL, 'ios', true)).toBe('http://localhost:54321');
  });

  it('leaves Android, real iPhones and hosted projects alone', () => {
    expect(resolveBackendUrl(LOCAL, 'android', false)).toBe(LOCAL);
    expect(resolveBackendUrl(LOCAL, 'ios', false)).toBe(LOCAL);
    const hosted = 'https://abc.supabase.co';
    expect(resolveBackendUrl(hosted, 'ios', true)).toBe(hosted);
    expect(resolveBackendUrl('http://10.0.2.20:54321', 'ios', true)).toBe('http://10.0.2.20:54321');
  });
});
