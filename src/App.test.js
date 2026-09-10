import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('shows the users list after submitting the login form', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), '1234');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
  expect(screen.getByText('Keerthi')).toBeInTheDocument();
});
