const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  displayName: 'furzose-tests',
  testEnvironment: 'jest-environment-jsdom',
  roots: ['<rootDir>/__tests__'],
  testPathIgnorePatterns: ['/node_modules/', '__tests__/integration/mocks/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 70,
      lines: 85,
    },
  },
  collectCoverageFrom: [
    'src/lib/**/*.{ts,tsx}',
    'src/app/**/actions/**/*.{ts,tsx}',
    'src/middleware.ts',
    'src/components/admin/**/*.{ts,tsx}',
    'src/components/LikeButton.tsx',
    'src/app/(admin)/admin/**/*.{ts,tsx}',
    'src/app/cart/page.tsx',
    'src/app/checkout/page.tsx',
    'src/app/login/page.tsx',
    'src/app/(accounts)/**/*.{ts,tsx}',
    'src/app/product-detail/ProductDetailClient.tsx',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
  ],
}

module.exports = createJestConfig(config)
