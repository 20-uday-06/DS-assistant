const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const ChatHistory = require('./models/ChatHistory');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini-copilot');

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

// Routes

// Get all chat sessions (summaries only)
app.get('/api/history', async (req, res) => {
    try {
        const sessions = await ChatHistory.find({}, {
            sessionId: 1,
            summary: 1,
            createdAt: 1,
            lastUpdated: 1,
            'userQueries.timestamp': 1
        }).sort({ lastUpdated: -1 });

        const formattedSessions = sessions.map(session => ({
            sessionId: session.sessionId,
            summary: session.summary,
            createdAt: session.createdAt,
            lastUpdated: session.lastUpdated,
            queryCount: session.userQueries?.length || 0
        }));

        res.json(formattedSessions);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Get global history - all users' recent queries (for global history view)
app.get('/api/history/global', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
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
        res.json(globalHistory.slice(0, limit));
    } catch (error) {
        console.error('Error fetching global history:', error);
        res.status(500).json({ error: 'Failed to fetch global history' });
    }
});

// Get global history - all users' recent queries (for global history view) - legacy route
app.get('/api/history/global/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        
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
        res.json(globalHistory.slice(0, limit));
    } catch (error) {
        console.error('Error fetching global history:', error);
        res.status(500).json({ error: 'Failed to fetch global history' });
    }
});

// Get specific chat session with user queries
app.get('/api/history/:sessionId', async (req, res) => {
    try {
        const session = await ChatHistory.findOne({ sessionId: req.params.sessionId });
        
        if (!session) {
            return res.status(404).json({ error: 'Chat session not found' });
        }

        res.json({
            sessionId: session.sessionId,
            summary: session.summary,
            userQueries: session.userQueries,
            createdAt: session.createdAt,
            lastUpdated: session.lastUpdated
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch chat session' });
    }
});

// Add or update chat session
app.post('/api/history', async (req, res) => {
    try {
        const { sessionId, userQuery, summary } = req.body;

        if (!sessionId || !userQuery) {
            return res.status(400).json({ error: 'SessionId and userQuery are required' });
        }

        let session = await ChatHistory.findOne({ sessionId });

        if (session) {
            // Add new query to existing session
            session.userQueries.push({
                query: userQuery,
                timestamp: new Date()
            });
            
            // Update summary if provided
            if (summary) {
                session.summary = summary;
            }
        } else {
            // Create new session
            session = new ChatHistory({
                sessionId,
                summary: summary || userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : ''),
                userQueries: [{
                    query: userQuery,
                    timestamp: new Date()
                }]
            });
        }

        await session.save();
        res.json({ 
            message: 'Chat history updated successfully',
            sessionId: session.sessionId 
        });
    } catch (error) {
        console.error('Error saving history:', error);
        res.status(500).json({ error: 'Failed to save chat history' });
    }
});

// Get analytics - total sessions, queries, popular topics
app.get('/api/analytics', async (req, res) => {
    try {
        const totalSessions = await ChatHistory.countDocuments();
        const allSessions = await ChatHistory.find();
        
        let totalQueries = 0;
        const topics = {};
        
        allSessions.forEach(session => {
            totalQueries += session.userQueries.length;
            
            // Simple topic extraction from summaries
            const words = session.summary.toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3);
            
            words.forEach(word => {
                topics[word] = (topics[word] || 0) + 1;
            });
        });
        
        // Get top 10 topics
        const topTopics = Object.entries(topics)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([topic, count]) => ({ topic, count }));
        
        res.json({
            totalSessions,
            totalQueries,
            topTopics,
            averageQueriesPerSession: totalSessions > 0 ? (totalQueries / totalSessions).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
