import { fireEvent, render, screen } from '@testing-library/react-native';
import { PT_ALREADY_CLEARED_MESSAGE } from '@tutorix/shared-utils/pt-overlap';
import { PtAlreadyClearedPrompt } from './PtAlreadyClearedPrompt';

describe('PtAlreadyClearedPrompt', () => {
  it('shows the already-cleared copy and acknowledges', () => {
    const onAcknowledge = jest.fn();
    render(<PtAlreadyClearedPrompt onAcknowledge={onAcknowledge} />);

    expect(screen.getByText(PT_ALREADY_CLEARED_MESSAGE)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('OK'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
