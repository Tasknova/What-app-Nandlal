# Development Setup Guide

## Running the Application Locally

To run the application with full functionality (including wallet balance), you need to run both the frontend and the proxy server.

### Option 1: Run Both Servers (Recommended)

1. **Start the Proxy Server** (Terminal 1):
   ```bash
   node proxy-server.js
   ```
   This will start the proxy server on `http://localhost:3001`

2. **Start the Frontend** (Terminal 2):
   ```bash
   npm run dev
   ```
   This will start the frontend on `http://localhost:5173`

3. **Access the Application**:
   - Frontend: `http://localhost:5173`
   - API endpoints: `http://localhost:3001/api/*`

### Option 2: Production Deployment

When deployed to Vercel, the API functions in the `/api` folder will be automatically available.

## API Endpoints Available

### Local Development (with proxy server):
- `http://localhost:3001/api/fetch-wallet-balance`
- `http://localhost:3001/api/fetch-templates`
- `http://localhost:3001/api/fetch-media`
- `http://localhost:3001/api/create-template`

### Production (Vercel):
- `https://your-domain.vercel.app/api/fetch-wallet-balance`
- `https://your-domain.vercel.app/api/fetch-templates`
- `https://your-domain.vercel.app/api/fetch-media`
- `https://your-domain.vercel.app/api/create-template`

## Troubleshooting

### 404 Error on API Endpoints

**Problem**: Getting 404 errors when trying to fetch wallet balance or other API data.

**Solutions**:

1. **Check if Proxy Server is Running**:
   ```bash
   # Check if port 3001 is in use
   netstat -an | grep 3001
   # or
   lsof -i :3001
   ```

2. **Start Proxy Server**:
   ```bash
   node proxy-server.js
   ```

3. **Check Proxy Server Logs**:
   The proxy server logs all requests to `api-requests.log` file.

### CORS Errors

**Problem**: CORS errors in browser console.

**Solution**: The proxy server handles CORS automatically. Make sure it's running.

### Network Errors

**Problem**: Network errors when fetching data.

**Solutions**:
1. Check internet connection
2. Verify API credentials are correct
3. Ensure theultimate.io API is accessible

## Testing API Endpoints

### Test Wallet Balance
```bash
node test-wallet-balance.js
```

### Test Template Creation
```bash
node test-create-template.js
```

## Development Workflow

1. **Start Development**:
   ```bash
   # Terminal 1
   node proxy-server.js
   
   # Terminal 2
   npm run dev
   ```

2. **Make Changes**: Edit your React components

3. **Test Features**: Use the application and check for errors

4. **Check Logs**: Monitor `api-requests.log` for API request details

5. **Deploy**: When ready, deploy to Vercel for production

## Environment Variables

For local development, you can create a `.env.local` file:

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:3001
```

## Common Issues

### "API endpoint not found" Error
- **Cause**: Proxy server not running
- **Solution**: Start `node proxy-server.js`

### "Missing credentials" Error
- **Cause**: Client not logged in or missing API credentials
- **Solution**: Log in as a client and ensure API credentials are set

### "HTTP error! status: 401" Error
- **Cause**: Invalid API key
- **Solution**: Check client's WhatsApp API key in settings

### "Failed to fetch wallet balance" Error
- **Cause**: Network issue or API down
- **Solution**: Check internet connection and API status
