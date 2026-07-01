import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/react-app/tests'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 60000,
  globalSetup: '<rootDir>/react-app/tests/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/react-app/tests/e2e/global-teardown.ts',
};

export default config;
