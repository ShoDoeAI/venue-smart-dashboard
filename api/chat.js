// Use the compiled TypeScript version from backend
const backendHandler = require('../packages/backend/dist/api/chat.js');

// Re-export the backend handler
module.exports = backendHandler.default || backendHandler;
