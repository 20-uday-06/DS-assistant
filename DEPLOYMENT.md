# 🚀 Netlify Deployment Guide

## Prerequisites
1. **GitHub Repository**: Your code should be pushed to GitHub
2. **MongoDB Atlas**: Set up a cloud MongoDB database (free tier available)
3. **Netlify Account**: Free account at netlify.com

## Environment Variables

You'll need to set these environment variables in Netlify:

### Required:
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key
- `MONGODB_URI`: Your MongoDB Atlas connection string

### Optional:
- `NODE_VERSION`: Set to `18` (should be set automatically)

## Deployment Steps

### 1. Connect to GitHub
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`

### 2. Set Environment Variables
1. Go to Site settings → Environment variables
2. Add the required variables:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gemini-copilot
   ```

### 3. MongoDB Atlas Setup
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier is sufficient)
3. Create a database user with read/write permissions
4. Get the connection string and add it to Netlify environment variables
5. Make sure to whitelist Netlify's IP addresses (or use 0.0.0.0/0 for all IPs)

### 4. Deploy
1. Click "Deploy site"
2. Netlify will automatically build and deploy your app
3. Your app will be available at `https://your-site-name.netlify.app`

## Features After Deployment

✅ **Working Features:**
- AI Chat with interview-focused responses
- Learning Hub with comprehensive educational content
- Global chat history (saved to MongoDB)
- History module showing all conversations
- Analytics dashboard
- Robust streaming (no message collapse)
- Math/LaTeX rendering
- Dark/light mode
- Responsive design

✅ **Serverless Backend:**
- Netlify Functions handle all API requests
- MongoDB Atlas for data persistence
- Automatic scaling
- No server maintenance required

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all dependencies are installed
2. **Functions Don't Work**: Verify MongoDB connection string
3. **History Not Saving**: Check environment variables in Netlify
4. **API Errors**: Verify Gemini API key is correct

### Debug Steps:
1. **Test MongoDB Connection**: Visit `https://your-site.netlify.app/api/test-db`
2. **Check Netlify Function logs**: Go to Netlify Dashboard → Functions → View logs
3. **Verify environment variables**: Site settings → Environment variables
4. **Test MongoDB connection string locally**: Use MongoDB Compass or mongo shell
5. **Check browser console**: F12 → Console tab for frontend errors

### Debugging History Issues:
If chat history isn't saving:

1. **Check Environment Variables**: Ensure `MONGODB_URI` is correctly set in Netlify
2. **Test Database Connection**: Visit `/api/test-db` endpoint
3. **Check Network Tab**: F12 → Network tab, look for failed API calls
4. **View Function Logs**: Netlify Dashboard → Functions → View logs for errors
5. **Verify MongoDB Atlas**: 
   - Database user has read/write permissions
   - IP whitelist includes 0.0.0.0/0 (or specific Netlify IPs)
   - Cluster is running and accessible

### Expected Behavior:
- Chat messages should save to MongoDB when sent
- History module should show saved conversations
- Global history should display community questions
- Analytics should show usage statistics

### Recent Fixes Applied (v2.0):
✅ **502 Error Fixed**: Restored empty `history.js` Netlify function
✅ **KaTeX Hash Updated**: Fixed CSS integrity hash mismatch  
✅ **Framer Motion**: Removed conflicting script tag (v10 vs v12)
✅ **Tailwind Production**: Replaced CDN with proper build process
✅ **CSS Optimization**: Added proper Tailwind directives and build

### Deployment Status:
- ✅ **Build**: Successfully compiles and deploys
- ✅ **Functions**: All Netlify functions working
- ✅ **Frontend**: No console errors
- ✅ **History**: MongoDB integration functional

**Latest Deploy**: All issues resolved in latest commit

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (for local development)
cd server && node server.js
```

## Production URLs

- **Frontend**: Your Netlify app URL
- **API**: Same domain, under `/api/` (handled by functions)
- **Database**: MongoDB Atlas cluster
