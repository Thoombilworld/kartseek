import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PASSWORD_REGEX, RegisterDto, ResetPasswordDto } from './gateway.dto';

/**
 * The password rule customers actually hit. The previous regex accepted only
 * `@$!%*?&^#` as symbols and refused any other character anywhere in the
 * password, so `Passw0rd_2026.` was a 400 that claimed the password had no
 * special character. This pins the rule to what the message says: 8–128
 * characters, no whitespace, one lowercase, one uppercase, one digit, one
 * symbol of any kind.
 */
const ACCEPTED = [
  'Probe#Pass12345',
  'Passw0rd_2026.',
  'Correct-Horse-9',
  'Sunny+Day2026',
  'Qatar,2026Team',
  'Ünïcødé-Pass1',
  'a'.repeat(120) + 'B1!',
];
const REFUSED: Array<[string, string]> = [
  ['short1!', 'shorter than 8'],
  ['alllowercase1!', 'no uppercase'],
  ['ALLUPPERCASE1!', 'no lowercase'],
  ['NoDigitsHere!', 'no digit'],
  ['NoSymbol2026', 'no symbol'],
  ['Has Space1!', 'whitespace'],
  ['Tab\tbed1!', 'whitespace'],
  ['A1!' + 'x'.repeat(126), 'longer than 128'],
];

async function messagesFor(dto: object): Promise<string[]> {
  const errors = await validate(dto as object);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('password rule', () => {
  it.each(ACCEPTED)('accepts %s', (password) => {
    expect(PASSWORD_REGEX.test(password)).toBe(true);
  });

  it.each(REFUSED)('refuses %s (%s)', (password) => {
    expect(PASSWORD_REGEX.test(password)).toBe(false);
  });

  it('RegisterDto accepts a password with an underscore and a dot', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Probe',
      email: 'probe@example.com',
      password: 'Passw0rd_2026.',
    });
    expect(await messagesFor(dto)).toEqual([]);
  });

  it('RegisterDto names every requirement in one message', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Probe',
      email: 'probe@example.com',
      password: 'nosymbols2026',
    });
    const messages = await messagesFor(dto);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/1 uppercase letter, 1 lowercase letter, 1 digit and 1 symbol/);
    expect(messages[0]).toMatch(/for example ! @ # _ -/);
  });

  it('ResetPasswordDto applies the same rule', async () => {
    const ok = plainToInstance(ResetPasswordDto, { token: 't', newPassword: 'Passw0rd_2026.' });
    expect(await messagesFor(ok)).toEqual([]);
    const bad = plainToInstance(ResetPasswordDto, { token: 't', newPassword: 'weak' });
    expect((await messagesFor(bad)).join(' ')).toMatch(/at least 8 characters|1 symbol/);
  });

  it('RegisterDto no longer declares a role field', () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'x',
      email: 'x@y.z',
      password: 'Probe#Pass12345',
      role: 'SUPER_ADMIN',
    });
    // The property is not part of the DTO; the global whitelist strips it
    // (forbidNonWhitelisted answers 400). Nothing in the class describes it.
    expect(Object.getOwnPropertyNames(RegisterDto.prototype)).not.toContain('role');
    expect((dto as any).role).toBe('SUPER_ADMIN'); // plainToInstance copies; validation refuses
  });
});
