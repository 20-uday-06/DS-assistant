exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const envCheck = {
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString(),
    availableEnvVars: Object.keys(process.env).filter(key => 
      key.includes('MONGO') || key.includes('DATABASE') || key.includes('DB')
    )
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(envCheck, null, 2),
  };
};
