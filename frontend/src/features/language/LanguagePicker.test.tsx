import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguagePicker } from './LanguagePicker';

describe('LanguagePicker', () => {
  it('opens and closes with Escape while returning focus', async () => {
    const user = userEvent.setup();
    render(<LanguagePicker />);

    const trigger = screen.getByRole('button', { name: /Language:/ });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Choose language' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Choose language' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
