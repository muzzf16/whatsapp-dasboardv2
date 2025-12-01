import { render, screen } from '@testing-library/react';
import App from './App';

// Mock axios and socket.io-client
jest.mock('axios');
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    })),
  };
});

test('renders WhatsApp API Dashboard title', () => {
  render(<App />);
  const titleElement = screen.getByText(/WhatsApp API Dashboard/i);
  expect(titleElement).toBeInTheDocument();
});
