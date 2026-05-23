/** @type {import('jest').Config} */
const config = {
  displayName: 'real-db-tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/real-db'],
  testMatch: ['**/__tests__/real-db/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  setupFiles: ['<rootDir>/__tests__/real-db/setup/load-env.ts'],
  verbose: true,
}

module.exports = config
