# Gemini Data Science Co-pilot Backend

This backend provides MongoDB-based chat history storage for the Gemini Data Science Co-pilot application.

## Setup

1. Install MongoDB locally or use MongoDB Atlas
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/gemini-copilot
   CLIENT_URL=http://localhost:5173
   PORT=5000
   ```

## Running the Server

Development mode with auto-restart:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

- `GET /api/history` - Get all chat session summaries
- `GET /api/history/:sessionId` - Get specific chat session with user queries
- `POST /api/history` - Add or update chat session
- `GET /api/health` - Health check

## MongoDB Schema

The chat history is stored with the following structure:
- `sessionId`: Unique identifier for the chat session
- `summary`: Brief summary of the conversation
- `userQueries`: Array of user queries with timestamps
- `createdAt`: Session creation timestamp
- `lastUpdated`: Last update timestamp
