import {
  APPLICATION_REVIEW_MESSAGE,
  ONBOARDING_APPROVED_MESSAGE,
  resolveApplicationReviewCopy,
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

describe('resolveApplicationReviewCopy', () => {
  it('prefers the in-app message body', () => {
    expect(
      resolveApplicationReviewCopy({
        inAppBody: '  From inbox  ',
        catalogBody: 'From catalog',
      }),
    ).toBe('From inbox');
  });

  it('falls back to catalog copy, then the hardcoded review message', () => {
    expect(
      resolveApplicationReviewCopy({
        inAppBody: ' ',
        catalogBody: '  Catalog review  ',
      }),
    ).toBe('Catalog review');
    expect(resolveApplicationReviewCopy({})).toBe(APPLICATION_REVIEW_MESSAGE);
  });
});
