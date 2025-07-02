const mongoose = require('mongoose');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'MONGODB_URI environment variable not set',
          envVars: Object.keys(process.env).filter(key => key.includes('MONGO'))
        })
      };
    }

    // Test connection
    await mongoose.connect(mongoUri, {
      bufferCommands: false,
    });

    await mongoose.disconnect();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'MongoDB connection successful',
        mongoUri: mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') // Hide credentials
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'MongoDB connection failed',
        message: error.message,
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
      })
    };
  }
};
