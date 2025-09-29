# © Mohsen Yousefzadeh Najafabadi, August 30 2025
# All rights reserved. Unauthorized use, distribution, or modification prohibited.

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import os
import csv
from datetime import datetime
import aiofiles
import asyncio
from services.google_sheets import submit_to_google_sheets

router = APIRouter()

class FeedbackRequest(BaseModel):
    message_id: str
    question: str
    response: str
    rating: str  # "thumbs_up" or "thumbs_down"
    comment: Optional[str] = None
    timestamp: Optional[str] = None
    session_id: Optional[str] = None

class FeedbackResponse(BaseModel):
    success: bool
    message: str

# Ensure feedback directory exists
FEEDBACK_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "feedback")
os.makedirs(FEEDBACK_DIR, exist_ok=True)

FEEDBACK_CSV_PATH = os.path.join(FEEDBACK_DIR, "user_feedback.csv")

# Initialize CSV file with headers if it doesn't exist
def initialize_feedback_csv():
    if not os.path.exists(FEEDBACK_CSV_PATH):
        with open(FEEDBACK_CSV_PATH, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([
                'timestamp', 'session_id', 'message_id', 'question', 
                'response_preview', 'rating', 'comment'
            ])

# Call initialization
initialize_feedback_csv()

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit user feedback for LLM responses.
    Stores feedback in CSV format for easy analysis.
    """
    try:
        # Generate timestamp if not provided
        timestamp = feedback.timestamp or datetime.now().isoformat()
        
        # Truncate response for storage (first 200 chars)
        response_preview = feedback.response[:200] + "..." if len(feedback.response) > 200 else feedback.response
        
        # Prepare feedback data
        feedback_data = [
            timestamp,
            feedback.session_id or "unknown",
            feedback.message_id,
            feedback.question,
            response_preview,
            feedback.rating,
            feedback.comment or ""
        ]
        
        # Write to CSV file (thread-safe)
        async with aiofiles.open(FEEDBACK_CSV_PATH, 'a', newline='', encoding='utf-8') as file:
            # Convert to CSV line
            csv_line = ','.join([f'"{str(field).replace(chr(34), chr(34)+chr(34))}"' for field in feedback_data])
            await file.write(csv_line + '\n')
        
        # Optional: Also save as JSON for more detailed storage
        json_feedback = {
            "timestamp": timestamp,
            "session_id": feedback.session_id,
            "message_id": feedback.message_id,
            "question": feedback.question,
            "response": feedback.response,
            "rating": feedback.rating,
            "comment": feedback.comment
        }
        
        json_filename = f"feedback_{datetime.now().strftime('%Y%m%d')}.jsonl"
        json_path = os.path.join(FEEDBACK_DIR, json_filename)
        
        async with aiofiles.open(json_path, 'a', encoding='utf-8') as file:
            await file.write(json.dumps(json_feedback) + '\n')
        
        # Optional: Also submit to Google Sheets (non-blocking)
        try:
            await submit_to_google_sheets(json_feedback)
        except Exception as e:
            print(f"⚠️ Google Sheets submission failed (non-critical): {e}")
        
        return FeedbackResponse(
            success=True,
            message="Feedback submitted successfully. Thank you for helping us improve!"
        )
        
    except Exception as e:
        print(f"❌ Error saving feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save feedback: {str(e)}"
        )

@router.get("/feedback/stats")
async def get_feedback_stats():
    """
    Get basic feedback statistics (optional endpoint for admin use)
    """
    try:
        if not os.path.exists(FEEDBACK_CSV_PATH):
            return {"total": 0, "thumbs_up": 0, "thumbs_down": 0}
        
        thumbs_up = 0
        thumbs_down = 0
        total = 0
        
        async with aiofiles.open(FEEDBACK_CSV_PATH, 'r', encoding='utf-8') as file:
            content = await file.read()
            lines = content.strip().split('\n')[1:]  # Skip header
            
            for line in lines:
                if line.strip():
                    total += 1
                    if '"thumbs_up"' in line:
                        thumbs_up += 1
                    elif '"thumbs_down"' in line:
                        thumbs_down += 1
        
        return {
            "total": total,
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
            "satisfaction_rate": round((thumbs_up / total * 100) if total > 0 else 0, 2)
        }
        
    except Exception as e:
        print(f"❌ Error getting feedback stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get feedback stats: {str(e)}"
        )
