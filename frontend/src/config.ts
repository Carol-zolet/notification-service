export const config = {
  apiBaseUrl:
    typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL
      ? process.env.VITE_API_BASE_URL
      : 'https://api.carolinenotificacoes.page',
};
