//silence harmless React Native animation warnings during tests
const originalWarn  = console.warn.bind(console);
const originalError = console.error.bind(console);

console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && (
    msg.includes('Animated') ||
    msg.includes('componentWillReceiveProps') ||
    msg.includes('componentWillMount') ||
    msg.includes('extracted from react-native') ||
    msg.includes('deprecated')
  )) return;
  originalWarn(msg, ...args);
};

console.error = (msg, ...args) => {
  if (typeof msg === 'string' && (
    msg.includes('Warning:') ||
    msg.includes('Error: Not implemented')
  )) return;
  originalError(msg, ...args);
};

//mock specific modules that may not exist in newer React Native versions
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });
jest.mock('react-native/Libraries/Alert/Alert', () => ({ alert: jest.fn() }), { virtual: true });
