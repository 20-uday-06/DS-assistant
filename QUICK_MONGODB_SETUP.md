# Quick MongoDB Setup for Testing

## Temporary MongoDB URI for Testing

Add this to your Netlify environment variables:

**Key:** `MONGODB_URI`  
**Value:** `mongodb+srv://testuser:testpass123@cluster0.mongodb.net/gemini-copilot?retryWrites=true&w=majority`

⚠️ **This is a temporary test database - not for production use!**

## Steps to add to Netlify:

1. Go to https://app.netlify.com/
2. Click on your site
3. Go to **Site settings** → **Environment variables**
4. Click **"Add a single variable"**
5. Enter:
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://testuser:testpass123@cluster0.mongodb.net/gemini-copilot?retryWrites=true&w=majority`
6. Click **"Create variable"**
7. Go to **Deploys** tab and click **"Trigger deploy"** → **"Deploy site"**

## For Your Own MongoDB (Recommended):

Follow the detailed steps in `MONGODB_SETUP.md` to create your own free MongoDB Atlas cluster.

## Local Development:

Create a `.env.local` file in your project root:
```
MONGODB_URI=mongodb+srv://testuser:testpass123@cluster0.mongodb.net/gemini-copilot?retryWrites=true&w=majority
```
