import {
  ALREADY_REGISTERED_LOGIN_MESSAGE,
  isAlreadyRegisteredError,
} from './already-registered';

describe('isAlreadyRegisteredError', () => {
  it('matches completed-signup conflict messages', () => {
    expect(
      isAlreadyRegisteredError('User already registered and signup completed'),
    ).toBe(true);
    expect(isAlreadyRegisteredError('Email already registered')).toBe(true);
    expect(isAlreadyRegisteredError('Mobile number already registered')).toBe(
      true,
    );
  });

  it('matches GraphQL error objects', () => {
    expect(
      isAlreadyRegisteredError({
        errors: [{ message: 'Email already registered' }],
      }),
    ).toBe(true);
    expect(
      isAlreadyRegisteredError([{ message: 'Mobile number already registered' }]),
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isAlreadyRegisteredError('Password must be at least 6 characters')).toBe(
      false,
    );
    expect(isAlreadyRegisteredError(null)).toBe(false);
  });
});

describe('ALREADY_REGISTERED_LOGIN_MESSAGE', () => {
  it('uses the login prompt copy', () => {
    expect(ALREADY_REGISTERED_LOGIN_MESSAGE).toBe(
      'You are already registered. Pl login',
    );
  });
});
