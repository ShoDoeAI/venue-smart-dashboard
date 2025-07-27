// This file wraps the TypeScript chat handler for Vercel Functions
const handler = require('../packages/backend/dist/api/chat.js').default;

module.exports = handler;
