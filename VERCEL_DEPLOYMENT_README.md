# Vercel Deployment Guide for SkillConnect

This guide explains how to deploy the SkillConnect backend and frontend to Vercel.

## Prerequisites

1. Vercel account
2. MongoDB Atlas database (or compatible MongoDB instance)
3. Cloudinary account for image uploads
4. Gmail account for email notifications

## Project Structure

```
skillconnect4b4103/
├── backend/          # Express.js API server
├── frontend/         # React web application
└── mobile-frontend/  # React Native mobile app
```

## Backend Deployment

### 1. Environment Variables Setup

In your Vercel dashboard, set these environment variables for the backend:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/skillconnect

# JWT
JWT_SECRET_KEY=your_secure_jwt_secret_key
ADMIN_JWT_SECRET_KEY=your_secure_admin_jwt_secret_key

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URLs (comma-separated)
FRONTEND_URL=https://your-frontend.vercel.app,https://your-mobile-app.expo.app

# Email (Gmail SMTP)
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

### 2. Deploy Backend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: (leave empty)
5. Add all environment variables listed above
6. Click "Deploy"

### Important Notes for Backend

- **Socket.IO Limitations**: Vercel's serverless functions have limitations with WebSocket connections. Real-time features may not work perfectly in production. Consider using alternatives like Pusher or Socket.io with a dedicated server for production.
- **Function Timeout**: Serverless functions timeout after 30 seconds. Long-running operations may fail.
- **File Uploads**: Large file uploads may be limited by Vercel's payload size limits.

## Frontend Deployment

### 1. Environment Variables Setup

In your Vercel dashboard, set these environment variables for the frontend:

```bash
VITE_API_BASE_URL=https://your-backend.vercel.app/api/v1
```

### 2. Deploy Frontend

1. In Vercel Dashboard, click "New Project"
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the environment variable above
5. Click "Deploy"

## Mobile App Configuration

The mobile app should work with the deployed backend. Update the API base URL in:

- `mobile-frontend/api.js`
- `mobile-frontend/utils/socket.js`

Change the localhost URLs to your deployed backend URL.

## Deployment Order

1. **Deploy Backend First** - Get the backend URL
2. **Update Frontend Environment** - Use backend URL in frontend env vars
3. **Deploy Frontend** - Deploy frontend with correct API URL
4. **Update Mobile App** - Update mobile app to use production URLs

## Testing After Deployment

1. **Backend Health Check**: Visit `https://your-backend.vercel.app/api/v1/ping`
2. **Frontend**: Check if the web app loads and can communicate with backend
3. **Authentication**: Test user registration and login
4. **Core Features**: Test service requests, bookings, chat (may have limitations)

## Known Limitations

### Socket.IO on Vercel
- WebSocket connections may disconnect frequently
- Real-time chat may not work reliably
- Consider implementing polling fallbacks or using dedicated WebSocket services

### Performance
- Cold starts may cause delays
- Database connections may timeout
- File uploads are limited

### CORS
- Ensure all frontend URLs are properly configured in `FRONTEND_URL`

## Alternative Deployment Options

For better real-time performance, consider:

1. **Railway** or **Render** for backend (better for WebSockets)
2. **AWS Lambda + API Gateway** with persistent connections
3. **Dedicated VPS** for full control

## Troubleshooting

### Backend Issues
- Check Vercel function logs
- Verify environment variables are set correctly
- Test database connectivity

### Frontend Issues
- Check browser console for API errors
- Verify API base URL is correct
- Check CORS headers

### Mobile App Issues
- Ensure API URLs are updated
- Test on physical device (not just emulator)

## Support

If you encounter issues, check:
1. Vercel deployment logs
2. Environment variable configuration
3. Network connectivity
4. Database accessibility
# Example Backend Variables
MONGO_URI=mongodb+srv://skillconnect:16FapDsSca9IcpV2@skillconnect4b410.lceuwef.mongodb.net/skillconnect
JWT_SECRET_KEY=sk8d7f9s8d7f98s7df98s7df98s7df98s7df98s7df9
ADMIN_JWT_SECRET_KEY=admin_sk8d7f9s8d7f98s7df98s7df98s7df98s7df98s7df9
CLOUDINARY_CLOUD_NAME=db4lzcrn6
CLOUDINARY_API_KEY=121315516553495
CLOUDINARY_API_SECRET=ul98WW9Nx3b5kcsruZWctzem3Xw
FRONTEND_URL=https://skillconnect-frontend.vercel.app,https://skillconnect-mobile.expo.app
SMTP_EMAIL=skillconnect4b410@gmail.com
SMTP_PASSWORD=vtbe tawp cpnr jpxm

# Example Frontend Variables
VITE_API_BASE_URL=https://skillconnect-backend.vercel.app/api/v1
