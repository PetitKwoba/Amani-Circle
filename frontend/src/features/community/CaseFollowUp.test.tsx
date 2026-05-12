import { render, screen } from '@testing-library/react';
import { CaseFollowUp } from './CaseFollowUp';

describe('CaseFollowUp', () => {
  it('renders the anonymous status lookup form', () => {
    render(<CaseFollowUp />);

    expect(screen.getByRole('heading', { name: 'Check report status' })).toBeInTheDocument();
    expect(screen.getByLabelText('Case ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Follow-up code')).toBeInTheDocument();
  });
});
