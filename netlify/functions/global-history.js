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

const ChatHistory = mongoose.models.ChatHistory || mongoose.model('ChatHistory', chatHistorySchema);

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini-copilot';
    console.log('Connecting to MongoDB...');
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    await connectToDatabase();

    const limit = parseInt(event.queryStringParameters?.limit) || 50;
    
    const recentQueries = await ChatHistory.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('query sessionId timestamp');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(recentQueries)
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
