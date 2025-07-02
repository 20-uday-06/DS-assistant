const mongoose = require('mongoose');

// Chat History Schema
const chatHistorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create model only if it doesn't exist
const ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', chatHistorySchema);

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini-copilot';
    await mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await connectToDatabase();

    if (event.httpMethod === 'POST') {
      // Save user query
      const { sessionId, query, summary } = JSON.parse(event.body);

      if (!sessionId || !query || !summary) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      const chatEntry = new ChatHistory({
        sessionId,
        query,
        summary,
        timestamp: new Date()
      });

      await chatEntry.save();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Query saved successfully', id: chatEntry._id })
      };
    }

    if (event.httpMethod === 'GET') {
      // Get user queries by session
      const sessionId = event.queryStringParameters?.sessionId;

      if (!sessionId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'SessionId is required' })
        };
      }

      const queries = await ChatHistory.find({ sessionId })
        .sort({ timestamp: -1 })
        .limit(50);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(queries)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
