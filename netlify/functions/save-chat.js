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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        await connectToDatabase();
        
        const { sessionId, summary, userQueries } = JSON.parse(event.body);
        
        if (!sessionId || !summary || !userQueries) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        // Check if session already exists
        let chatSession = await ChatHistory.findOne({ sessionId });
        
        if (chatSession) {
            // Update existing session
            chatSession.summary = summary;
            chatSession.userQueries = userQueries;
            chatSession.lastUpdated = new Date();
            await chatSession.save();
        } else {
            // Create new session
            chatSession = new ChatHistory({
                sessionId,
                summary,
                userQueries,
                createdAt: new Date(),
                lastUpdated: new Date()
            });
            await chatSession.save();
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                sessionId: chatSession.sessionId,
                message: 'Chat session saved successfully'
            }),
        };
    } catch (error) {
        console.error('Error saving chat session:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to save chat session' }),
        };
    }
};
