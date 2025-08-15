const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build the system prompt with venue context
    const systemPrompt = `You are an AI assistant for Jack's on Water Street, a venue using VenueSync to manage operations. 
You have access to real-time data from Toast POS showing revenue, transactions, and customer data.
Today's revenue so far: $1,160.60 from 100 transactions.
The venue is closed on Mondays. Current timezone is EDT.
Help the user understand their venue data and suggest optimizations.`;

    // Create the message
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      system: systemPrompt,
    });

    return res.status(200).json({
      success: true,
      response: completion.content[0].text,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process chat request',
    });
  }
};
