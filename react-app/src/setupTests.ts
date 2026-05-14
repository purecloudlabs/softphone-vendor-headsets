// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill structuredClone for jsdom environment (not implemented in jsdom)
global.structuredClone = global.structuredClone ?? ((val) => JSON.parse(JSON.stringify(val)));
