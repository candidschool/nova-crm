const API_BASE_URL = 'https://reminder-backend-production-90af.up.railway.app';

export const scheduleReminders = async (leadId, phone, parentsName, meetingDate, meetingTime, fieldType) => {
  try {
    console.log('Calling scheduleReminders API:', {
      url: `${API_BASE_URL}/api/schedule-reminder`,
      leadId,
      phone,
      parentsName,
      meetingDate,
      meetingTime,
      fieldType
    });

    const response = await fetch(`${API_BASE_URL}/api/schedule-reminder`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leadId,
        phone,
        parentsName,
        meetingDate,
        meetingTime,
        fieldType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to schedule reminders');
    }
    
    const data = await response.json();
    console.log('Reminders scheduled successfully:', data);
    return data;
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    throw error;
  }
};

export const cancelReminders = async (leadId, fieldType) => {
  try {
    console.log('Calling cancelReminders API:', {
      url: `${API_BASE_URL}/api/cancel-reminder`,
      leadId,
      fieldType
    });

    const response = await fetch(`${API_BASE_URL}/api/cancel-reminder`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        leadId, 
        fieldType 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel reminders');
    }
    
    const data = await response.json();
    console.log('Reminders cancelled successfully:', data);
    return data;
  } catch (error) {
    console.error('Error cancelling reminders:', error);
    throw error;
  }
};