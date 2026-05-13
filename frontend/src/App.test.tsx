import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App top-level view persistence', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('loads a valid hash view', () => {
    window.location.hash = '#public';
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Public trends' })).toBeInTheDocument();
  });

  it('falls back to community for an invalid hash', () => {
    window.location.hash = '#unknown';
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Choose the concern' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#community');
  });

  it('updates the hash when navigation changes views', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Public' }));

    expect(window.location.hash).toBe('#public');
    expect(screen.getByRole('heading', { name: 'Public trends' })).toBeInTheDocument();
  });

  it('responds to browser hash navigation', async () => {
    render(<App />);

    await act(async () => {
      window.location.hash = '#followup';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(
      await screen.findByRole('heading', { name: 'Check report status' }),
    ).toBeInTheDocument();
  });
});
