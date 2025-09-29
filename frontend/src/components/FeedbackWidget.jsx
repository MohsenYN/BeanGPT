// © Mohsen Yousefzadeh Najafabadi, August 30 2025
// All rights reserved. Unauthorized use, distribution, or modification prohibited.

import React, { useState } from 'react';
import { FaThumbsUp, FaThumbsDown, FaComment, FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';

const FeedbackWidget = ({ 
  messageId, 
  question, 
  response, 
  onFeedbackSubmit,
  className = "",
  sessionId = null 
}) => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showWidget, setShowWidget] = useState(true);

  const handleRatingClick = (rating) => {
    if (isSubmitted) return;
    
    setSelectedRating(rating);
    
    // Always show comment box for both thumbs up and thumbs down
    // User can choose to add a comment or submit without one
    setShowCommentBox(true);
  };

  const handleSubmit = async (rating = selectedRating, feedbackComment = comment) => {
    if (isSubmitting || isSubmitted) return;
    
    setIsSubmitting(true);
    
    try {
      const feedbackData = {
        message_id: messageId,
        question: question,
        response: response,
        rating: rating,
        comment: feedbackComment.trim() || null,
        timestamp: new Date().toISOString(),
        session_id: sessionId
      };

      // Call the parent's feedback submit handler
      if (onFeedbackSubmit) {
        const result = await onFeedbackSubmit(feedbackData);
        console.log('Feedback submission result:', result);
      }

      setIsSubmitted(true);
      setShowCommentBox(false);
      
      // Hide the widget after 5 seconds (increased time)
      setTimeout(() => {
        setShowWidget(false);
      }, 5000);
      
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitError('Failed to submit feedback. Please try again.');
      
      // Show error for 3 seconds, then reset
      setTimeout(() => {
        setSubmitError(null);
        setSelectedRating(null);
        setComment('');
        setShowCommentBox(false);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = () => {
    handleSubmit(selectedRating, comment);
  };

  const handleCancel = () => {
    setSelectedRating(null);
    setComment('');
    setShowCommentBox(false);
  };

  if (!showWidget) {
    return null;
  }

  return (
    <div className={`feedback-widget transition-all duration-300 ${className}`}>
      {/* Main feedback buttons */}
      <div className="flex items-center space-x-2 mt-3 animate-in fade-in duration-300">
        {!isSubmitted ? (
          <>
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2 font-medium">
              Was this helpful?
            </span>
            
            {/* Thumbs Up Button */}
            <button
              onClick={() => handleRatingClick('thumbs_up')}
              disabled={isSubmitting}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200
                ${selectedRating === 'thumbs_up' 
                  ? 'bg-green-100 border-green-500 text-green-600 dark:bg-green-900 dark:border-green-400 dark:text-green-300' 
                  : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-green-400 dark:hover:text-green-400'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
              `}
              title="This response was helpful"
            >
              {isSubmitting && selectedRating === 'thumbs_up' ? (
                <FaSpinner className="animate-spin text-xs" />
              ) : (
                <FaThumbsUp className="text-xs" />
              )}
            </button>

            {/* Thumbs Down Button */}
            <button
              onClick={() => handleRatingClick('thumbs_down')}
              disabled={isSubmitting}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200
                ${selectedRating === 'thumbs_down' 
                  ? 'bg-red-100 border-red-500 text-red-600 dark:bg-red-900 dark:border-red-400 dark:text-red-300' 
                  : 'border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-red-400 dark:hover:text-red-400'
                }
                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
              `}
              title="This response was not helpful"
            >
              {isSubmitting && selectedRating === 'thumbs_down' ? (
                <FaSpinner className="animate-spin text-xs" />
              ) : (
                <FaThumbsDown className="text-xs" />
              )}
            </button>

            {/* Add Comment Button (for thumbs up) */}
            {selectedRating === 'thumbs_up' && !showCommentBox && (
              <button
                onClick={() => setShowCommentBox(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all duration-200 hover:scale-105"
                title="Add a comment"
              >
                <FaComment className="text-xs" />
              </button>
            )}
          </>
        ) : submitError ? (
          /* Error message */
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 animate-in slide-in-from-left-2 duration-500">
            <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <FaTimes className="text-xs text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm font-medium">{submitError}</span>
          </div>
        ) : (
          /* Thank you message */
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 animate-in slide-in-from-left-2 duration-500">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <FaCheck className="text-xs text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium">Thank you for your feedback!</span>
          </div>
        )}
      </div>

      {/* Comment Box */}
      {showCommentBox && !isSubmitted && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedRating === 'thumbs_down' ? 'How can we improve? (optional)' : 'Additional feedback (optional)'}
            </label>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Cancel"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
          
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={selectedRating === 'thumbs_down' 
              ? "Please let us know what went wrong or how we can improve this response..." 
              : "Any additional thoughts or suggestions?"
            }
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="3"
            maxLength="500"
          />
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {comment.length}/500 characters
            </span>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(selectedRating, '')}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit without comment
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit with comment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
