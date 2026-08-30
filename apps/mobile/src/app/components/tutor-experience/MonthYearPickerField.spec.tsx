import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MonthYearPickerField } from './MonthYearPickerField';

describe('MonthYearPickerField', () => {
  it('shows a placeholder when empty and writes the 15th on Done', () => {
    const onChange = jest.fn();
    const currentYear = new Date().getFullYear();
    const { getByLabelText, getByText } = render(
      <MonthYearPickerField
        value=""
        onChange={onChange}
        title="Start date"
        accessibilityLabel="Start date"
      />,
    );

    expect(getByText('Month year')).toBeTruthy();
    fireEvent.press(getByLabelText('Start date'));
    fireEvent.press(getByText('Jan'));
    fireEvent.press(getByText('Done'));

    expect(onChange).toHaveBeenCalledWith(`${currentYear}-01-15`);
  });

  it('displays the selected month and year without the stored day', () => {
    const { getByText } = render(
      <MonthYearPickerField value="2021-06-15" onChange={jest.fn()} />,
    );

    expect(getByText('Jun 2021')).toBeTruthy();
  });
});
