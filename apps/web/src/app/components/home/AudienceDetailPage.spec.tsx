import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudienceDetailPage } from './AudienceDetailPage';
import { studentDetailCopy, tutorDetailCopy } from './audience-detail-copy';

describe('AudienceDetailPage', () => {
  const onHome = jest.fn();
  const onLogin = jest.fn();
  const onSignUp = jest.fn();
  const onLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('explains student features and keeps signup on the page CTA', async () => {
    const user = userEvent.setup();
    render(
      <AudienceDetailPage
        copy={studentDetailCopy}
        currentUser={null}
        onHome={onHome}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Get tutors beyond your neighbourhood' }),
    ).toBeTruthy();
    expect(screen.getByText('Why stay limited to your neighbourhood?')).toBeTruthy();
    expect(screen.getByText('Your schedule, in one app')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Back to home/ }));
    expect(onHome).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole('button', { name: 'Create a student account' })[0]);
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });

  it('explains tutor features without opening signup from the headline alone', async () => {
    const user = userEvent.setup();
    render(
      <AudienceDetailPage
        copy={tutorDetailCopy}
        currentUser={null}
        onHome={onHome}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Teach more. Earn more.' })).toBeTruthy();
    expect(screen.getByText('Assured class bookings')).toBeTruthy();
    expect(screen.getByText('Teach offline or online')).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: 'Create a tutor account' })[0]);
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });
});
