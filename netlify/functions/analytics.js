const mongoose = require('mongoose');

// Chat History Schema - Updated to match history-global.js
const chatHistorySchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    userQueries: [{
        query: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
});

let ChatHistory;

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      bufferCommands: false,
      bufferMaxEntries: 0
    });
    
    isConnected = true;
    
    // Create model only if it doesn't exist
    if (!ChatHistory) {
      ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
    }
    
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

    // Get analytics data from sessions with userQueries
    const totalSessions = await ChatHistory.countDocuments();
    
    // Get total queries by aggregating userQueries arrays
    const totalQueriesResult = await ChatHistory.aggregate([
      {
        $project: {
          queryCount: { $size: '$userQueries' }
        }
      },
      {
        $group: {
          _id: null,
          totalQueries: { $sum: '$queryCount' }
        }
      }
    ]);
    
    const totalQueries = totalQueriesResult.length > 0 ? totalQueriesResult[0].totalQueries : 0;

    // Get top topics from userQueries
    const topTopics = await ChatHistory.aggregate([
      {
        $unwind: '$userQueries'
      },
      {
        $project: {
          firstWord: { $arrayElemAt: [{ $split: ['$userQueries.query', ' '] }, 0] }
        }
      },
      {
        $group: {
          _id: { $toLower: '$firstWord' },
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
    console.error('MongoDB URI available:', !!process.env.MONGODB_URI);
    console.error('Error details:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        debug: {
          hasMongoUri: !!process.env.MONGODB_URI,
          errorMessage: error.message,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};
