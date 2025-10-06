import React, { useState } from 'react';

const MeetingReminderButton = ({ 
  leadId, 
  currentStatus, 
  onStatusUpdate, 
  getFieldLabel,
  parentsName, 
  meetingDate, 
  meetingTime,
  phone,
  reminderType // 'R1' or 'R2'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showHover, setShowHover] = useState(false);

  // Validate required parameters
  const validateParameters = () => {
    const missingParams = [];
    
    if (!meetingDate || meetingDate.trim() === '') {
      missingParams.push(getFieldLabel('meetingDate'));
    }
    if (!meetingTime || meetingTime.trim() === '') {
      missingParams.push(getFieldLabel('meetingTime'));
    }
    if (!phone || phone.trim() === '') {
      missingParams.push(getFieldLabel('phone'));
    }
    return missingParams;
  };

  const handleClick = async () => {
    // Validate parameters before proceeding
    const missingParams = validateParameters();
    
    if (missingParams.length > 0) {
      alert(`Cannot send reminder. The following required information is missing:\n\n${missingParams.join('\n')}\n\nPlease update the lead information and try again.`);
      return;
    }

    setIsLoading(true);
    try {
      // API call to send WhatsApp reminder message
      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MGYyOGY2ZTBjYzg1MGMwMmMzNGJiOCIsIm5hbWUiOiJXRUJVWlogRGlnaXRhbCBQcml2YXRlIExpbWl0ZWQiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjgwZjI4ZjZlMGNjODUwYzAyYzM0YmIzIiwiYWN0aXZlUGxhbiI6IkZSRUVfRk9SRVZFUiIsImlhdCI6MTc0NTgyMzk5MH0.pJi8qbYf3joYbNm5zSs4gJKFlBFsCS6apvkBkw4Qdxs',
          campaignName: 'schedule100',
          destination: phone,
          userName: parentsName,
          templateParams: [meetingDate, meetingTime]
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Reminder API Response:', result);

      // Update parent component - let sidebar handle database
      if (onStatusUpdate) {
        const statusField = reminderType === 'R1' ? 'stage2_r1' : 'stage2_r2';
        onStatusUpdate(statusField, 'SENT');
      }

      console.log(`Meeting reminder ${reminderType} sent successfully`);
      
    } catch (error) {
      console.error(`Error sending reminder ${reminderType}:`, error);
      alert(`Error sending reminder: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Hover message showing template preview
  const hoverMessage = `Hi, Sir/ Mam, Your meeting with the school counsellor will take place on ${meetingDate}, at ${meetingTime}. Thank You.`;

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
          width: '400px',
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

export default MeetingReminderButton;