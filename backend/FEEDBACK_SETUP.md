# BeanGPT Feedback System Setup Guide

## Overview
The BeanGPT feedback system allows users to rate AI responses with thumbs up/down and provide optional comments. Feedback is stored in multiple formats for easy analysis.

## Storage Options

### 1. CSV Storage (Default - Always Active)
- Feedback is automatically saved to `backend/data/feedback/user_feedback.csv`
- Easy to import into Excel, Google Sheets, or data analysis tools
- No additional setup required

### 2. JSON Storage (Default - Always Active)
- Detailed feedback saved to daily JSONL files: `backend/data/feedback/feedback_YYYYMMDD.jsonl`
- Preserves full response text and metadata
- Perfect for programmatic analysis

### 3. Google Sheets Integration (Optional)

#### Quick Setup with Google Forms
1. **Create a Google Form**
   - Go to https://forms.google.com
   - Create a new form titled "BeanGPT Feedback"
   - Add these fields:
     - "Timestamp" (Short answer)
     - "Session ID" (Short answer) 
     - "User Question" (Paragraph)
     - "Rating" (Multiple choice: "Thumbs Up", "Thumbs Down")
     - "User Comment" (Paragraph)
     - "AI Response Preview" (Paragraph)

2. **Get Form Details**
   - Click "Send" → Copy link
   - Right-click form → "View page source"
   - Find field IDs (look for `entry.xxxxxxxxx`)

3. **Configure Environment Variables**
   ```bash
   # Add to your .env file or environment
   GOOGLE_FORM_URL=https://docs.google.com/forms/d/YOUR_FORM_ID/viewform
   GOOGLE_FORM_TIMESTAMP_FIELD=entry.123456789
   GOOGLE_FORM_SESSION_FIELD=entry.987654321
   GOOGLE_FORM_QUESTION_FIELD=entry.111111111
   GOOGLE_FORM_RATING_FIELD=entry.222222222
   GOOGLE_FORM_COMMENT_FIELD=entry.333333333
   GOOGLE_FORM_RESPONSE_FIELD=entry.444444444
   ```

4. **Link to Google Sheets**
   - In your form, click "Responses" tab
   - Click the Google Sheets icon
   - Create a new spreadsheet
   - Feedback will automatically populate the sheet

#### Advanced Setup with Google Sheets API
For direct API integration:
1. Enable Google Sheets API in Google Cloud Console
2. Create service account credentials
3. Share spreadsheet with service account email
4. Use credentials for direct sheet access

## Features

### User Interface
- Clean, modern thumbs up/down buttons
- Optional comment field (automatically shown for negative feedback)
- Smooth animations and professional styling
- Auto-hide after submission
- Character limits to prevent spam

### Data Collection
- Message ID for tracking specific responses
- User question and AI response
- Rating (thumbs_up/thumbs_down)
- Optional user comment
- Timestamp and session ID
- Response preview (truncated for storage)

### Analytics Endpoint
Access basic feedback statistics:
```
GET /api/feedback/stats
```
Returns:
```json
{
  "total": 150,
  "thumbs_up": 120,
  "thumbs_down": 30,
  "satisfaction_rate": 80.0
}
```

## File Structure
```
backend/
├── data/
│   └── feedback/
│       ├── user_feedback.csv          # Main CSV file
│       ├── feedback_20250929.jsonl    # Daily JSON logs
│       └── feedback_20250930.jsonl
├── routes/
│   └── feedback.py                    # API endpoints
├── services/
│   └── google_sheets.py              # Google integration
└── FEEDBACK_SETUP.md                 # This guide
```

## Security & Privacy
- No personal information is collected by default
- Session IDs are generic (e.g., "Research Session 1")
- Response text is truncated for storage
- All data stays within your infrastructure
- Google Sheets integration is optional and can be disabled

## Customization
- Modify `FeedbackWidget.jsx` for UI changes
- Adjust storage formats in `feedback.py`
- Add custom analytics in the stats endpoint
- Configure different storage backends

## Troubleshooting

### Common Issues
1. **Feedback not saving**: Check file permissions in `backend/data/feedback/`
2. **Google Sheets not working**: Verify form URL and field IDs
3. **UI not showing**: Ensure FeedbackWidget is imported correctly

### Debug Mode
Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Production Considerations
- Set up log rotation for JSONL files
- Monitor storage usage
- Consider data retention policies
- Backup feedback data regularly
- Use environment variables for sensitive config

## Support
For issues or questions about the feedback system, check:
1. Console logs in browser developer tools
2. Backend logs for API errors
3. File permissions in feedback directory
4. Environment variable configuration
