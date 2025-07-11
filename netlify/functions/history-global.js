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
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database connection timeout')), 10000);
        });

        await Promise.race([connectToDatabase(), timeoutPromise]);
        
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
        
        // Return mock data if database connection fails
        const mockData = [
            {
                query: "How to create a pandas DataFrame?",
                sessionId: "mock_session_1",
                timestamp: new Date().toISOString()
            },
            {
                query: "Machine learning with scikit-learn",
                sessionId: "mock_session_2", 
                timestamp: new Date(Date.now() - 3600000).toISOString()
            }
        ];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(mockData),
        };
    }
};
