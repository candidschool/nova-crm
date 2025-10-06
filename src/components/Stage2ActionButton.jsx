import React, { useState } from 'react';

const Stage2ActionButton = ({ 
  leadId, 
  currentStatus, 
  onStatusUpdate, 
  getFieldLabel, // ← Field_key aware label function
  parentsName, 
  meetingDate, 
  meetingTime, 
  meetingLink,
  phone 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showHover, setShowHover] = useState(false);

  // ← UPDATED: Only validate parentsName and phone (required for API)
  const validateParameters = () => {
    const missingParams = [];
    
    if (!parentsName || parentsName.trim() === '') {
      missingParams.push(getFieldLabel('parentsName')); // ← Dynamic field label
    }
    if (!phone || phone.trim() === '') {
      missingParams.push(getFieldLabel('phone')); // ← Dynamic field label
    }
    
    return missingParams;
  };

  const handleClick = async () => {
    // Validate parameters before proceeding
    const missingParams = validateParameters();
    
    if (missingParams.length > 0) {
      alert(`Cannot send message. The following required information is missing:\n\n${missingParams.join('\n')}\n\nPlease update the lead information and try again.`);
      return; // Stop execution, no API call
    }

    setIsLoading(true);
    try {
      // ← API call to send WhatsApp message - FIXED: Only sending parentsName
      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2Q0MyIsIm5hbWUiOiJOb3ZhIEludGVybmF0aW9uYWwgU2Nob29sIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2QzZCIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTQ1Njg4NjR9.-nntqrB_61dj0Pw66AEL_YwN6VvljWf5CtPf2fiALMw',    
          campaignName: 'callbooked',
          destination: phone,
          userName: parentsName,
          templateParams: [parentsName] // ← FIXED: Only sending one parameter
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Stage 2 API Response:', result);

      // Update parent component - let sidebar handle database
      if (onStatusUpdate) {
        onStatusUpdate('stage2_status', 'SENT');
      }

      console.log('Stage 2 (Connected) action completed');
      
    } catch (error) {
      console.error('Error updating Stage 2 status:', error);
      alert('Error updating Stage 2 status: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ← Hover message showing template preview
  const hoverMessage = `Hey {{1}}, Thanks for the call. You will receive the proposal in 1 day.`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={handleClick} 
        disabled={isLoading}
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
        style={{ 
          padding: '8px 16px', 
          backgroundColor: currentStatus === 'SENT' ? '#787677' : '#6b7280', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          fontSize: '14px', 
          fontWeight: '500', 
          cursor: isLoading ? 'not-allowed' : 'pointer', 
          minWidth: '60px', 
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.2s ease'
        }} 
      >
        {isLoading ? '...' : 'Send'}
      </button>

      {/* Hover tooltip */}
      {showHover && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#333',
          color: 'white',
          padding: '10px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'pre-line',
          zIndex: 1000,
          marginBottom: '5px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          width: '600px',
          lineHeight: '1.4'
        }}>
          {hoverMessage}
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #333'
          }}></div>
        </div>
      )}
    </div>
  );
};

export default Stage2ActionButton;