import React, { useState } from 'react';

const Stage7ActionButton = ({ 
  leadId, 
  currentStatus, 
  onStatusUpdate,
  getFieldLabel,
  parentsName, 
  visitDate, 
  phone,
  disabled = false  // ✅ Added
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showHover, setShowHover] = useState(false);

  const validateParameters = () => {
    const missingParams = [];
    if (!parentsName || parentsName.trim() === '') {
      missingParams.push(getFieldLabel('parentsName'));
    }
    if (!phone || phone.trim() === '') {
      missingParams.push(getFieldLabel('phone'));
    }
    if (!visitDate || visitDate.trim() === '') {
      missingParams.push(getFieldLabel('visitDate'));
    }
    return missingParams;
  };

  const handleClick = async () => {
    if (disabled) return; // ✅ Added

    const missingParams = validateParameters();
    if (missingParams.length > 0) {
      alert(`Cannot send message. The following required information is missing:\n\n${missingParams.join('\n')}\n\nPlease update the lead information and try again.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2Q0MyIsIm5hbWUiOiJOb3ZhIEludGVybmF0aW9uYWwgU2Nob29sIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2QzZCIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTQ1Njg4NjR9.-nntqrB_61dj0Pw66AEL_YwN6VvljWf5CtPf2fiALMw',
          campaignName: 'visitbooked',
          destination: phone,
          userName: parentsName,
          templateParams: [parentsName, visitDate]
        })
      });

      if (!response.ok) throw new Error(`API call failed: ${response.status}`);
      const result = await response.json();
      console.log('API Response:', result);

      if (onStatusUpdate) {
        onStatusUpdate('stage7_status', 'SENT');
      }
    } catch (error) {
      console.error('Error updating Stage 7 status:', error);
      alert('Error updating Stage 7 status: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const hoverMessage = `Hey Parent Name\nYour visit to School on Date has been recorded. Thank you for your time.`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={handleClick} 
        disabled={disabled || isLoading}  // ✅ Updated
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
          cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',  // ✅ Updated
          minWidth: '60px', 
          opacity: (disabled || isLoading) ? 0.5 : 1,  // ✅ Updated
          transition: 'all 0.2s ease',
          pointerEvents: disabled ? 'none' : 'auto'  // ✅ Added
        }} 
      >
        {isLoading ? '...' : 'Send'}
      </button>

      {showHover && !disabled && (  // ✅ Updated
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

export default Stage7ActionButton;
