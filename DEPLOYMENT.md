# Deployment Guide

## 🚀 Deployment Options

### Frontend Deployment (Netlify)

1. **Connect to Netlify**:
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Select the main branch

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**:
   - Add `GEMINI_API_KEY` in Netlify dashboard

### Backend Deployment (Railway/Render)

#### Option 1: Railway

1. **Connect to Railway**:
   - Go to [Railway](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose the `server` folder as root

2. **Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://your-mongo-connection-string
   PORT=5000
   CLIENT_URL=https://your-netlify-app.netlify.app
   ```

#### Option 2: Render

1. **Connect to Render**:
   - Go to [Render](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Root directory: `server`

2. **Build & Start Commands**:
   - Build command: `npm install`
   - Start command: `npm start`

3. **Environment Variables**: Same as Railway

### Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a free cluster

2. **Get Connection String**:
   - Create database user
   - Whitelist IP addresses (0.0.0.0/0 for testing)
   - Get connection string

3. **Update Environment Variables**:
   - Replace local MongoDB URI with Atlas connection string

## 🔧 Production Considerations

1. **Security**:
   - Use strong database passwords
   - Implement proper CORS settings
   - Add rate limiting to API endpoints

2. **Performance**:
   - Enable gzip compression
   - Add caching headers
   - Optimize database queries with indexes

3. **Monitoring**:
   - Set up error tracking (Sentry)
   - Monitor API performance
   - Set up uptime monitoring

## 🌐 Live Demo

Once deployed:
- Frontend: Your Netlify URL
- Backend API: Your Railway/Render URL
- Database: MongoDB Atlas cluster

The global history feature will work across all users, showing community questions and analytics in real-time!
