const mongoose = require('mongoose');

// Define the schema directly in the function
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

const connectToDatabase = async () => {
    if (mongoose.connections[0].readyState) {
        return;
    }
    
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini-copilot');
        console.log('Connected to MongoDB');
        
        // Create model only if it doesn't exist
        if (!ChatHistory) {
            ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
        }
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        await connectToDatabase();
        
        const limit = parseInt(event.queryStringParameters?.limit) || 50;
        
        // Get all sessions sorted by last updated
        const sessions = await ChatHistory.find()
            .sort({ lastUpdated: -1 })
            .limit(limit);

        const globalHistory = [];
        
        sessions.forEach(session => {
            session.userQueries.forEach(query => {
                globalHistory.push({
                    query: query.query,
                    sessionId: session.sessionId,
                    timestamp: query.timestamp
                });
            });
        });
        
        // Sort by timestamp descending
        globalHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Return top N results
        const result = globalHistory.slice(0, limit);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('Error fetching global history:', error);
        console.error('MongoDB URI available:', !!process.env.MONGODB_URI);
        console.error('Error details:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to fetch global history',
                debug: {
                    hasMongoUri: !!process.env.MONGODB_URI,
                    errorMessage: error.message,
                    timestamp: new Date().toISOString()
                }
            }),
        };
    }
};
