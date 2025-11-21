import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R = void, T = {}> {
      toBeInTheDocument(): R;
    }
  }
}
