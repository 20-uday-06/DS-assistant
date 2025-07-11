# Deployment Instructions for Netlify

## Environment Variables Required

To make this app work correctly in production, you need to set the following environment variables in your Netlify dashboard:

### 1. Go to Netlify Dashboard
- Log in to your Netlify account
- Go to your site settings
- Click on "Environment variables" in the left sidebar

### 2. Add Required Variables

**MONGODB_URI**
- Key: `MONGODB_URI`
- Value: Your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster.mongodb.net/gemini-copilot?retryWrites=true&w=majority`)

**GEMINI_API_KEY**
- Key: `GEMINI_API_KEY`
- Value: Your Google Gemini API key

**VITE_GEMINI_API_KEY**
- Key: `VITE_GEMINI_API_KEY`
- Value: Same as GEMINI_API_KEY (for client-side access)

### 3. MongoDB Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get the connection string from "Connect" > "Connect your application"
5. Replace `<username>`, `<password>`, and `<database_name>` with your actual values

### 4. Testing the Deployment

After setting the environment variables:

1. Check if the functions are working:
   ```bash
   curl https://YOUR_SITE_URL/.netlify/functions/test-env
   ```

2. Test the history endpoint:
   ```bash
   curl https://YOUR_SITE_URL/.netlify/functions/history-global
   ```

3. Test the analytics endpoint:
   ```bash
   curl https://YOUR_SITE_URL/.netlify/functions/analytics
   ```

## Troubleshooting

### Function Timeout Issues
- Check that MONGODB_URI is set correctly
- Verify the MongoDB connection string format
- Ensure the database user has proper permissions

### CORS Issues
- Functions already include CORS headers
- Make sure the domain is allowed in MongoDB Atlas network access

### Local Development
To test locally:
1. Create a `.env.local` file with your environment variables
2. Run `netlify dev` to start the local development server
3. The functions will be available at `http://localhost:8888/.netlify/functions/`

## Production URLs

- **Main App**: https://ai-datascience-assistant.netlify.app
- **Functions**: https://ai-datascience-assistant.netlify.app/.netlify/functions/
- **History**: https://ai-datascience-assistant.netlify.app/.netlify/functions/history-global
- **Analytics**: https://ai-datascience-assistant.netlify.app/.netlify/functions/analytics
