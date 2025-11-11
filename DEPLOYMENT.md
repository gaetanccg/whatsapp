# Deployment Guide

This guide covers deploying the WhatsApp Clone application to production using Render.

## Prerequisites

- GitHub account with repository
- Render account (https://render.com)
- MongoDB Atlas account
- Sentry account (optional, for error tracking)

## Step 1: MongoDB Setup

1. Go to https://cloud.mongodb.com
2. Create a new cluster or use existing one
3. Create a database user with read/write permissions
4. Whitelist all IP addresses (0.0.0.0/0) for Render access
5. Get your connection string - it should look like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority
   ```

## Step 2: Sentry Setup (Optional)

1. Go to https://sentry.io
2. Create a new project for backend (Node.js)
3. Create a new project for frontend (Vue.js)
4. Get DSN for both projects
5. Generate an Auth Token from Settings > Account > API > Auth Tokens

## Step 3: Deploy Backend to Render

1. Go to https://render.com and login
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: whatsapp-clone-backend
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or paid

5. Add Environment Variables:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<generate-a-secure-random-string>
   NODE_ENV=production
   FRONTEND_URL=<your-frontend-url-will-add-later>
   PORT=5000
   SENTRY_DSN=<your-backend-sentry-dsn>
   ```

6. Click "Create Web Service"
7. Wait for deployment to complete
8. Note your backend URL (e.g., https://whatsapp-clone-backend.onrender.com)

## Step 4: Deploy Frontend to Render

1. In Render, click "New +" and select "Static Site"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: whatsapp-clone-frontend
   - **Branch**: main
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: frontend/dist

4. Add Environment Variables:
   ```
   VITE_API_URL=<your-backend-url>/api
   VITE_SOCKET_URL=<your-backend-url>
   VITE_SENTRY_DSN=<your-frontend-sentry-dsn>
   ```

5. Click "Create Static Site"
6. Wait for deployment to complete
7. Note your frontend URL (e.g., https://whatsapp-clone-frontend.onrender.com)

## Step 5: Update Backend Environment Variables

1. Go back to your backend service in Render
2. Update the `FRONTEND_URL` environment variable with your actual frontend URL
3. Save and wait for redeploy

## Step 6: Configure GitHub Actions

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

```
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
RENDER_API_KEY=<get-from-render-account-settings>
RENDER_BACKEND_SERVICE_ID=<found-in-backend-service-url>
RENDER_FRONTEND_SERVICE_ID=<found-in-frontend-service-url>
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
SENTRY_ORG=<your-sentry-organization-slug>
VITE_API_URL=<your-backend-url>/api
VITE_SOCKET_URL=<your-backend-url>
VITE_SENTRY_DSN=<your-frontend-sentry-dsn>
```

To find Render Service IDs:
- Backend: Look at URL in browser (e.g., srv-xxxxx)
- Frontend: Look at URL in browser (e.g., srv-yyyyy)

To get Render API Key:
1. Go to Render Dashboard
2. Click on your profile icon
3. Go to Account Settings
4. Under API Keys, create a new key

## Step 7: Test Deployment

1. Visit your frontend URL
2. Register a new account
3. Try logging in
4. Test sending messages
5. Check Sentry for any errors

## Monitoring

### Render Dashboard
- Monitor logs in real-time
- Check CPU and memory usage
- View deployment history

### Sentry
- Track errors and exceptions
- Monitor performance
- Set up alerts for critical issues

## Troubleshooting

### Backend won't start
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check Render logs for errors

### Frontend can't connect to backend
- Verify VITE_API_URL and VITE_SOCKET_URL are correct
- Check CORS settings in backend
- Ensure backend is running

### Database connection fails
- Verify MongoDB IP whitelist includes 0.0.0.0/0
- Check MongoDB user permissions
- Verify connection string format

### WebSocket connection fails
- Ensure backend URL uses https:// (not http://)
- Check firewall settings
- Verify Socket.IO configuration

## Updating the Application

### Automatic Deployment (via GitHub)
1. Push changes to main branch
2. GitHub Actions will run tests
3. If tests pass, application deploys automatically to Render

### Manual Deployment
1. Go to Render dashboard
2. Select your service
3. Click "Manual Deploy"
4. Select branch to deploy

## Production Checklist

- [ ] MongoDB connection string configured
- [ ] JWT secret set (use strong random string)
- [ ] Frontend URL configured in backend
- [ ] Backend URL configured in frontend
- [ ] CORS configured properly
- [ ] Environment variables set on Render
- [ ] GitHub secrets configured
- [ ] Sentry configured (optional)
- [ ] Test registration and login
- [ ] Test real-time messaging
- [ ] Test on mobile devices
- [ ] Check error logs in Sentry
- [ ] Monitor performance in Render

## Cost Optimization

### Free Tier Limits (Render)
- Backend: Spins down after 15 minutes of inactivity
- Frontend: Always available
- MongoDB Atlas: 512MB free tier

### Tips
1. Use Render's free tier for testing
2. Upgrade to paid tier for production
3. Monitor MongoDB usage
4. Set up alerts for quota limits

## Security Recommendations

1. **Strong JWT Secret**: Use a cryptographically secure random string
2. **Database Credentials**: Never commit to git
3. **HTTPS Only**: Ensure all connections use HTTPS
4. **Rate Limiting**: Consider adding rate limiting middleware
5. **Input Validation**: Validate all user inputs
6. **Regular Updates**: Keep dependencies updated
7. **Backup Database**: Regular MongoDB backups
8. **Monitor Logs**: Regular security audit via logs

## Support

For issues:
1. Check Render logs
2. Check Sentry error reports
3. Review GitHub Actions workflow runs
4. Check MongoDB Atlas metrics

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Socket.IO Documentation](https://socket.io/docs/)
