# MongoDB Setup for Netlify Deployment

## Option 1: MongoDB Atlas (Recommended - Free)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new project (e.g., "Gemini Copilot")

### Step 2: Create a Cluster
1. Click "Create a New Cluster"
2. Choose "M0 Sandbox" (FREE)
3. Select a region close to you
4. Click "Create Cluster"

### Step 3: Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `gemini-user` (or any name you prefer)
5. Password: Generate a secure password (save this!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for Netlify functions)
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://gemini-user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add `/gemini-copilot` before the `?` to specify the database name:
   ```
   mongodb+srv://gemini-user:yourpassword@cluster0.xxxxx.mongodb.net/gemini-copilot?retryWrites=true&w=majority
   ```

### Step 6: Add to Netlify Environment Variables
1. Go to your Netlify dashboard
2. Go to your site → Site settings → Environment variables
3. Click "Add a single variable"
4. Key: `MONGODB_URI`
5. Value: Your connection string from Step 5
6. Click "Create variable"

### Step 7: Redeploy
1. Go to your site's "Deploys" tab
2. Click "Trigger deploy" → "Deploy site"
3. Wait for deployment to complete

## Option 2: Quick Test with Free MongoDB

If you want to test quickly, you can use this temporary MongoDB URI (not for production):

```
mongodb+srv://testuser:testpass123@cluster0.mongodb.net/gemini-copilot?retryWrites=true&w=majority
```

⚠️ **Warning**: This is a temporary test database. Use only for testing!

## Verify Setup

After adding the environment variable and redeploying, visit:
- https://your-site.netlify.app/.netlify/functions/test-db

You should see a success message if the connection works.

## Local Development

For local development, create a `.env.local` file:
```
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/gemini-copilot?retryWrites=true&w=majority
```

## Troubleshooting

If you get connection errors:
1. Check that your IP is whitelisted (or use "Allow from anywhere")
2. Verify username/password in the connection string
3. Make sure the database name is included in the URI
4. Check Netlify function logs for specific error messages
