# Deployment Guide

This guide will help you deploy the Analytics Engine to various cloud platforms.

## Prerequisites

- Git repository with your code
- Google OAuth credentials configured
- Database connection details

## Option 1: Deploy to Render (Recommended)

### Step 1: Create Render Account
Sign up at [render.com](https://render.com)

### Step 2: Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Name: `analytics-db`
3. Choose free tier or paid plan
4. Note the connection string

### Step 3: Create Redis Instance
1. Click "New +" → "Redis"
2. Name: `analytics-redis`
3. Choose free tier
4. Note the connection string

### Step 4: Deploy Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `analytics-engine`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free or Starter

### Step 5: Add Environment Variables
Add these in Render dashboard:

```
NODE_ENV=production
DATABASE_URL=<from step 2>
REDIS_URL=<from step 3>
GOOGLE_CLIENT_ID=<your Google client ID>
GOOGLE_CLIENT_SECRET=<your Google client secret>
GOOGLE_CALLBACK_URL=https://your-app.onrender.com/api/auth/google/callback
SESSION_SECRET=<generate a random string>
APP_URL=https://your-app.onrender.com
FRONTEND_URL=https://your-app.onrender.com
```

### Step 6: Deploy
Click "Create Web Service" and wait for deployment to complete.

### Step 7: Initialize Database
Use Render's shell to run:
```bash
psql $DATABASE_URL -f src/database/schema.sql
```

---

## Option 2: Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Project
```bash
railway init
```

### Step 3: Add Services
```bash
railway add postgresql
railway add redis
```

### Step 4: Set Environment Variables
```bash
railway variables set GOOGLE_CLIENT_ID=your_client_id
railway variables set GOOGLE_CLIENT_SECRET=your_secret
railway variables set SESSION_SECRET=random_secret
```

### Step 5: Deploy
```bash
railway up
```

Railway will automatically detect Node.js and deploy your application.

---

## Option 3: Deploy to Heroku

### Step 1: Install Heroku CLI
```bash
brew install heroku/brew/heroku  # macOS
```

### Step 2: Create App
```bash
heroku create analytics-engine
```

### Step 3: Add Add-ons
```bash
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
```

### Step 4: Set Config Vars
```bash
heroku config:set GOOGLE_CLIENT_ID=your_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_secret
heroku config:set SESSION_SECRET=random_secret
heroku config:set NODE_ENV=production
```

### Step 5: Deploy
```bash
git push heroku main
```

### Step 6: Initialize Database
```bash
heroku pg:psql < src/database/schema.sql
```

---

## Option 4: Deploy with Docker on AWS/GCP/Azure

### Build and Push Docker Image
```bash
# Build
docker build -t analytics-engine .

# Tag for your registry
docker tag analytics-engine:latest your-registry/analytics-engine:latest

# Push
docker push your-registry/analytics-engine:latest
```

### Deploy on AWS ECS
1. Create ECS cluster
2. Create task definition using your Docker image
3. Configure environment variables
4. Create RDS PostgreSQL instance
5. Create ElastiCache Redis instance
6. Deploy service

### Deploy on Google Cloud Run
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/analytics-engine
gcloud run deploy analytics-engine \
  --image gcr.io/PROJECT_ID/analytics-engine \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Post-Deployment Checklist

- [ ] Verify health endpoint: `https://your-app.com/health`
- [ ] Test API documentation: `https://your-app.com/api-docs`
- [ ] Test Google OAuth flow
- [ ] Create test API key
- [ ] Send test analytics event
- [ ] Check database connectivity
- [ ] Verify Redis caching
- [ ] Test rate limiting
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerts
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS (should be automatic)
- [ ] Update README with deployment URL

---

## Google OAuth Configuration

After deploying, update your Google OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to "APIs & Services" → "Credentials"
4. Edit your OAuth 2.0 Client
5. Add authorized redirect URIs:
   ```
   https://your-app.onrender.com/api/auth/google/callback
   ```

---

## Monitoring and Maintenance

### Check Logs
```bash
# Render
View in dashboard under "Logs" tab

# Railway
railway logs

# Heroku
heroku logs --tail
```

### Database Backups
Most platforms provide automatic backups, but you can also:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Performance Monitoring
Consider adding:
- Sentry for error tracking
- New Relic for performance monitoring
- Datadog for comprehensive monitoring

---

## Scaling

### Horizontal Scaling
- Render: Increase instance count in settings
- Railway: Auto-scales based on load
- Heroku: `heroku ps:scale web=3`

### Database Scaling
- Upgrade to larger database plans
- Add read replicas for heavy read workloads
- Consider connection pooling services like PgBouncer

### Redis Scaling
- Upgrade to larger Redis instances
- Consider Redis Cluster for high availability

---

## Troubleshooting

### Issue: Application won't start
- Check environment variables are set correctly
- Verify database connection string
- Check logs for specific errors

### Issue: Google OAuth not working
- Verify redirect URI matches exactly
- Check client ID and secret
- Ensure HTTPS is enabled

### Issue: Slow queries
- Check database indexes are created
- Verify Redis is connected
- Review query patterns in logs

### Issue: High memory usage
- Reduce connection pool size
- Implement pagination for large datasets
- Check for memory leaks

---

## Support

If you encounter issues:
1. Check application logs
2. Verify all environment variables
3. Test database connectivity
4. Review the README for requirements
5. Contact support for your hosting platform
