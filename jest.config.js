/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest',
    '\\.js$': "<rootDir>/node_modules/babel-jest"
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@gnaudio/jabra-js).+\\.js$'
  ]
};