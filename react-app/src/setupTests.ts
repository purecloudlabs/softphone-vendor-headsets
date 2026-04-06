// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for structuredClone if not available in the test environment
if (typeof structuredClone === 'undefined') {
  (global as any).structuredClone = (obj: any) => {
    // Simple deep clone using JSON for testing purposes
    // Note: This may not handle all edge cases like circular references, functions, etc.
    return JSON.parse(JSON.stringify(obj));
  };
}