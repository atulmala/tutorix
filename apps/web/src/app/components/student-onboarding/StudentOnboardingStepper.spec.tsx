import { render, screen } from '@testing-library/react';
import { StudentOnboardingStepper } from './StudentOnboardingStepper';

describe('StudentOnboardingStepper', () => {
  it('shows step icons without labels under the circles', () => {
    render(<StudentOnboardingStepper currentStepIndex={1} />);

    expect(screen.getByLabelText('Parent / Guardian')).toBeTruthy();
    expect(screen.getByLabelText('Address')).toBeTruthy();
    expect(screen.getByLabelText('Education')).toBeTruthy();
    expect(screen.getByLabelText('Registration Fee')).toBeTruthy();
    expect(screen.queryByText('Parent')).toBeNull();
  });
});
