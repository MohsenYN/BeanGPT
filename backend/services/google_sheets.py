# © Mohsen Yoosefzadeh Najafabadi, August 30 2025
# All rights reserved. Unauthorized use, distribution, or modification prohibited.

import os
import json
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime
import aiohttp
import base64

# Try to load environment variables from .env file, but don't fail if dotenv is not available
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment variables loaded from .env file")
except ImportError:
    print("⚠️ python-dotenv not available, using system environment variables only")
except Exception as e:
    print(f"⚠️ Could not load .env file: {e}")

class GoogleSheetsService:
    """
    Service for sending feedback data to Google Sheets via Google Forms.
    This provides an alternative to CSV storage for easier data collection and analysis.
    """
    
    def __init__(self):
        # Google Form URL - you'll need to replace this with your actual form URL
        self.form_url = os.getenv('GOOGLE_FORM_URL', '')
        self.form_enabled = bool(self.form_url)
        
        # Form field IDs - these need to be extracted from your Google Form
        self.field_mapping = {
            'session_id': os.getenv('GOOGLE_FORM_SESSION_FIELD', 'entry.987654321'),
            'question': os.getenv('GOOGLE_FORM_QUESTION_FIELD', 'entry.111111111'),
            'rating': os.getenv('GOOGLE_FORM_RATING_FIELD', 'entry.222222222'),
            'comment': os.getenv('GOOGLE_FORM_COMMENT_FIELD', 'entry.333333333'),
            'response_preview': os.getenv('GOOGLE_FORM_RESPONSE_FIELD', 'entry.444444444')
        }
    
    async def submit_feedback_to_form(self, feedback_data: Dict[str, Any]) -> bool:
        """
        Submit feedback data to Google Form.
        Returns True if successful, False otherwise.
        """
        if not self.form_enabled:
            print("ℹ️ Google Forms integration not configured")
            return False
        
        try:
            # Prepare form data (Google Forms automatically adds timestamp)
            form_data = {
                self.field_mapping['session_id']: feedback_data.get('session_id', 'unknown'),
                self.field_mapping['question']: feedback_data.get('question', '')[:500],  # Limit length
                self.field_mapping['rating']: feedback_data.get('rating', ''),
                self.field_mapping['comment']: feedback_data.get('comment', '')[:1000] if feedback_data.get('comment') else '',  # Limit length
                self.field_mapping['response_preview']: feedback_data.get('response', '')[:300]  # Limit length
            }
            
            print(f"🔄 Submitting to Google Form: {self.form_url}")
            print(f"📝 Form data: {form_data}")
            
            # Submit to Google Form - convert viewform URL to formResponse URL
            form_submit_url = self.form_url.replace('/viewform', '/formResponse')
            if '?usp=' in form_submit_url:
                form_submit_url = form_submit_url.split('?usp=')[0]
            if not form_submit_url.endswith('/formResponse'):
                form_submit_url += '/formResponse'
            
            print(f"🔗 Submitting to: {form_submit_url}")
            
            # Submit to Google Form
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    form_submit_url,
                    data=form_data,
                    timeout=aiohttp.ClientTimeout(total=10),
                    allow_redirects=False  # Google Forms redirect on success
                ) as response:
                    # Google Forms returns 302 redirect on successful submission
                    if response.status in [200, 302]:
                        print("✅ Feedback submitted to Google Sheets successfully")
                        return True
                    else:
                        print(f"⚠️ Google Form submission returned status: {response.status}")
                        response_text = await response.text()
                        print(f"📄 Response body: {response_text[:500]}...")
                        return False
                        
        except asyncio.TimeoutError:
            print("⚠️ Google Form submission timed out")
            return False
        except Exception as e:
            print(f"❌ Error submitting to Google Form: {e}")
            return False
    
    def get_setup_instructions(self) -> str:
        """
        Return instructions for setting up Google Sheets integration.
        """
        return """
# Google Sheets Integration Setup

## Step 1: Create a Google Form
1. Go to https://forms.google.com
2. Create a new form with these fields (Google Forms automatically adds timestamp):
   - Session ID (Short answer)
   - Question (Paragraph)
   - Rating (Multiple choice: thumbs_up, thumbs_down)
   - Comment (Paragraph) - make this optional
   - Response Preview (Paragraph)

## Step 2: Get Form URL and Field IDs
1. Click "Send" and copy the form URL
2. View the form source code to find field IDs (entry.xxxxxxxxx)
3. Set environment variables:
   - GOOGLE_FORM_URL=https://docs.google.com/forms/d/YOUR_FORM_ID/viewform
   - GOOGLE_FORM_SESSION_FIELD=entry.987654321
   - GOOGLE_FORM_QUESTION_FIELD=entry.111111111
   - GOOGLE_FORM_RATING_FIELD=entry.222222222
   - GOOGLE_FORM_COMMENT_FIELD=entry.333333333
   - GOOGLE_FORM_RESPONSE_FIELD=entry.444444444

## Step 3: Link to Google Sheets
1. In your form, click "Responses" tab
2. Click the Google Sheets icon to create a linked spreadsheet
3. Your feedback data will automatically populate the spreadsheet

## Alternative: Direct Google Sheets API
For more advanced integration, you can use the Google Sheets API directly:
1. Enable Google Sheets API in Google Cloud Console
2. Create service account credentials
3. Share your spreadsheet with the service account email
4. Use the credentials to write directly to the sheet
"""

# Global instance
google_sheets_service = GoogleSheetsService()

async def submit_to_google_sheets(feedback_data: Dict[str, Any]) -> bool:
    """
    Convenience function to submit feedback to Google Sheets.
    """
    return await google_sheets_service.submit_feedback_to_form(feedback_data)
