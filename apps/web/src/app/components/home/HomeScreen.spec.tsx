import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  const onLogin = jest.fn();
  const onSignUp = jest.fn();
  const onStudentDetails = jest.fn();
  const onTutorDetails = jest.fn();
  const onLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dual-audience headlines and opens detail pages from column CTAs', async () => {
    const user = userEvent.setup();
    render(
      <HomeScreen
        onLogin={onLogin}
        onSignUp={onSignUp}
        onStudentDetails={onStudentDetails}
        onTutorDetails={onTutorDetails}
        currentUser={null}
        onLogout={onLogout}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Tutors beyond your neighbourhood. A teaching practice that grows.',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: 'Get tutors beyond your neighbourhood',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Teach more. Earn more.' })).toBeTruthy();
    expect(screen.getByText('Connect, Learn, Grow')).toBeTruthy();
    expect(
      screen.getByRole('img', {
        name: 'A student discovering certified tutors across India, beyond her neighbourhood',
      }),
    ).toBeTruthy();
    expect(screen.getByText('info@tutorix.tech')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: "I'm a student" }));
    expect(onStudentDetails).toHaveBeenCalledTimes(1);
    expect(onSignUp).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: "I'm a tutor" }));
    expect(onTutorDetails).toHaveBeenCalledTimes(1);
    expect(onSignUp).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(onLogin).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });

  it('shows a dismissible signup success banner and logout when signed in', async () => {
    const user = userEvent.setup();
    const onDismissSignupMessage = jest.fn();

    render(
      <HomeScreen
        onLogin={onLogin}
        onSignUp={onSignUp}
        onStudentDetails={onStudentDetails}
        onTutorDetails={onTutorDetails}
        currentUser={{ id: 1, firstName: 'Ada', lastName: 'Khan', email: 'ada@example.com' }}
        onLogout={onLogout}
        signupSuccessMessage="You have successfully signed up."
        onDismissSignupMessage={onDismissSignupMessage}
      />,
    );

    expect(screen.getByText('You have successfully signed up.')).toBeTruthy();
    expect(screen.getByText('Ada Khan')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(onDismissSignupMessage).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
