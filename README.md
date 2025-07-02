# Gemini Data Science Co-Pilot

A comprehensive React-based AI assistant for data science workflows, featuring chat capabilities, code interpretation, file analysis, and global collaboration through MongoDB-backed chat history.

## ✨ Features

- **AI Chat Assistant**: Interactive conversations with streaming responses and LaTeX support
- **Code Interpreter**: Execute Python/SQL code with live output
- **File Analysis**: Upload and analyze datasets with AI insights
- **Learning Hub**: Personalized learning recommendations
- **Model Suggester**: Get ML model recommendations based on your data
- **Visualization Tools**: Create data visualizations and charts
- **Global History**: View community questions and analytics across all users
- **Session Management**: Persistent chat sessions with MongoDB storage

## 🚀 Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, MongoDB
- **AI**: Google Gemini API
- **Deployment**: Netlify (frontend), Railway/Render (backend)

## 📦 Run Locally

**Prerequisites:** Node.js, MongoDB

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the frontend:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to server directory:
   ```bash
   cd server
   npm install
   ```

2. Set up environment variables in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/gemini-copilot
   PORT=5000
   CLIENT_URL=http://localhost:5173
   ```

3. Run the backend:
   ```bash
   npm start
   ```

## 🌐 Features Overview

### AI Chat Module
- Streaming responses with real-time updates
- Mathematical formula rendering with KaTeX
- Code syntax highlighting
- Global chat history visualization
- Community analytics

### Code Interpreter
- Execute Python/SQL code snippets
- Live output display
- Error handling and debugging

### File Analysis
- Upload CSV/JSON files
- AI-powered data insights
- Statistical analysis

### Global History
- View all users' recent questions
- Community analytics dashboard
- Session-based organization

## 🛠️ Development

The project uses modern React patterns with TypeScript for type safety. Key architectural decisions:

- **Streaming**: Throttled updates for smooth UX during AI responses
- **State Management**: React hooks with careful optimization
- **Styling**: Tailwind CSS with custom design system
- **Backend**: RESTful API with MongoDB for persistence

## 📝 License

MIT License - feel free to use this project for learning and development!
