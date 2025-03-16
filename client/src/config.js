const prod = true;

// Central configuration for the application
const config = {
  // API base URL - change this when deploying to production
  apiBaseUrl: prod
    ? 'https://wiki-ai.link' // Empty string means same origin in production
    : 'http://localhost:1212',
};

console.log('configuring with', config.apiBaseUrl);

export default config; 