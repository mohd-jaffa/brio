import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '@/app/login/page';
import { AuthClient } from '@/features/auth/api.client';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock AuthClient
vi.mock('@/features/auth/api.client', () => ({
  AuthClient: {
    login: vi.fn(),
    register: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

function renderAuthPage() {
  return render(
    <ThemeProvider>
      <AuthPage />
    </ThemeProvider>
  );
}

describe('Authentication Page', () => {
  it('renders Sign In heading by default', () => {
    renderAuthPage();
    expect(screen.getByText(/Welcome Back, Baker!/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('switches to Create Account tab when clicked', () => {
    renderAuthPage();
    const registerTab = screen.getByRole('tab', { name: /Create Account/i });
    fireEvent.click(registerTab);
    expect(screen.getByText(/Start Your Home Bakery/i)).toBeInTheDocument();
  });

  it('shows forgot password modal when clicked', () => {
    renderAuthPage();
    const forgotBtn = screen.getByText(/Forgot password\?/i);
    fireEvent.click(forgotBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Enter the email address registered with your bakery account/i)).toBeInTheDocument();
  });

  it('calls AuthClient.login on valid login submit', async () => {
    (AuthClient.login as any).mockResolvedValueOnce({ accessToken: 'token-123' });
    renderAuthPage();

    const phoneInput = screen.getByLabelText(/Mobile Number/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Bakery/i });

    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(AuthClient.login).toHaveBeenCalledWith({
        phone: '9876543210',
        password: 'Password123!',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
