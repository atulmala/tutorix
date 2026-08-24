/**
 * Signup Flow E2E Tests
 * 
 * Tests the complete signup user journey including:
 * - Basic details form
 * - Email verification (phone OTP is skipped unless Communication Mobile verification is On)
 * - Signup completion
 */

describe('User Signup Flow', () => {
  beforeEach(() => {
    cy.visit('/signup');
  });

  describe('Basic Details Step', () => {
    it('should successfully submit basic details', () => {
      // Arrange
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `test-${Date.now()}@example.com`,
        phone: '9876543210',
        countryCode: '+91',
        password: 'Test123456',
        confirmPassword: 'Test123456',
        role: 'STUDENT',
      };

      // Act
      cy.get('[data-testid="first-name-input"]').type(userData.firstName);
      cy.get('[data-testid="last-name-input"]').type(userData.lastName);
      cy.get('[data-testid="email-input"]').type(userData.email);
      cy.get('[data-testid="country-code-select"]').select(userData.countryCode);
      cy.get('[data-testid="phone-input"]').type(userData.phone);
      cy.get('[data-testid="password-input"]').type(userData.password);
      cy.get('[data-testid="confirm-password-input"]').type(userData.confirmPassword);
      cy.get('[data-testid="role-select"]').select(userData.role);
      cy.get('[data-testid="submit-button"]').click();

      // Assert
      // Default policy skips phone OTP and goes to email verification
      cy.url().should('include', '/signup');
      cy.get('[data-testid="email-verification-step"]').should('be.visible');
    });

    it('should validate required fields', () => {
      // Act
      cy.get('[data-testid="submit-button"]').click();

      // Assert
      cy.get('[data-testid="first-name-error"]').should('contain', 'required');
      cy.get('[data-testid="email-error"]').should('contain', 'required');
      cy.get('[data-testid="phone-error"]').should('contain', 'required');
      cy.get('[data-testid="password-error"]').should('contain', 'required');
    });

    it('should validate email format', () => {
      // Arrange
      const invalidEmail = 'invalid-email';

      // Act
      cy.get('[data-testid="email-input"]').type(invalidEmail);
      cy.get('[data-testid="submit-button"]').click();

      // Assert
      cy.get('[data-testid="email-error"]').should('contain', 'valid email');
    });

    it('should validate password match', () => {
      // Arrange
      const password = 'Test123456';
      const confirmPassword = 'DifferentPassword';

      // Act
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="confirm-password-input"]').type(confirmPassword);
      cy.get('[data-testid="submit-button"]').click();

      // Assert
      cy.get('[data-testid="confirm-password-error"]').should('contain', 'match');
    });
  });

  describe('Email Verification Step after basic details', () => {
    beforeEach(() => {
      // Setup: Complete basic details first
      // This would ideally use a helper function or fixture
      cy.get('[data-testid="first-name-input"]').type('John');
      cy.get('[data-testid="last-name-input"]').type('Doe');
      cy.get('[data-testid="email-input"]').type(`test-${Date.now()}@example.com`);
      cy.get('[data-testid="country-code-select"]').select('+91');
      cy.get('[data-testid="phone-input"]').type('9876543210');
      cy.get('[data-testid="password-input"]').type('Test123456');
      cy.get('[data-testid="confirm-password-input"]').type('Test123456');
      cy.get('[data-testid="submit-button"]').click();

      cy.get('[data-testid="email-verification-step"]').should('be.visible');
    });

    it('should stay on email verification after basic details', () => {
      cy.get('[data-testid="email-verification-step"]').should('be.visible');
      cy.get('[data-testid="phone-verification-step"]').should('not.exist');
    });

    it('should show error for incorrect OTP', () => {
      // Arrange
      const incorrectOtp = '000000';

      // Act
      cy.get('[data-testid="otp-input"]').type(incorrectOtp);
      cy.get('[data-testid="verify-button"]').click();

      // Assert
      cy.get('[data-testid="otp-error"]').should('contain', 'Invalid OTP');
    });

    it('should allow resending OTP', () => {
      // Act
      cy.get('[data-testid="resend-otp-button"]').click();

      // Assert
      cy.get('[data-testid="otp-sent-message"]').should('contain', 'OTP sent');
    });
  });

  describe('Email Verification Step', () => {
    beforeEach(() => {
      // Setup: Complete basic details (phone OTP is skipped by default)
      // This would ideally use a helper function
    });

    it('should successfully verify email', () => {
      // Arrange
      // In a real scenario, you'd need to get the email verification code
      // For now, we'll assume a test code or mock the email verification

      // Act
      cy.get('[data-testid="verify-email-button"]').click();
      // Or if there's a code input:
      // cy.get('[data-testid="email-code-input"]').type('verification-code');
      // cy.get('[data-testid="verify-button"]').click();

      // Assert
      cy.get('[data-testid="signup-complete-message"]').should('be.visible');
      cy.get('[data-testid="signup-complete-message"]').should('contain', 'signup is complete');
    });
  });

  describe('Signup Completion', () => {
    it('should complete signup and redirect to appropriate page', () => {
      // Arrange
      // Setup: Complete all steps (basic details, email verification)
      // This would ideally use a helper function

      // Act
      // Complete final step

      // Assert
      // Should redirect to login or dashboard
      cy.url().should('match', /\/login|\/dashboard/);
      // Analytics event should be tracked
      // You can verify this by checking network requests or using cy.window()
    });

    it('should track signup analytics events', () => {
      // This test would verify that analytics events are being tracked
      // You can use cy.intercept() to capture network requests to analytics endpoints
      
      cy.intercept('POST', '**/analytics/**', {}).as('analyticsEvent');
      
      // Complete signup flow
      // ... (signup steps)
      
      // Assert
      cy.wait('@analyticsEvent').then((interception) => {
        expect(interception.request.body).to.have.property('event_type', 'signup_completed');
      });
    });
  });
});
