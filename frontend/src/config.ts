export const config = {
  apiBaseUrl:
    typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL
      ? process.env.VITE_API_BASE_URL
      : 'http://localhost:3000/api',
};
