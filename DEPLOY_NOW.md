# 🚨 URGENT: Deploy These Changes to Fix Your Production Issues

## Current Status
- ✅ Some questions work (short ones like "blackbeard pedigree") 
- ❌ Most questions fail with CORS/504 timeout errors
- ❌ The nginx configuration changes haven't been applied to production yet

## What You Need to Do RIGHT NOW

### Step 1: SSH into your AWS Lightsail server
```bash
ssh -i your-key.pem ubuntu@your-server-ip
# OR however you normally connect to your server
```

### Step 2: Navigate to your project directory
```bash
cd /opt/beangpt  # or wherever your project is located
```

### Step 3: Upload the new nginx configuration
You need to get the updated `nginx-cors-fix.conf` file to your server. You can either:

**Option A: Copy the content manually**
```bash
sudo nano /etc/nginx/sites-available/api.beangpt.ca
```
Then paste the entire content from the `nginx-cors-fix.conf` file.

**Option B: Use scp to upload the file**
From your local machine:
```bash
scp -i your-key.pem nginx-cors-fix.conf ubuntu@your-server-ip:/tmp/
```
Then on the server:
```bash
sudo cp /tmp/nginx-cors-fix.conf /etc/nginx/sites-available/api.beangpt.ca
```

### Step 4: Create the symlink (if it doesn't exist)
```bash
sudo ln -sf /etc/nginx/sites-available/api.beangpt.ca /etc/nginx/sites-enabled/
```

### Step 5: Test nginx configuration
```bash
sudo nginx -t
```
You should see: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### Step 6: Reload nginx
```bash
sudo systemctl reload nginx
```

### Step 7: Update your backend code
You also need to update your backend with the new CORS settings. Upload the updated `backend/main.py` file to your server and restart the backend service.

```bash
# Restart your backend service (replace with your actual service name)
sudo systemctl restart beangpt-backend
# OR if you're running it manually:
# pkill -f "python.*main.py"
# cd /opt/beangpt/backend && python main.py &
```

### Step 8: Verify the fix
Test with curl:
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

## The nginx-cors-fix.conf Content
Here's what needs to be in `/etc/nginx/sites-available/api.beangpt.ca`:

```nginx
# Nginx configuration for api.beangpt.ca
# This configuration handles long-running AI requests and CORS properly

server {
    listen 80;
    server_name api.beangpt.ca;
    
    # Increase timeout values for AI processing (10 minutes)
    proxy_connect_timeout       600s;
    proxy_send_timeout          600s;
    proxy_read_timeout          600s;
    send_timeout                600s;
    
    # Increase client body size for large requests
    client_max_body_size        10M;
    client_body_timeout         60s;
    client_header_timeout       60s;
    
    location / {
        # Forward to your FastAPI app
        proxy_pass http://localhost:8000;
        
        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        
        # HTTP version for better streaming support
        proxy_http_version 1.1;
        
        # CORS Headers - Force them at nginx level
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }
        
        # Disable buffering for streaming responses
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # Keep connections alive
        proxy_set_header Connection "keep-alive";
    }
}
```

## Why This Will Fix Your Issues

1. **CORS Error**: The nginx config now properly handles CORS headers at the server level
2. **504 Timeout**: Increased timeouts from 300s to 600s (10 minutes) for long AI processing
3. **Streaming**: Better support for streaming responses with proper buffering settings

## After Deployment

Once you've completed these steps, your frontend should work properly without CORS or timeout errors. The logs show your backend is working fine - it's just the nginx proxy that needs updating.

## Need Help?

If you encounter any issues:
1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Check backend logs: `sudo journalctl -u beangpt-backend -f`
3. Verify nginx is running: `sudo systemctl status nginx`
4. Test the API directly: `curl http://localhost:8000/api/ping`
