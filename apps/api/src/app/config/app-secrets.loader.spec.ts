import {
  clearStaticAwsKeysWhenProfilePresent,
  loadAppSecrets,
  resetAppSecretsLoaderForTests,
  resolveTutorixEnv,
  shouldApplyRazorpayFromSecrets,
} from './app-secrets.loader';

describe('app-secrets.loader', () => {
  afterEach(() => {
    resetAppSecretsLoaderForTests();
  });

  describe('resolveTutorixEnv', () => {
    it('prefers TUTORIX_ENV over NODE_ENV=production', () => {
      expect(
        resolveTutorixEnv({ NODE_ENV: 'production', TUTORIX_ENV: 'staging' }),
      ).toBe('staging');
    });

    it('treats unset TUTORIX_ENV with NODE_ENV=production as development', () => {
      expect(resolveTutorixEnv({ NODE_ENV: 'production' })).toBe('development');
    });
  });

  describe('clearStaticAwsKeysWhenProfilePresent', () => {
    it('removes static keys when AWS_PROFILE is set', () => {
      const env: NodeJS.ProcessEnv = {
        AWS_PROFILE: 'default',
        AWS_ACCESS_KEY_ID: 'AKIATEST',
        AWS_SECRET_ACCESS_KEY: 'secret',
      };
      expect(clearStaticAwsKeysWhenProfilePresent(env)).toBe(true);
      expect(env.AWS_PROFILE).toBe('default');
      expect(env.AWS_ACCESS_KEY_ID).toBeUndefined();
      expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    });

    it('leaves static keys when AWS_PROFILE is absent', () => {
      const env: NodeJS.ProcessEnv = {
        AWS_ACCESS_KEY_ID: 'AKIATEST',
        AWS_SECRET_ACCESS_KEY: 'secret',
      };
      expect(clearStaticAwsKeysWhenProfilePresent(env)).toBe(false);
      expect(env.AWS_ACCESS_KEY_ID).toBe('AKIATEST');
    });
  });

  describe('shouldApplyRazorpayFromSecrets', () => {
    it('applies live Razorpay only for production', () => {
      expect(
        shouldApplyRazorpayFromSecrets({ TUTORIX_ENV: 'production' }),
      ).toBe(true);
      expect(shouldApplyRazorpayFromSecrets({ TUTORIX_ENV: 'staging' })).toBe(
        false,
      );
      expect(
        shouldApplyRazorpayFromSecrets({ TUTORIX_ENV: 'development' }),
      ).toBe(false);
    });
  });

  describe('loadAppSecrets', () => {
    const secretJson = {
      DB_USERNAME: 'sm_user',
      DB_PASSWORD: 'sm_pass',
      JWT_SECRET: 'sm_jwt',
      ANTHROPIC_API_KEY: 'sm_ant',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
      RAZORPAY_KEY_ID: 'rzp_live_from_sm',
      RAZORPAY_KEY_SECRET: 'live_secret_from_sm',
      DB_HOST: 'should-not-apply.example',
    };

    function mockClient(payload: Record<string, string> = secretJson) {
      return {
        send: jest.fn().mockResolvedValue({
          SecretString: JSON.stringify(payload),
        }),
      };
    }

    it('skips AWS when TUTORIX_ENV=test', async () => {
      const client = mockClient();
      const env: NodeJS.ProcessEnv = { TUTORIX_ENV: 'test' };
      await loadAppSecrets({ client, env });
      expect(client.send).not.toHaveBeenCalled();
    });

    it('applies shared secrets but keeps env Razorpay on staging', async () => {
      const env: NodeJS.ProcessEnv = {
        TUTORIX_ENV: 'staging',
        AWS_REGION: 'us-east-1',
        DB_HOST: 'staging-db',
        RAZORPAY_KEY_ID: 'rzp_test_env',
        RAZORPAY_KEY_SECRET: 'test_secret_env',
      };
      await loadAppSecrets({ client: mockClient(), env });
      expect(env.DB_USERNAME).toBe('sm_user');
      expect(env.DB_PASSWORD).toBe('sm_pass');
      expect(env.JWT_SECRET).toBe('sm_jwt');
      expect(env.ANTHROPIC_API_KEY).toBe('sm_ant');
      expect(env.FIREBASE_SERVICE_ACCOUNT_JSON).toBe(
        '{"type":"service_account"}',
      );
      expect(env.RAZORPAY_KEY_ID).toBe('rzp_test_env');
      expect(env.RAZORPAY_KEY_SECRET).toBe('test_secret_env');
      expect(env.DB_HOST).toBe('staging-db');
    });

    it('applies live Razorpay from Secrets Manager in production', async () => {
      const env: NodeJS.ProcessEnv = {
        TUTORIX_ENV: 'production',
        AWS_REGION: 'us-east-1',
        DB_HOST: 'prod-db',
      };
      await loadAppSecrets({ client: mockClient(), env });
      expect(env.RAZORPAY_KEY_ID).toBe('rzp_live_from_sm');
      expect(env.RAZORPAY_KEY_SECRET).toBe('live_secret_from_sm');
      expect(env.DB_HOST).toBe('prod-db');
      expect(env.JWT_SECRET).toBe('sm_jwt');
    });

    it('does not overwrite AWS access keys', async () => {
      const env: NodeJS.ProcessEnv = {
        TUTORIX_ENV: 'production',
        AWS_ACCESS_KEY_ID: 'local-key',
        AWS_SECRET_ACCESS_KEY: 'local-secret',
      };
      await loadAppSecrets({
        client: mockClient({
          ...secretJson,
          AWS_ACCESS_KEY_ID: 'sm-key',
          AWS_SECRET_ACCESS_KEY: 'sm-secret',
        }),
        env,
      });
      expect(env.AWS_ACCESS_KEY_ID).toBe('local-key');
      expect(env.AWS_SECRET_ACCESS_KEY).toBe('local-secret');
    });

    it('fails closed when DB password is missing', async () => {
      const env: NodeJS.ProcessEnv = { TUTORIX_ENV: 'development' };
      await expect(
        loadAppSecrets({
          client: mockClient({
            DB_USERNAME: 'sm_user',
            JWT_SECRET: 'sm_jwt',
          }),
          env,
        }),
      ).rejects.toThrow(/missing DB_USERNAME or DB_PASSWORD/);
    });
  });
});
