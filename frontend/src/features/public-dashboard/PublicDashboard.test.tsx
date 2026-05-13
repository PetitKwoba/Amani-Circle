import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { PublicDashboard } from './PublicDashboard';

vi.mock('../../api', () => ({
  fetchPublicStats: () =>
    Promise.resolve({
      total_reports: 0,
      by_category: [],
      by_urgency: [],
      by_status: [],
      by_region: [],
      by_week: [],
    }),
  fetchPublicContent: () => Promise.resolve([]),
}));

describe('PublicDashboard', () => {
  it('renders privacy-safe empty public aggregates', async () => {
    render(<PublicDashboard />);

    expect(await screen.findByText('0')).toBeInTheDocument();
    expect(screen.getByText(/Low-volume rough-region groups/)).toBeInTheDocument();
  });
});
