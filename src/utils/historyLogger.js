// utils/historyLogger.js
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';

/**
 * IMPORTANT NOTE: Stage_key Migration
 * 
 * When calling stage-related logging functions, always pass DISPLAY NAMES (what users see)
 * rather than internal stage_keys. Components should convert stage_keys to display names
 * before calling these functions using getStageDisplayName() from SettingsDataProvider.
 * 
 * Example:
 * const oldStageName = getStageDisplayName(oldStageKey);
 * const newStageName = getStageDisplayName(newStageKey);
 * await logStageChange(leadId, oldStageName, newStageName, 'sidebar');
 */

/**
 * Log an action to the history/logs table
 * @param {number} leadId - The ID of the lead
 * @param {string} mainAction - The main action type (e.g., 'Lead Created', 'Stage Updated')
 * @param {string} description - Detailed description of the action
 * @returns {Promise<void>}
 */
export const logAction = async (leadId, mainAction, description) => {
  try {
    const { error } = await supabase
      .from(TABLE_NAMES.LOGS)
      .insert([
        {
          main_action: mainAction,
          description: description,
          table_name: TABLE_NAMES.LEADS,
          record_id: leadId.toString(),
          action_timestamp: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    console.log(`✅ Logged: ${mainAction} - ${description}`);
  } catch (error) {
    console.error('❌ Error logging action:', error);
  }
};

/**
 * Log when a new lead is created
 * @param {number} leadId - The ID of the newly created lead
 * @param {object} leadData - The lead data object (should contain display names, not keys)
 * @returns {Promise<void>}
 */
export const logLeadCreated = async (leadId, leadData) => {
  const description = `New lead created: ${leadData.parentsName} (${leadData.kidsName}) - ${leadData.phone} from ${leadData.source}`;
  await logAction(leadId, 'Lead Created', description);
};

/**
 * Log when a lead is updated
 * @param {number} leadId - The ID of the lead
 * @param {string} changeDescription - Description of changes made
 * @returns {Promise<void>}
 */
export const logLeadUpdated = async (leadId, changeDescription) => {
  const description = `Lead updated: ${changeDescription}`;
  await logAction(leadId, 'Lead Updated', description);
};

/**
 * Log stage changes
 * @param {number} leadId - The ID of the lead
 * @param {string} oldStage - Previous stage DISPLAY NAME (not stage_key)
 * @param {string} newStage - New stage DISPLAY NAME (not stage_key)
 * @param {string} source - Source of the change (e.g., 'sidebar', 'table dropdown', 'form')
 * @returns {Promise<void>}
 */
export const logStageChange = async (leadId, oldStage, newStage, source = 'system') => {
  const description = `Stage changed from "${oldStage}" to "${newStage}" via ${source}`;
  await logAction(leadId, 'Stage Updated', description);
};

/**
 * Log meeting scheduling
 * @param {number} leadId - The ID of the lead
 * @param {string} meetingDate - Meeting date
 * @param {string} meetingTime - Meeting time
 * @param {string} meetingLink - Meeting link (optional)
 * @returns {Promise<void>}
 */
export const logMeetingScheduled = async (leadId, meetingDate, meetingTime, meetingLink = '') => {
  const formattedDate = new Date(meetingDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  const [hours, minutes] = meetingTime.split(':');
  const timeObj = new Date();
  timeObj.setHours(hours, minutes);
  const formattedTime = timeObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  let description = `Meeting scheduled for ${formattedDate} at ${formattedTime}`;
  if (meetingLink) {
    description += ` (Link: ${meetingLink})`;
  }
  
  await logAction(leadId, 'Meeting Scheduled', description);
};

/**
 * Log meeting updates
 * @param {number} leadId - The ID of the lead
 * @param {object} changes - Changes made to meeting details
 * @returns {Promise<void>}
 */
export const logMeetingUpdated = async (leadId, changes) => {
  const changeDescriptions = [];
  
  if (changes.meetingDate) {
    const oldDate = changes.meetingDate.oldValue ? new Date(changes.meetingDate.oldValue).toLocaleDateString('en-GB') : 'Not set';
    const newDate = changes.meetingDate.newValue ? new Date(changes.meetingDate.newValue).toLocaleDateString('en-GB') : 'Not set';
    changeDescriptions.push(`Date: ${oldDate} → ${newDate}`);
  }
  
  if (changes.meetingTime) {
    changeDescriptions.push(`Time: ${changes.meetingTime.oldValue || 'Not set'} → ${changes.meetingTime.newValue || 'Not set'}`);
  }
  
  if (changes.meetingLink) {
    changeDescriptions.push(`Link: ${changes.meetingLink.oldValue || 'Not set'} → ${changes.meetingLink.newValue || 'Not set'}`);
  }
  
  const description = `Meeting updated: ${changeDescriptions.join(', ')}`;
  await logAction(leadId, 'Meeting Updated', description);
};

/**
 * Log visit scheduling
 * @param {number} leadId - The ID of the lead
 * @param {string} visitDate - Visit date
 * @param {string} visitTime - Visit time
 * @param {string} visitLocation - Visit location (optional)
 * @returns {Promise<void>}
 */
export const logVisitScheduled = async (leadId, visitDate, visitTime, visitLocation = '') => {
  const formattedDate = new Date(visitDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  const [hours, minutes] = visitTime.split(':');
  const timeObj = new Date();
  timeObj.setHours(hours, minutes);
  const formattedTime = timeObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  let description = `Visit scheduled for ${formattedDate} at ${formattedTime}`;
  if (visitLocation) {
    description += ` at ${visitLocation}`;
  }
  
  await logAction(leadId, 'Visit Scheduled', description);
};

/**
 * Log visit updates
 * @param {number} leadId - The ID of the lead
 * @param {object} changes - Changes made to visit details
 * @returns {Promise<void>}
 */
export const logVisitUpdated = async (leadId, changes) => {
  const changeDescriptions = [];
  
  if (changes.visitDate) {
    const oldDate = changes.visitDate.oldValue ? new Date(changes.visitDate.oldValue).toLocaleDateString('en-GB') : 'Not set';
    const newDate = changes.visitDate.newValue ? new Date(changes.visitDate.newValue).toLocaleDateString('en-GB') : 'Not set';
    changeDescriptions.push(`Date: ${oldDate} → ${newDate}`);
  }
  
  if (changes.visitTime) {
    changeDescriptions.push(`Time: ${changes.visitTime.oldValue || 'Not set'} → ${changes.visitTime.newValue || 'Not set'}`);
  }
  
  if (changes.visitLocation) {
    changeDescriptions.push(`Location: ${changes.visitLocation.oldValue || 'Not set'} → ${changes.visitLocation.newValue || 'Not set'}`);
  }
  
  const description = `Visit updated: ${changeDescriptions.join(', ')}`;
  await logAction(leadId, 'Visit Updated', description);
};

/**
 * ← UPDATED: Log contact information updates (added secondPhone support)
 * @param {number} leadId - The ID of the lead
 * @param {string} field - Field that was updated (e.g., 'email', 'phone', 'secondPhone')
 * @param {string} oldValue - Previous value
 * @param {string} newValue - New value
 * @returns {Promise<void>}
 */
export const logContactInfoUpdated = async (leadId, field, oldValue, newValue) => {
  const fieldLabels = {
    email: 'Email',
    phone: 'Phone',
    secondPhone: 'Second Phone', // ← NEW: Added secondPhone support
    occupation: 'Occupation',
    location: 'Location',
    source: 'Source',
    currentSchool: 'Current School'    
  };
  
  const label = fieldLabels[field] || field;
  
  // ← NEW: Special formatting for phone fields
  if (field === 'phone' || field === 'secondPhone') {
    const oldFormatted = oldValue ? (oldValue.startsWith('+91') ? oldValue : `+91${oldValue}`) : 'Not set';
    const newFormatted = newValue ? (newValue.startsWith('+91') ? newValue : `+91${newValue}`) : 'Not set';
    const description = `${label} updated from "${oldFormatted}" to "${newFormatted}"`;
    await logAction(leadId, 'Contact Info Updated', description);
    return;
  }
  
  const description = `${label} updated from "${oldValue || 'Not set'}" to "${newValue || 'Not set'}"`;
  await logAction(leadId, 'Contact Info Updated', description);
};

/**
 * Log admission status changes
 * @param {number} leadId - The ID of the lead
 * @param {string} type - Type of admission update ('registration' or 'enrollment')
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @returns {Promise<void>}
 */
export const logAdmissionStatusChange = async (leadId, type, oldStatus, newStatus) => {
  const typeLabels = {
    registrationFees: 'Registration Fees',
    enrolled: 'Enrollment Status'
  };
  
  const label = typeLabels[type] || type;
  const description = `${label} changed from "${oldStatus || 'Not set'}" to "${newStatus || 'Not set'}"`;
  await logAction(leadId, 'Admission Status Updated', description);
};

/**
 * Log offer changes
 * @param {number} leadId - The ID of the lead
 * @param {string} oldOffer - Previous offer
 * @param {string} newOffer - New offer
 * @returns {Promise<void>}
 */
export const logOfferChange = async (leadId, oldOffer, newOffer) => {
  const description = `Offer changed from "${oldOffer || 'No offer'}" to "${newOffer || 'No offer'}"`;
  await logAction(leadId, 'Offer Updated', description);
};

/**
 * Log counsellor assignment changes
 * @param {number} leadId - The ID of the lead
 * @param {string} oldCounsellor - Previous counsellor
 * @param {string} newCounsellor - New counsellor
 * @returns {Promise<void>}
 */
export const logCounsellorChange = async (leadId, oldCounsellor, newCounsellor) => {
  const description = `Counsellor changed from "${oldCounsellor || 'Unassigned'}" to "${newCounsellor || 'Unassigned'}"`;
  await logAction(leadId, 'Counsellor Updated', description);
};

/**
 * Log custom field changes
 * @param {number} leadId - The ID of the lead
 * @param {string} fieldName - Custom field display name
 * @param {string} oldValue - Previous value
 * @param {string} newValue - New value
 * @returns {Promise<void>}
 */
export const logCustomFieldChange = async (leadId, fieldName, oldValue, newValue) => {
  const description = `${fieldName} updated from "${oldValue || 'Not set'}" to "${newValue || 'Not set'}"`;
  await logAction(leadId, 'Custom Field Updated', description);
};

/**
 * Log WhatsApp message sending (for action buttons)
 * @param {number} leadId - The ID of the lead
 * @param {string} stageField - Stage field (e.g., 'stage2_status')
 * @param {string} stageName - Human readable stage name (DISPLAY NAME, not stage_key)
 * @returns {Promise<void>}
 */
export const logWhatsAppMessage = async (leadId, stageField, stageName) => {
  const description = `WhatsApp message sent for ${stageName}`;
  await logAction(leadId, 'WhatsApp Message Sent', description);
};

/**
 * Log manual history entries
 * @param {number} leadId - The ID of the lead
 * @param {string} actionType - Type of action (e.g., 'Call', 'Email')
 * @param {string} details - Details of the action
 * @returns {Promise<void>}
 */
export const logManualEntry = async (leadId, actionType, details) => {
  await logAction(leadId, actionType, details);
};

/**
 * ← UPDATED: Generate a comprehensive change description for multiple field updates (added secondPhone support)
 * @param {object} changes - Object containing field changes (should use display names for stages)
 * @param {function} getFieldLabel - Function to get field labels (optional)
 * @returns {string} Formatted change description
 */
export const generateChangeDescription = (changes, getFieldLabel = null) => {
  const fieldLabels = {
    email: 'Email',
    phone: 'Phone',
    secondPhone: 'Second Phone', // ← NEW: Added secondPhone support
    occupation: 'Occupation',
    location: 'Location',
    currentSchool: 'Current School',
    meetingDate: 'Meeting Date',
    meetingTime: 'Meeting Time',
    meetingLink: 'Meeting Link',
    visitDate: 'Visit Date',
    visitTime: 'Visit Time',
    visitLocation: 'Visit Location',
    registrationFees: 'Registration Fees',
    enrolled: 'Enrollment Status',
    offer: 'Offer',
    stage: 'Stage',
    counsellor: 'Counsellor',
    source: 'Source',
    grade: 'Grade'    
  };

  const changeDescriptions = Object.entries(changes).map(([field, { oldValue, newValue }]) => {
    let label;
    
    // Handle custom fields (those starting with "custom_")
    if (field.startsWith('custom_')) {
      // Remove "custom_" prefix to get the field display name
      label = field.replace('custom_', '');
    } else {
      // Use getFieldLabel function if provided, otherwise use default labels
      label = getFieldLabel ? getFieldLabel(field) : fieldLabels[field] || field;
    }
    
    // Handle special formatting for dates and times
    if (field === 'meetingDate' || field === 'visitDate') {
      const oldFormatted = oldValue ? new Date(oldValue).toLocaleDateString('en-GB') : 'Not set';
      const newFormatted = newValue ? new Date(newValue).toLocaleDateString('en-GB') : 'Not set';
      return `${label}: "${oldFormatted}" → "${newFormatted}"`;
    }
    
    // ← UPDATED: Handle both phone and secondPhone formatting
    if (field === 'phone' || field === 'secondPhone') {
      const oldFormatted = oldValue ? (oldValue.startsWith('+91') ? oldValue : `+91${oldValue}`) : 'Not set';
      const newFormatted = newValue ? (newValue.startsWith('+91') ? newValue : `+91${newValue}`) : 'Not set';
      return `${label}: "${oldFormatted}" → "${newFormatted}"`;
    }
    
    return `${label}: "${oldValue || 'Not set'}" → "${newValue || 'Not set'}"`;
  });

  return changeDescriptions.join(', ');
};

/**
 * Utility function to format date/time for display in logs
 * @param {string} date - Date string
 * @param {string} time - Time string (optional)
 * @returns {string} Formatted date/time string
 */
export const formatDateTimeForLog = (date, time) => {
  if (!date) return 'Not set';
  
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  if (time) {
    const [hours, minutes] = time.split(':');
    const timeObj = new Date();
    timeObj.setHours(hours, minutes);
    const formattedTime = timeObj.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${formattedDate} at ${formattedTime}`;
  }
  
  return formattedDate;
};

/**
 * Log form submission (for Add/Edit lead forms)
 * @param {number} leadId - The ID of the lead
 * @param {string} formType - Type of form ('add' or 'edit')
 * @param {object} leadData - The lead data (should contain display names, not keys)
 * @returns {Promise<void>}
 */
export const logFormSubmission = async (leadId, formType, leadData) => {
  if (formType === 'add') {
    await logLeadCreated(leadId, leadData);
  } else if (formType === 'edit') {
    const description = `Lead information updated via form: ${leadData.parentsName} (${leadData.kidsName})`;
    await logAction(leadId, 'Form Updated', description);
  }
};

/**
 * ← UPDATED: Helper function to detect and log specific types of changes (added secondPhone support)
 * @param {number} leadId - The ID of the lead
 * @param {object} oldData - Original data (should contain display names for stages)
 * @param {object} newData - New data (should contain display names for stages)
 * @returns {Promise<void>}
 */
export const logSpecificChanges = async (leadId, oldData, newData) => {
  // Log stage changes (expects display names, not stage_keys)
  if (oldData.stage !== newData.stage) {
    await logStageChange(leadId, oldData.stage, newData.stage, 'form');
  }
  
  // Log counsellor changes
  if (oldData.counsellor !== newData.counsellor) {
    await logCounsellorChange(leadId, oldData.counsellor, newData.counsellor);
  }
  
  // Log offer changes
  if (oldData.offer !== newData.offer) {
    await logOfferChange(leadId, oldData.offer, newData.offer);
  }
  
  // Log meeting changes
  if (oldData.meetingDate !== newData.meetingDate || 
      oldData.meetingTime !== newData.meetingTime || 
      oldData.meetingLink !== newData.meetingLink) {
    
    const changes = {};
    if (oldData.meetingDate !== newData.meetingDate) {
      changes.meetingDate = { oldValue: oldData.meetingDate, newValue: newData.meetingDate };
    }
    if (oldData.meetingTime !== newData.meetingTime) {
      changes.meetingTime = { oldValue: oldData.meetingTime, newValue: newData.meetingTime };
    }
    if (oldData.meetingLink !== newData.meetingLink) {
      changes.meetingLink = { oldValue: oldData.meetingLink, newValue: newData.meetingLink };
    }
    
    await logMeetingUpdated(leadId, changes);
  }
  
  // Log visit changes
  if (oldData.visitDate !== newData.visitDate || 
      oldData.visitTime !== newData.visitTime || 
      oldData.visitLocation !== newData.visitLocation) {
    
    const changes = {};
    if (oldData.visitDate !== newData.visitDate) {
      changes.visitDate = { oldValue: oldData.visitDate, newValue: newData.visitDate };
    }
    if (oldData.visitTime !== newData.visitTime) {
      changes.visitTime = { oldValue: oldData.visitTime, newValue: newData.visitTime };
    }
    if (oldData.visitLocation !== newData.visitLocation) {
      changes.visitLocation = { oldValue: oldData.visitLocation, newValue: newData.visitLocation };
    }
    
    await logVisitUpdated(leadId, changes);
  }
  
  // Log admission status changes
  if (oldData.registrationFees !== newData.registrationFees) {
    await logAdmissionStatusChange(leadId, 'registrationFees', oldData.registrationFees, newData.registrationFees);
  }
  
  if (oldData.enrolled !== newData.enrolled) {
    await logAdmissionStatusChange(leadId, 'enrolled', oldData.enrolled, newData.enrolled);
  }
  
  // ← UPDATED: Log contact info changes (added secondPhone support)
  const contactFields = ['email', 'phone', 'secondPhone', 'occupation', 'location', 'source', 'currentSchool', 'notes'];
  for (const field of contactFields) {
    if (oldData[field] !== newData[field]) {
      await logContactInfoUpdated(leadId, field, oldData[field], newData[field]);
    }
  }
  
  // Log custom field changes
  // Look for fields that start with "custom_" and log them as custom field changes
  const customFieldChanges = Object.keys(newData).filter(key => key.startsWith('custom_'));
  for (const customField of customFieldChanges) {
    if (oldData[customField] !== newData[customField]) {
      const fieldName = customField.replace('custom_', '');
      await logCustomFieldChange(leadId, fieldName, oldData[customField], newData[customField]);
    }
  }
};

/**
 * UTILITY FUNCTION: Convert stage_key to display name for logging
 * This function can be used by components that need to log stage changes
 * but only have access to stage_keys.
 * 
 * @param {string} stageKeyOrName - Either a stage_key or stage display name
 * @param {function} getStageDisplayName - Function from SettingsDataProvider to convert stage_key to display name
 * @returns {string} Display name for logging
 */
export const getStageDisplayNameForLogging = (stageKeyOrName, getStageDisplayName) => {
  if (!getStageDisplayName) {
    console.warn('getStageDisplayName function not provided, using value as-is for logging');
    return stageKeyOrName;
  }
  
  // Try to get display name, fallback to original value if conversion fails
  return getStageDisplayName(stageKeyOrName) || stageKeyOrName;
};

// Export all functions as default object for easy importing
export default {
  logAction,
  logLeadCreated,
  logLeadUpdated,
  logStageChange,
  logMeetingScheduled,
  logMeetingUpdated,
  logVisitScheduled,
  logVisitUpdated,
  logContactInfoUpdated,
  logAdmissionStatusChange,
  logOfferChange,
  logCounsellorChange,
  logCustomFieldChange,
  logWhatsAppMessage,
  logManualEntry,
  logFormSubmission,
  logSpecificChanges,
  formatDateTimeForLog,
  generateChangeDescription,
  getStageDisplayNameForLogging
};