import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('accepts the original password and rejects another password', async () => {
    const encoded = await hashPassword('Correct-Horse-2026');

    await expect(verifyPassword('Correct-Horse-2026', encoded)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', encoded)).resolves.toBe(false);
  });

  it('rejects malformed stored values', async () => {
    await expect(verifyPassword('password', 'invalid')).resolves.toBe(false);
  });
});
