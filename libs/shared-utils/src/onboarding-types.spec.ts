import {
  ONBOARDING_APPROVED_MESSAGE,
  resolveOnboardingApprovedCopy,
} from './onboarding-types';

describe('resolveOnboardingApprovedCopy', () => {
  it('prefers the in-app message body', () => {
    expect(
      resolveOnboardingApprovedCopy({
        inAppBody: '  From inbox  ',
        catalogBody: 'From catalog',
      }),
    ).toBe('From inbox');
  });

  it('falls back to catalog copy, then the hardcoded default', () => {
    expect(
      resolveOnboardingApprovedCopy({
        inAppBody: ' ',
        catalogBody: ' From catalog ',
      }),
    ).toBe('From catalog');
    expect(resolveOnboardingApprovedCopy({})).toBe(ONBOARDING_APPROVED_MESSAGE);
  });
});
