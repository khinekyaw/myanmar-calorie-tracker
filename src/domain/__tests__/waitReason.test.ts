import { waitReason } from '../waitReason';

const base = { status: 'queued' as const, itemCount: 0, blocked: false, canUpload: true, failed: false };

describe('waitReason', () => {
  it('is null for a logged meal and "empty" when the scan found no food', () => {
    expect(waitReason({ ...base, status: 'done', itemCount: 2 })).toBeNull();
    expect(waitReason({ ...base, status: 'done' })).toBe('empty');
  });

  it('puts no free scans before being offline, and offline before a failure', () => {
    expect(waitReason({ ...base, blocked: true, canUpload: false, failed: true })).toBe('quota');
    expect(waitReason({ ...base, canUpload: false, failed: true })).toBe('offline');
    expect(waitReason({ ...base, failed: true })).toBe('failed');
  });

  it('shows a queued photo that is about to be sent as analysing', () => {
    expect(waitReason(base)).toBe('analyzing');
    expect(waitReason({ ...base, status: 'analyzing', blocked: true })).toBe('analyzing');
  });
});
