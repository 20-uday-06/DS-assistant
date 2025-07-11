const mongoose = require('mongoose');

// Define the schema
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
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gemini-copilot');
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        await connectToDatabase();

        // Add sample data
        const sampleData = [
            {
                sessionId: "session_data_analysis_1",
                summary: "Data analysis with pandas and matplotlib",
                userQueries: [
                    { query: "How to read CSV files in pandas?", timestamp: new Date() },
                    { query: "Create a scatter plot with matplotlib", timestamp: new Date() }
                ]
            },
            {
                sessionId: "session_machine_learning_1",
                summary: "Machine learning with scikit-learn",
                userQueries: [
                    { query: "How to train a linear regression model?", timestamp: new Date() },
                    { query: "Cross-validation techniques", timestamp: new Date() }
                ]
            },
            {
                sessionId: "session_data_viz_1",
                summary: "Data visualization techniques",
                userQueries: [
                    { query: "Create interactive plots with plotly", timestamp: new Date() },
                    { query: "Seaborn heatmap examples", timestamp: new Date() }
                ]
            }
        ];

        // Insert sample data
        for (const data of sampleData) {
            await ChatHistory.findOneAndUpdate(
                { sessionId: data.sessionId },
                {
                    $set: {
                        summary: data.summary,
                        lastUpdated: new Date()
                    },
                    $addToSet: {
                        userQueries: { $each: data.userQueries }
                    }
                },
                { upsert: true, new: true }
            );
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Sample data added successfully',
                count: sampleData.length
            })
        };

    } catch (error) {
        console.error('Error seeding data:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to seed data' })
        };
    }
};
