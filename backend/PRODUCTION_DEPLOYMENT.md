# BeanGPT Production Deployment Guide

## 🚀 Quick Fix for 502 Error

Your production server is getting a 502 error because it can't import the new feedback module. Here's how to fix it:

### Step 1: Upload New Files to Production

Upload these new files to your production server:

```
backend/routes/feedback.py
backend/services/google_sheets.py
backend/check_deployment.py
```

### Step 2: Update Existing Files

Replace these files on your production server:
```
backend/main.py (updated with feedback router)
backend/requirements.txt (added aiofiles and aiohttp)
```

### Step 3: Install New Dependencies

SSH into your production server and run:

```bash
# Navigate to your backend directory
cd /opt/beangpt/backend

# Install new dependencies
pip install aiofiles==23.2.1 aiohttp==3.9.1

# Or reinstall all requirements
pip install -r requirements.txt
```

### Step 4: Set Environment Variables (Optional)

If you want Google Sheets integration in production, add these to your environment:

```bash
# Add to your .env file or system environment
export GOOGLE_FORM_URL="your_google_form_url"
export GOOGLE_FORM_SESSION_FIELD="entry.xxxxxx"
export GOOGLE_FORM_QUESTION_FIELD="entry.xxxxxx"
export GOOGLE_FORM_RATING_FIELD="entry.xxxxxx"
export GOOGLE_FORM_COMMENT_FIELD="entry.xxxxxx"
export GOOGLE_FORM_RESPONSE_FIELD="entry.xxxxxx"
```

### Step 5: Verify Deployment

Run the deployment check script:

```bash
python check_deployment.py
```

### Step 6: Restart Service

```bash
sudo systemctl restart beangpt
sudo systemctl status beangpt
```

### Step 7: Check Logs

```bash
sudo journalctl -u beangpt -f
```

You should see:
```
✅ Feedback module loaded successfully
✅ Feedback routes registered
```

## 🔧 Troubleshooting

### If Feedback Module Still Fails

The updated `main.py` now gracefully handles missing feedback modules. Your chat should work even if feedback fails to load.

### If Dependencies Are Missing

```bash
# Check what's installed
pip list | grep -E "(aiofiles|aiohttp)"

# Install missing packages
pip install aiofiles aiohttp
```

### If Google Sheets Integration Fails

The system will work without Google Sheets. Feedback will be stored in local files only.

### Check Server Status

```bash
# Check if server is running
sudo systemctl status beangpt

# Check server logs
sudo journalctl -u beangpt --since "10 minutes ago"

# Check if port is listening
sudo netstat -tlnp | grep :8000
```

## 📋 File Checklist

Make sure these files exist on your production server:

**New Files:**
- ✅ `routes/feedback.py`
- ✅ `services/google_sheets.py`

**Updated Files:**
- ✅ `main.py` (with feedback import handling)
- ✅ `requirements.txt` (with new dependencies)

**Dependencies:**
- ✅ `aiofiles==23.2.1`
- ✅ `aiohttp==3.9.1`

## 🎯 Expected Behavior

After deployment:

1. **Chat should work normally** (even if feedback fails)
2. **Feedback widgets appear** in frontend (if feedback module loads)
3. **Google Sheets integration works** (if environment variables are set)
4. **Local CSV backup** always works as fallback

## 🆘 Emergency Rollback

If something goes wrong, you can quickly disable feedback:

1. Comment out the feedback import in `main.py`:
   ```python
   # from routes import feedback
   FEEDBACK_AVAILABLE = False
   ```

2. Restart the service:
   ```bash
   sudo systemctl restart beangpt
   ```

This will disable feedback but keep your chat working.
