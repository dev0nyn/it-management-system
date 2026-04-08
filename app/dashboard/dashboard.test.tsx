import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DashboardPage from './page';

describe('DashboardPage', () => {
  it('renders the dashboard title', async () => {
    // Note: Since DashboardPage is an async component in our implementation, 
    // we normally need specialized testing for RSC. 
    // This is a basic demonstration of a Vitest unit test structure.
    render(await DashboardPage());
    expect(screen.getByText(/IT Management Dashboard/i)).toBeInTheDocument();
  });

  it('contains the "Download Report" button', async () => {
    render(await DashboardPage());
    expect(screen.getByText(/Download Report/i)).toBeInTheDocument();
  });
});
