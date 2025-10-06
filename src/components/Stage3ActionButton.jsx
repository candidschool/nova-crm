import React, { useState } from 'react';
// Remove: import { supabase } from '../lib/supabase';

const Stage3ActionButton = ({ leadId, currentStatus, onStatusUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      // Remove all the supabase database update code
      // Only update parent component - let sidebar handle database
      if (onStatusUpdate) {
        onStatusUpdate('stage3_status', 'SENT'); // ← Changed from stage2_status
      }

      console.log('Stage 3 (Meeting Booked) action completed'); // ← Changed from Stage 2
      
    } catch (error) {
      console.error('Error updating Stage 3 status:', error); // ← Changed from Stage 2
      alert('Error updating Stage 3 status: ' + error.message); // ← Changed from Stage 2
    } finally {
      setIsLoading(false);
    }
  };

  // Always show the button - remove the conditional return
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
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
        opacity: isLoading ? 0.7 : 1
      }}
    >
      {isLoading ? '...' : 'Send'}
    </button>
  );
};

export default Stage3ActionButton; // ← Changed from Stage2ActionButton