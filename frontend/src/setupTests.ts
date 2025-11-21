import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Mock global do fetch para testes
global.fetch = jest.fn();
