import { getAuthInitialRoute } from '../../src/navigation/authNavigatorResolver';

describe('authentication navigation state', () => {
  it('opens OTP verification after a successful OTP request', () => {
    expect(getAuthInitialRoute('otpRequired')).toBe('OtpVerification');
  });

  it('opens the welcome screen for unauthenticated users', () => {
    expect(getAuthInitialRoute('unauthenticated')).toBe('Welcome');
  });
});
