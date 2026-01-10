/**
 * Login Flow E2E Tests
 * 
 * Tests the complete login user journey including:
 * - Email login
 * - Mobile login
 * - Incomplete signup handling
 * - Password validation
 * - Error handling
 */

describe('User Login Flow', () => {
  beforeEach(() => {
    // Visit the login page
    cy.visit('/');
    // Assuming the app starts with login view
    // Adjust based on your actual routing
  });

  describe('Email Login', () => {
    it('should successfully login with valid email and password', () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Test123456';

      // Act
      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="login-button"]').click();

      // Assert
      // Adjust selectors based on your actual implementation
      cy.url().should('include', '/dashboard'); // or wherever successful login redirects
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist');
    });

    it('should show error for invalid credentials', () => {
      // Arrange
      const email = 'test@example.com';
      const invalidPassword = 'WrongPassword';

      // Act
      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="password-input"]').type(invalidPassword);
      cy.get('[data-testid="login-button"]').click();

      // Assert
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid login credentials');
      cy.url().should('not.include', '/dashboard');
    });

    it('should validate email format', () => {
      // Arrange
      const invalidEmail = 'invalid-email';

      // Act
      cy.get('[data-testid="email-input"]').type(invalidEmail);
      cy.get('[data-testid="password-input"]').type('Test123456');
      cy.get('[data-testid="login-button"]').click();

      // Assert
      cy.get('[data-testid="email-error"]').should('contain', 'valid email');
    });

    it('should require password', () => {
      // Act
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="login-button"]').click();

      // Assert
      cy.get('[data-testid="password-error"]').should('contain', 'required');
    });
  });

  describe('Mobile Login', () => {
    it('should successfully login with mobile number and password', () => {
      // Arrange
      const countryCode = '+91';
      const mobileNumber = '9876543210';
      const password = 'Test123456';

      // Act
      cy.get('[data-testid="country-code-select"]').select(countryCode);
      cy.get('[data-testid="mobile-input"]').type(mobileNumber);
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="login-button"]').click();

      // Assert
      cy.url().should('include', '/dashboard');
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist');
    });

    it('should validate mobile number format', () => {
      // Arrange
      const invalidMobile = '123'; // Too short

      // Act
      cy.get('[data-testid="mobile-input"]').type(invalidMobile);
      cy.get('[data-testid="password-input"]').type('Test123456');
      cy.get('[data-testid="login-button"]').click();

      // Assert
      cy.get('[data-testid="mobile-error"]').should('contain', 'valid mobile number');
    });
  });

  describe('Incomplete Signup Handling', () => {
    it('should show modal when user with incomplete signup tries to login', () => {
      // Arrange
      // This would require setting up a test user with incomplete signup
      const email = 'incomplete-signup@example.com';
      const password = 'Test123456';

      // Act
      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="login-button"]').click();

      // Assert
      cy.get('[data-testid="incomplete-signup-modal"]').should('be.visible');
      cy.get('[data-testid="incomplete-signup-modal"]').should('contain', 'Please complete your signup');
    });

    it('should navigate to signup when user clicks continue in incomplete signup modal', () => {
      // Arrange
      // Setup incomplete signup scenario
      const email = 'incomplete-signup@example.com';
      const password = 'Test123456';

      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="login-button"]').click();

      // Act
      cy.get('[data-testid="complete-signup-button"]').click();

      // Assert
      cy.url().should('include', '/signup');
    });
  });

  describe('Password Recovery', () => {
    it('should navigate to forgot password page', () => {
      // Act
      cy.get('[data-testid="forgot-password-link"]').click();

      // Assert
      cy.url().should('include', '/forgot-password');
    });

    it('should send password reset email', () => {
      // Arrange
      const email = 'test@example.com';

      // Act
      cy.visit('/forgot-password');
      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="submit-button"]').click();

      // Assert
      cy.get('[data-testid="success-message"]').should('contain', 'password reset link has been sent');
    });
  });
});
