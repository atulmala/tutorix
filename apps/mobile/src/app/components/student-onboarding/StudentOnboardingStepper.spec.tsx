import React from 'react';
import { render } from '@testing-library/react-native';
import { StudentOnboardingStepper } from './StudentOnboardingStepper';

describe('StudentOnboardingStepper', () => {
  it('shows step icons without truncated labels', () => {
    const { getByLabelText, queryByText } = render(
      <StudentOnboardingStepper currentStepIndex={0} />,
    );

    expect(getByLabelText('Parent / Guardian')).toBeTruthy();
    expect(getByLabelText('Address')).toBeTruthy();
    expect(getByLabelText('Education')).toBeTruthy();
    expect(getByLabelText('Registration Fee')).toBeTruthy();
    expect(queryByText('P...')).toBeNull();
    expect(queryByText('Parent')).toBeNull();
  });
});
