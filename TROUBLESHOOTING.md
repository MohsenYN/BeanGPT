# BeanGPT Production Troubleshooting Guide

## Current Issues Fixed

### 1. CORS Error
**Problem**: `Access to fetch at 'https://api.beangpt.ca/api/chat' from origin 'https://beangpt.ca' has been blocked by CORS policy`

**Solution**: Updated both nginx and FastAPI CORS configurations to properly handle cross-origin requests.

### 2. 504 Gateway Timeout  
**Problem**: `POST https://api.beangpt.ca/api/chat net::ERR_FAILED 504 (Gateway Time-out)`

**Solution**: Increased nginx timeout values from 300s to 600s (10 minutes) to handle long AI processing times.

## Deployment Steps

### On your AWS Lightsail Ubuntu server:

1. **Upload the fixed files**:
   ```bash
   # Copy the updated nginx configuration
   sudo cp nginx-cors-fix.conf /etc/nginx/sites-available/api.beangpt.ca
   
   # Create symlink if it doesn't exist
   sudo ln -s /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-enabled/
   ```

2. **Test and reload nginx**:
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Reload nginx
   sudo systemctl reload nginx
   ```

3. **Restart your backend service**:
   ```bash
   # Replace 'beangpt-backend' with your actual service name
   sudo systemctl restart beangpt-backend
   
   # Or if you're running manually:
   cd /path/to/your/backend
   pkill -f "python.*main.py"
   python main.py &
   ```

4. **Verify the fixes**:
   ```bash
   # Test CORS preflight
   curl -X OPTIONS \
     -H "Origin: https://beangpt.ca" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -v \
     http://localhost/api/ping
   
   # Should return Access-Control-Allow-Origin: *
   ```

## Key Changes Made

### nginx-cors-fix.conf
- Increased timeouts from 300s to 600s (10 minutes)
- Added proper CORS headers at nginx level
- Improved streaming support with `proxy_buffering off`
- Added `proxy_request_buffering off` for better handling
- Set `proxy_http_version 1.1` for keep-alive connections

### backend/main.py  
- Added explicit allowed origins including `https://beangpt.ca`
- Specified exact CORS headers instead of wildcard
- Kept `"*"` for now but can be removed for better security

## Monitoring Commands

```bash
# Watch backend logs
sudo journalctl -u beangpt-backend -f

# Watch nginx error logs  
sudo tail -f /var/log/nginx/error.log

# Watch nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check service status
sudo systemctl status nginx
sudo systemctl status beangpt-backend
```

## Testing the Fix

1. **Test from browser console**:
   ```javascript
   fetch('https://api.beangpt.ca/api/ping')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

2. **Test CORS specifically**:
   ```javascript
   fetch('https://api.beangpt.ca/api/ping', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({test: true})
   })
   ```

## Common Issues

### Still getting CORS errors?
- Check that nginx reloaded: `sudo systemctl status nginx`
- Verify config syntax: `sudo nginx -t`
- Check nginx is serving the right config: `sudo nginx -T | grep api.beangpt.ca -A 20`

### Still getting timeouts?
- Check backend is running: `ps aux | grep python`
- Monitor backend logs for errors: `sudo journalctl -u beangpt-backend -f`
- Verify the request is reaching the backend (should see logs)

### DNS Issues?
- Test DNS resolution: `dig api.beangpt.ca`
- Check if subdomain points to your server IP
- Verify A record is set correctly

## Security Notes

- Currently allowing all origins (`"*"`) for CORS
- For production, consider restricting to specific domains:
  ```python
  allow_origins=["https://beangpt.ca", "https://www.beangpt.ca"]
  ```
- Consider adding rate limiting for the API endpoints
- Monitor for unusual traffic patterns

## Performance Optimization

- The 10-minute timeout is generous for AI processing
- Consider implementing request queuing for high load
- Monitor memory usage during long requests
- Consider caching for repeated queries
