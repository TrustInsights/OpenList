// Type bridge: adds jest-dom and vitest-axe matchers to the vitest 5 Assertion interface (two type parameters)

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<T, R>,
      AxeMatchers {}
}
