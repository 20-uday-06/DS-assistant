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

    // Get analytics data
    const totalQueries = await ChatHistory.countDocuments();
    const totalSessions = await ChatHistory.distinct('sessionId').then(sessions => sessions.length);

    // Get top topics (simplified - just count queries by first word)
    const topTopics = await ChatHistory.aggregate([
      {
        $project: {
          firstWord: { $arrayElemAt: [{ $split: ['$query', ' '] }, 0] }
        }
      },
      {
        $group: {
          _id: '$firstWord',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          topic: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    const averageQueriesPerSession = totalSessions > 0 
      ? (totalQueries / totalSessions).toFixed(2)
      : '0';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalSessions,
        totalQueries,
        topTopics,
        averageQueriesPerSession
      })
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
