import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import { supabase } from '../lib/supabase';
import { settingsService } from '../services/settingsService';
import { TABLE_NAMES } from '../config/tableNames';
import { 
  logAction,
  logMeetingScheduled,
  logVisitScheduled,
  logWhatsAppMessage,
  logManualEntry,
  generateChangeDescription
} from '../utils/historyLogger';
import { 
  Clipboard,
  History,
  FileText,
  Edit,
  ChevronDown,
  Calendar,
  X
} from 'lucide-react';
import { useLeadState } from './LeadStateProvider';
import InfoTab from './InfoTab';
import ActionTab from './ActionTab';
import { scheduleReminders, cancelReminders } from '../utils/api';

// Add debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper to check if date is today
const isToday = (dateString) => {
  const today = new Date();
  const date = new Date(dateString);
  return date.toDateString() === today.toDateString();
};

// Helper to check if date is in future
const isFuture = (dateString) => {
  const today = new Date();
  const date = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date > today;
};

// Helper to format date for display
const formatDateForDisplay = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const LeadSidebar = ({
  showSidebar,
  selectedLead,
  isEditingMode,
  sidebarFormData,
  stages,
  settingsData,
  onClose,
  onEditModeToggle,
  onFieldChange,
  onUpdateAllFields,
  onStageChange,
  onRefreshActivityData,
  onRefreshSingleLead,
  getStageColor,
  getCounsellorInitials,
  getScoreFromStage,
  getCategoryFromStage
}) => {  
  console.log('selectedLead data:', selectedLead);
  
  // Use the context hook for action status updates
  const { updateActionStatus } = useLeadState();
  
  // Use settings context for stage functions
  const { 
    getFieldLabel, 
    getStageInfo, 
    getStageColor: contextGetStageColor, 
    getStageCategory: contextGetStageCategory,
    getStageKeyFromName,
    getStageNameFromKey,
    stageMappings,
    stageKeyToDataMapping
  } = useSettingsData();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Stage statuses for action buttons - UPDATED with R1/R2
  const [stageStatuses, setStageStatuses] = useState({
    stage2_status: '',
    stage3_status: '',
    stage4_status: '',
    stage5_status: '',
    stage6_status: '',
    stage7_status: '',
    stage8_status: '',
    stage9_status: '',
    stage2_r1: '',
    stage2_r2: '',
    stage7_r1: '',
    stage7_r2: ''
  });

  const [historyData, setHistoryData] = useState([]);
  const [manualAction, setManualAction] = useState('');
  const [manualDetails, setManualDetails] = useState('');

  // Follow-up states
  const [followUpData, setFollowUpData] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpDetails, setFollowUpDetails] = useState('');
  
  // Store original values for comparison
  const [originalFormData, setOriginalFormData] = useState({});

  // Custom fields states
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [originalCustomFieldsData, setOriginalCustomFieldsData] = useState({});

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && showSidebar) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [isMobile, showSidebar]);

  // Convert stage names to stage_keys for leads
  const getLeadStageKey = (leadStageValue) => {
    if (stageKeyToDataMapping[leadStageValue]) {
      return leadStageValue;
    }
    
    const stageKey = getStageKeyFromName(leadStageValue);
    return stageKey || leadStageValue;
  };

  // Get stage display name for UI
  const getLeadStageDisplayName = (leadStageValue) => {
    if (stageKeyToDataMapping[leadStageValue]) {
      return getStageNameFromKey(leadStageValue);
    }
    
    return leadStageValue;
  };

  // Use context stage functions with stage_key support
  const getStageColorForLead = (stageValue) => {
    const stageKey = getLeadStageKey(stageValue);
    return contextGetStageColor(stageKey) || getStageColor?.(stageValue) || '#B3D7FF';
  };

  const getStageCategoryForLead = (stageValue) => {
    const stageKey = getLeadStageKey(stageValue);
    return contextGetStageCategory(stageKey) || getCategoryFromStage?.(stageValue) || 'New';
  };

  // Handle status updates from action buttons
  const handleStatusUpdate = async (stageField, newStatus) => {
    setStageStatuses(prev => ({
      ...prev,
      [stageField]: newStatus
    }));

    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ [stageField]: newStatus })
        .eq('id', selectedLead.id);

      if (error) throw error;
      
      // Use context to update action status
      updateActionStatus(selectedLead.id, stageField, newStatus);
      
      // Log the WhatsApp message action in background
      const stageNames = {
        'stage2_status': 'Stage 2 - Connected',
        'stage3_status': 'Stage 3 - Meeting Booked',
        'stage4_status': 'Stage 4 - Meeting Done',
        'stage5_status': 'Stage 5 - Proposal Sent',
        'stage6_status': 'Stage 6 - Visit Booked',
        'stage7_status': 'Stage 7 - Visit Done',
        'stage8_status': 'Stage 8 - Registered',
        'stage9_status': 'Stage 9 - Enrolled'
      };
      
      // Don't wait for logging - do it in background
      logWhatsAppMessage(selectedLead.id, stageField, stageNames[stageField]);
      
      // Only refresh history if user is viewing history tab
      if (activeTab === 'history') {
        fetchHistory();
      }
      
    } catch (error) {
      setStageStatuses(prev => ({
        ...prev,
        [stageField]: ''
      }));
      alert(`Failed to update status: ${error.message}`);
    }
  };

  // Fetch custom fields for the selected lead
  const fetchCustomFields = async () => {
    if (!selectedLead?.id) return;
    
    try {
      console.log('Fetching custom fields for lead:', selectedLead.id);
      const customFields = await settingsService.getCustomFieldsForLead(selectedLead.id);
      console.log('Fetched custom fields:', customFields);
      
      setCustomFieldsData(customFields);
      setOriginalCustomFieldsData({ ...customFields });
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      setCustomFieldsData({});
      setOriginalCustomFieldsData({});
    }
  };

  // Handle custom field changes
  const handleCustomFieldChange = (fieldKey, value) => {
    console.log('Custom field change:', fieldKey, value);
    setCustomFieldsData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Fetch follow-ups for the selected lead
  const fetchFollowUps = async () => {
    if (!selectedLead?.id) return;
    
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.FOLLOW_UPS)
        .select('*')
        .eq('lead_id', selectedLead.id)
        .order('follow_up_date', { ascending: false });

      if (error) throw error;
      setFollowUpData(data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    }
  };

  // Handle follow-up submission
  const handleFollowUpSubmit = async () => {
    if (!followUpDate.trim() || !followUpDetails.trim()) {
      alert('Please fill in both Date and Details');
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.FOLLOW_UPS)
        .insert({
          lead_id: selectedLead.id,
          follow_up_date: followUpDate,
          details: followUpDetails
        });

      if (error) throw error;

      setFollowUpDate('');
      setFollowUpDetails('');
      
      fetchFollowUps();
      
    } catch (error) {
      console.error('Error adding follow-up:', error);
      alert('Failed to add follow-up');
    }
  };

  // Update original form data when selectedLead changes - UPDATED with R1/R2 and notes
  useEffect(() => {
    if (selectedLead) {
      setOriginalFormData({
        parentsName: selectedLead.parentsName || '',
        kidsName: selectedLead.kidsName || '',
        grade: selectedLead.grade || '',
        source: selectedLead.source || (settingsData?.sources?.[0]?.name || 'Instagram'),
        stage: selectedLead.stage,
        counsellor: selectedLead.counsellor || '', 
        offer: selectedLead.offer || 'Welcome Kit',
        email: selectedLead.email || '',
        phone: selectedLead.phone || '',
        secondPhone: selectedLead?.secondPhone || '',
        occupation: selectedLead.occupation || '',
        location: selectedLead.location || '',
        currentSchool: selectedLead.currentSchool || '',
        meetingDate: selectedLead.meetingDate || '',
        meetingTime: selectedLead.meetingTime || '',
        meetingLink: selectedLead.meetingLink || '',
        visitDate: selectedLead.visitDate || '',
        visitTime: selectedLead.visitTime || '',
        visitLocation: selectedLead.visitLocation || '',
        registrationFees: selectedLead.registrationFees || '',
        enrolled: selectedLead.enrolled || '',
        notes: selectedLead.notes || '' // ✅ ADD notes to original data
      });

      // Update stage statuses - UPDATED with R1/R2
      setStageStatuses({
        stage2_status: selectedLead.stage2_status || '',
        stage3_status: selectedLead.stage3_status || '',
        stage4_status: selectedLead.stage4_status || '',
        stage5_status: selectedLead.stage5_status || '',
        stage6_status: selectedLead.stage6_status || '',
        stage7_status: selectedLead.stage7_status || '',
        stage8_status: selectedLead.stage8_status || '',
        stage9_status: selectedLead.stage9_status || '',
        stage2_r1: selectedLead.stage2_r1 || '',
        stage2_r2: selectedLead.stage2_r2 || '',
        stage7_r1: selectedLead.stage7_r1 || '',
        stage7_r2: selectedLead.stage7_r2 || ''
      });
      
      // Fetch custom fields when lead changes
      fetchCustomFields();
    }
  }, [selectedLead, settingsData]);

  // Fetch history
  const fetchHistory = async () => {
    if (!selectedLead?.id) return;
    
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LOGS)
        .select('*')
        .eq('record_id', selectedLead.id.toString())
        .order('action_timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleManualHistoryUpdate = async () => {
    if (!manualAction.trim() || !manualDetails.trim()) {
      alert('Please fill in both Action Type and Details');
      return;
    }

    try {
      await logManualEntry(selectedLead.id, manualAction, manualDetails);
      setManualAction('');
      setManualDetails('');
      fetchHistory();
    } catch (error) {
      alert('Failed to add history entry');
    }
  };

  // Refresh lead function to pass to InfoTab - UPDATED with R1/R2
  const handleRefreshLead = async () => {
    try {
      // Fetch fresh lead data from database
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .select('*')
        .eq('id', selectedLead.id)
        .single();

      if (error) throw error;

      // Update stage statuses from fresh data - UPDATED with R1/R2
      setStageStatuses({
        stage2_status: data.stage2_status || '',
        stage3_status: data.stage3_status || '',
        stage4_status: data.stage4_status || '',
        stage5_status: data.stage5_status || '',
        stage6_status: data.stage6_status || '',
        stage7_status: data.stage7_status || '',
        stage8_status: data.stage8_status || '',
        stage9_status: data.stage9_status || '',
        stage2_r1: data.stage2_r1 || '',
        stage2_r2: data.stage2_r2 || '',
        stage7_r1: data.stage7_r1 || '',
        stage7_r2: data.stage7_r2 || ''
      });

      // Refresh activity data if callback provided
      if (onRefreshActivityData) {
        await onRefreshActivityData();
      }

      console.log('Lead data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing lead:', error);
    }
  };

  // Handle stage change with stage_key support
  const handleStageChange = async (newStageValue) => {
    try {
      console.log('=== STAGE CHANGE ===');
      console.log('New stage value:', newStageValue);
      
      let stageKeyToStore, stageNameToDisplay;
      
      if (stageKeyToDataMapping[newStageValue]) {
        stageKeyToStore = newStageValue;
        stageNameToDisplay = getStageNameFromKey(newStageValue);
      } else {
        stageKeyToStore = getStageKeyFromName(newStageValue);
        stageNameToDisplay = newStageValue;
      }
      
      console.log('Stage key to store:', stageKeyToStore);
      console.log('Stage name to display:', stageNameToDisplay);
      
      onFieldChange('stage', stageKeyToStore || newStageValue);
      
      setStageDropdownOpen(false);
      
      if (onStageChange) {
        await onStageChange(selectedLead.id, stageKeyToStore || newStageValue);
        
        if (activeTab === 'history') {
          fetchHistory();
        }
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Error updating stage: ' + error.message);
    }
  };

  // ✅ UPDATED: Update function with scheduler integration AND notes logging
  const handleUpdateAllFields = async () => {
    try {
      const changes = {};
      
      // Compare each standard field and track changes
      Object.keys(sidebarFormData).forEach(field => {
          const oldValue = originalFormData[field];
          const newValue = sidebarFormData[field];
          
          if (oldValue !== newValue) {
            changes[field] = {
              oldValue,
              newValue
            };
          }
        });

      // Compare custom fields and track changes
      Object.keys(customFieldsData).forEach(fieldKey => {
        const oldValue = originalCustomFieldsData[fieldKey];
        const newValue = customFieldsData[fieldKey];
        
        if (oldValue !== newValue) {
          const fieldDef = settingsData?.form_fields?.find(f => 
            (f.field_key && f.field_key === fieldKey) || 
            f.name.toLowerCase().replace(/[^a-z0-9]/g, '') === fieldKey
          );
          const fieldDisplayName = fieldDef ? fieldDef.name : fieldKey;
          
          changes[`custom_${fieldDisplayName}`] = {
            oldValue,
            newValue
          };
        }
      });

      console.log('=== SCHEDULING DEBUG ===');
      console.log('Changes detected:', changes);

      // Save custom fields to database
      if (Object.keys(customFieldsData).some(key => customFieldsData[key] !== originalCustomFieldsData[key])) {
        try {
          console.log('Saving custom fields:', customFieldsData);
          await settingsService.saveCustomFieldsForLead(selectedLead.id, customFieldsData);
          console.log('Custom fields saved successfully');
          
          setOriginalCustomFieldsData({ ...customFieldsData });
        } catch (error) {
          console.error('Error saving custom fields:', error);
          if (error.message.includes('Maximum 5 custom fields allowed')) {
            alert('Maximum 5 custom fields allowed per lead');
            return;
          }
          alert('Error saving custom fields: ' + error.message);
          return;
        }
      }

      // Call the parent's update function for standard fields
      await onUpdateAllFields();
      
      // Schedule reminders after successful update
      try {
        // Check if meeting date/time changed
        const meetingDateChanged = changes.meetingDate || changes.meetingTime;
        const hasMeetingDetails = sidebarFormData.meetingDate && sidebarFormData.meetingTime;

        if (meetingDateChanged && hasMeetingDetails) {
          console.log('Meeting details changed, scheduling reminders...');
          await scheduleReminders(
            selectedLead.id,
            selectedLead.phone,
            selectedLead.parentsName,
            sidebarFormData.meetingDate,
            sidebarFormData.meetingTime,
            'meeting'
          );
          console.log('Meeting reminders scheduled successfully');
        } else if (hasMeetingDetails && !originalFormData.meetingDate && !originalFormData.meetingTime) {
          // First time adding meeting details
          console.log('New meeting details added, scheduling reminders...');
          await scheduleReminders(
            selectedLead.id,
            selectedLead.phone,
            selectedLead.parentsName,
            sidebarFormData.meetingDate,
            sidebarFormData.meetingTime,
            'meeting'
          );
          console.log('Meeting reminders scheduled successfully');
        }

        // Check if visit date/time changed
        const visitDateChanged = changes.visitDate || changes.visitTime;
        const hasVisitDetails = sidebarFormData.visitDate && sidebarFormData.visitTime;

        if (visitDateChanged && hasVisitDetails) {
          console.log('Visit details changed, scheduling reminders...');
          await scheduleReminders(
            selectedLead.id,
            selectedLead.phone,
            selectedLead.parentsName,
            sidebarFormData.visitDate,
            sidebarFormData.visitTime,
            'visit'
          );
          console.log('Visit reminders scheduled successfully');
        } else if (hasVisitDetails && !originalFormData.visitDate && !originalFormData.visitTime) {
          // First time adding visit details
          console.log('New visit details added, scheduling reminders...');
          await scheduleReminders(
            selectedLead.id,
            selectedLead.phone,
            selectedLead.parentsName,
            sidebarFormData.visitDate,
            sidebarFormData.visitTime,
            'visit'
          );
          console.log('Visit reminders scheduled successfully');
        }
      } catch (reminderError) {
        console.error('Error scheduling reminders:', reminderError);
        // Don't fail the whole update if reminder scheduling fails
      }
      
      // Log changes if any exist
      if (Object.keys(changes).length > 0) {
        // Log meeting scheduling if both date and time are present
        if (changes.meetingDate || changes.meetingTime) {
          const meetingDate = sidebarFormData.meetingDate;
          const meetingTime = sidebarFormData.meetingTime;
          
          if (meetingDate && meetingTime) {
            await logMeetingScheduled(
              selectedLead.id,
              meetingDate,
              meetingTime,
              sidebarFormData.meetingLink
            );
          }
        }
        
        // Log visit scheduling if both date and time are present
        if (changes.visitDate || changes.visitTime) {
          const visitDate = sidebarFormData.visitDate;
          const visitTime = sidebarFormData.visitTime;
          
          if (visitDate && visitTime) {
            await logVisitScheduled(
              selectedLead.id,
              visitDate,
              visitTime,
              sidebarFormData.visitLocation
            );
          }
        }
        
        // ✅ NEW: Log notes changes separately if they exist
        if (changes.notes) {
          const oldNotes = changes.notes.oldValue || 'No notes';
          const newNotes = changes.notes.newValue || 'No notes';
          await logAction(
            selectedLead.id, 
            'Notes Updated', 
            `Notes changed from "${oldNotes.substring(0, 50)}${oldNotes.length > 50 ? '...' : ''}" to "${newNotes.substring(0, 50)}${newNotes.length > 50 ? '...' : ''}"`
          );
          
          // Remove notes from changes so it's not logged again in the general update
          delete changes.notes;
        }
        
        // Log a general update summary for all OTHER changes (excluding notes)
        if (Object.keys(changes).length > 0) {
          const changeDescription = generateChangeDescription(changes, getFieldLabel);
          await logAction(selectedLead.id, 'Lead Information Updated', `Updated via sidebar: ${changeDescription}`);
        }
        
        // Refresh activity data after logging
        if (onRefreshActivityData) {
          await onRefreshActivityData();
        }
      }
      
      // Refresh history
      fetchHistory();
      
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead: ' + error.message);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (stageDropdownOpen) {
        setStageDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [stageDropdownOpen]);

  // Fetch data based on active tab - UPDATED WITH IMMEDIATE ACTION REFRESH
  useEffect(() => {
    if (selectedLead?.id) {
      if (activeTab === 'history') {
        fetchHistory();
      } else if (activeTab === 'followup') {
        fetchFollowUps();
      } else if (activeTab === 'info') {
        fetchCustomFields();
      } else if (activeTab === 'action') {
        // Immediately refresh statuses when switching to Action tab
        const refreshActionStatuses = async () => {
          try {
            const { data, error } = await supabase
              .from(TABLE_NAMES.LEADS)
              .select('stage2_r1, stage2_r2, stage7_r1, stage7_r2, stage2_status, stage3_status, stage4_status, stage5_status, stage6_status, stage7_status, stage8_status, stage9_status')
              .eq('id', selectedLead.id)
              .single();

            if (!error && data) {
              setStageStatuses({
                stage2_status: data.stage2_status || '',
                stage3_status: data.stage3_status || '',
                stage4_status: data.stage4_status || '',
                stage5_status: data.stage5_status || '',
                stage6_status: data.stage6_status || '',
                stage7_status: data.stage7_status || '',
                stage8_status: data.stage8_status || '',
                stage9_status: data.stage9_status || '',
                stage2_r1: data.stage2_r1 || '',
                stage2_r2: data.stage2_r2 || '',
                stage7_r1: data.stage7_r1 || '',
                stage7_r2: data.stage7_r2 || ''
              });
            }
          } catch (error) {
            console.error('Error refreshing action statuses:', error);
          }
        };
        
        refreshActionStatuses();
      }
    }
  }, [selectedLead?.id, activeTab]);

  // Refresh history when lead data changes
  useEffect(() => {
    if (selectedLead?.id && activeTab === 'history') {
      setTimeout(() => {
        fetchHistory();
      }, 500);
    }
  }, [selectedLead?.id, selectedLead?.stage, selectedLead?.phone, selectedLead?.email]);

  // AUTO-REFRESH FOR R1/R2 STATUS
  useEffect(() => {
    let intervalId;
    
    if (selectedLead?.id && activeTab === 'action') {
      intervalId = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from(TABLE_NAMES.LEADS)
            .select('stage2_r1, stage2_r2, stage7_r1, stage7_r2, stage2_status, stage3_status, stage4_status, stage5_status, stage6_status, stage7_status, stage8_status, stage9_status')
            .eq('id', selectedLead.id)
            .single();

          if (!error && data) {
            setStageStatuses({
              stage2_status: data.stage2_status || '',
              stage3_status: data.stage3_status || '',
              stage4_status: data.stage4_status || '',
              stage5_status: data.stage5_status || '',
              stage6_status: data.stage6_status || '',
              stage7_status: data.stage7_status || '',
              stage8_status: data.stage8_status || '',
              stage9_status: data.stage9_status || '',
              stage2_r1: data.stage2_r1 || '',
              stage2_r2: data.stage2_r2 || '',
              stage7_r1: data.stage7_r1 || '',
              stage7_r2: data.stage7_r2 || ''
            });
          }
        } catch (error) {
          console.error('Auto-refresh error:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedLead?.id, activeTab]);

  // Handle mobile close with swipe gesture (optional enhancement)
  const handleTouchStart = useCallback((e) => {
  
  }, [isMobile, onClose]);

  if (!showSidebar) return null;

  // Get current stage info for display
  const currentStageKey = getLeadStageKey(sidebarFormData.stage || selectedLead?.stage);
  const currentStageDisplayName = getLeadStageDisplayName(sidebarFormData.stage || selectedLead?.stage);

  // Get today's date for min date validation
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      {/* Overlay - only show on desktop */}
      {!isMobile && <div className="lead-sidebar-overlay" onClick={onClose}></div>}
      
      <div 
        className="lead-sidebar" 
        style={{display: 'block'}}
        onTouchStart={handleTouchStart}
      >
        {/* Header with Parent Name and Lead ID */}
        <div className="lead-sidebar-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h5 className="lead-sidebar-title">
              {selectedLead?.parentsName}
            </h5>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Lead ID: {selectedLead?.id}
            </div>
          </div>
          <button onClick={onClose} className="lead-sidebar-close-btn">
            {isMobile ? <X size={18} /> : '×'}
          </button>
        </div>
        
        {/* Created Date */}
        <div className="lead-sidebar-created-date">
          Created {selectedLead?.createdTime}
        </div>
        
        {/* Light Border - hidden on mobile */}
        <div className="lead-sidebar-divider"></div>
        <div className="lead-sidebar-content">
          {/* Two Column Layout - becomes single column on mobile */}
          <div className="lead-sidebar-two-column">
            {/* Left Column */}
            <div className="lead-sidebar-left-column">
              {/* Kid Name */}
              <div className="lead-sidebar-field">
                <label className="lead-sidebar-field-label">
                  Kid Name
                </label>
                <div className="lead-sidebar-field-value">
                  {selectedLead?.kidsName}
                </div>
              </div>

              {/* Class */}
              <div className="lead-sidebar-field">
                <label className="lead-sidebar-field-label">
                  Class
                </label>
                <div className="lead-sidebar-field-value">
                  {selectedLead?.grade}
                </div>
              </div>

              {/* Phone */}
              <div className="lead-sidebar-field">
                <label className="lead-sidebar-field-label">
                  Phone
                </label>
                <div className="lead-sidebar-field-value">
                  {selectedLead?.phone}
                </div>
              </div>

              {/* Email */}
              <div className="lead-sidebar-field">
                <label className="lead-sidebar-field-label">
                  Email
                </label>
                <div className="lead-sidebar-field-value">
                  {sidebarFormData.email || ''}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Stage with stage_key support */}
              <div className="lead-sidebar-stage-container">
                <label className="lead-sidebar-stage-label">
                  Stage
                </label>
                <div className="lead-sidebar-stage-dropdown">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setStageDropdownOpen(!stageDropdownOpen);
                    }}
                    className="lead-sidebar-stage-button"
                    style={{ backgroundColor: getStageColorForLead(currentStageKey) }}
                  >
                    <span>{currentStageDisplayName}</span>
                    <ChevronDown 
                      size={isMobile ? 16 : 12} 
                      style={{ 
                        transform: stageDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </div>
                  
                  {stageDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="lead-sidebar-stage-dropdown-menu"
                    >
                      {stages.map((stage, index) => {
                        const stageKey = getStageKeyFromName(stage.value) || stage.value;
                        const stageName = stage.label;
                        
                        return (
                          <div
                            key={stage.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageChange(stageKey);
                            }}
                            className="lead-sidebar-stage-item"
                          >
                            <span 
                              className="lead-sidebar-stage-dot"
                              style={{ backgroundColor: stage.color }}
                            ></span>
                            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{stageName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Status with stage_key support */}
              <div className="lead-sidebar-info-row">
                <label className="lead-sidebar-stage-label">
                  Status
                </label>
                <div className="lead-sidebar-field-value">
                  {getStageCategoryForLead(currentStageKey)}
                </div>
              </div>

              {/* Source */}
              <div className="lead-sidebar-info-row">
                <label className="lead-sidebar-stage-label">
                  Source
                </label>
                <div className="lead-sidebar-field-value">
                  {selectedLead?.source || (settingsData?.sources?.[0]?.name || 'Instagram')}
                </div>
              </div>

              {/* Counsellor */}
              <div className="lead-sidebar-counsellor-container">
                <label className="lead-sidebar-stage-label">
                  Counsellor
                </label>
                <div className="lead-sidebar-counsellor-info">
                  <div className="lead-sidebar-counsellor-avatar">
                    {getCounsellorInitials(selectedLead?.counsellor)}
                  </div>
                  <span className="lead-sidebar-counsellor-name">
                    {selectedLead?.counsellor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="lead-sidebar-tabs">
            <div className="lead-sidebar-tabs-container">
              <button 
                onClick={() => setActiveTab('info')}
                className={`lead-sidebar-tab-button ${activeTab === 'info' ? 'active' : ''}`}
              >
                <Clipboard size={isMobile ? 18 : 16} /> 
                {isMobile ? 'Info' : 'Info'}
              </button>
              <button 
                onClick={() => setActiveTab('action')}
                className={`lead-sidebar-tab-button ${activeTab === 'action' ? 'active' : ''}`}
              >
                <History size={isMobile ? 18 : 16} /> 
                {isMobile ? 'Action' : 'Action'}
              </button>
              <button 
                onClick={() => setActiveTab('followup')}
                className={`lead-sidebar-tab-button ${activeTab === 'followup' ? 'active' : ''}`}
              >
                <Calendar size={isMobile ? 18 : 16} /> 
                {isMobile ? 'Follow Up' : 'Follow Up'}
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`lead-sidebar-tab-button ${activeTab === 'history' ? 'active' : ''}`}
              >
                <FileText size={isMobile ? 18 : 16} /> 
                {isMobile ? 'History' : 'History'}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <InfoTab
              selectedLead={selectedLead}
              isEditingMode={isEditingMode}
              sidebarFormData={sidebarFormData}
              onFieldChange={onFieldChange}
              settingsData={settingsData}
              getFieldLabel={getFieldLabel}
              customFieldsData={customFieldsData}
              onCustomFieldChange={handleCustomFieldChange}
              onRefreshLead={handleRefreshLead}
              onRefreshSingleLead={onRefreshSingleLead}
             />
          )}

          {/* Action Tab Content */}
          {activeTab === 'action' && (
            <ActionTab
              selectedLead={selectedLead}
              sidebarFormData={sidebarFormData}
              stageStatuses={stageStatuses}
              onStatusUpdate={handleStatusUpdate}
              getFieldLabel={getFieldLabel}
            />
          )}

          {/* Follow Up Tab Content */}
          {activeTab === 'followup' && (
            <div className="lead-sidebar-tab-content">
              {/* Follow Up Input Form */}
              <div className="lead-sidebar-follow-up-input">
                <h6 className="lead-sidebar-follow-up-input-title">
                  Schedule follow-up action for this lead:
                </h6>
                <div className="lead-sidebar-follow-up-input-form">
                  <div className="lead-sidebar-follow-up-input-group">
                    <label className="lead-sidebar-follow-up-input-label">
                      Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      min={today}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="lead-sidebar-follow-up-input-field"
                    />
                  </div>
                  <div className="lead-sidebar-history-input-group wide">
                    <label className="lead-sidebar-follow-up-input-label">
                      Details
                    </label>
                    <input
                      type="text"
                      value={followUpDetails}
                      onChange={(e) => setFollowUpDetails(e.target.value)}
                      placeholder="e.g., Call to follow up on meeting"
                      className="lead-sidebar-follow-up-input-field"
                    />
                  </div>
                  <button
                    onClick={handleFollowUpSubmit}
                    className="lead-sidebar-follow-up-update-btn"
                  >
                    Add Follow up
                  </button>
                </div>
              </div>

              {/* Follow Up Timeline */}
              <div className="lead-sidebar-follow-up-timeline">
                {followUpData.length > 0 ? (
                  followUpData.map((followUp, index) => {
                    const isFollowUpToday = isToday(followUp.follow_up_date);
                    const isFollowUpFuture = isFuture(followUp.follow_up_date);
                    
                    return (
                      <div key={followUp.id} className="lead-sidebar-follow-up-item">
                        {index < followUpData.length - 1 && (
                          <div className="lead-sidebar-follow-up-line"></div>
                        )}
                        
                        <div className={`lead-sidebar-follow-up-dot ${
                          isFollowUpToday ? 'today' : isFollowUpFuture ? 'future' : 'past'
                        }`}></div>
                        
                        <div className="lead-sidebar-follow-up-content">
                          <div className={`lead-sidebar-follow-up-action ${
                            isFollowUpToday ? 'today' : isFollowUpFuture ? 'future' : 'past'
                          }`}>
                            Follow Up - {formatDateForDisplay(followUp.follow_up_date)}
                          </div>
                          <div className="lead-sidebar-follow-up-description">
                            {followUp.details}
                          </div>
                          <div className="lead-sidebar-follow-up-time">
                            Added {new Date(followUp.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="lead-sidebar-follow-up-empty">
                    No follow-ups scheduled
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab Content */}
          {activeTab === 'history' && (
            <div className="lead-sidebar-tab-content">
              {/* Manual History Input */}
              <div className="lead-sidebar-history-input">
                <h6 className="lead-sidebar-history-input-title">
                  Enter your recent activity with the lead here:
                </h6>
                <div className="lead-sidebar-history-input-form">
                  <div className="lead-sidebar-history-input-group">
                    <label className="lead-sidebar-history-input-label">
                      Action Type
                    </label>
                    <input
                      type="text"
                      value={manualAction}
                      onChange={(e) => setManualAction(e.target.value)}
                      placeholder="e.g., Call"
                      className="lead-sidebar-history-input-field"
                    />
                  </div>
                  <div className="lead-sidebar-history-input-group wide">
                    <label className="lead-sidebar-history-input-label">
                      Details
                    </label>
                    <input
                      type="text"
                      value={manualDetails}
                      onChange={(e) => setManualDetails(e.target.value)}
                      placeholder="e.g., They will visit the school on 14 Jul at 5pm"
                      className="lead-sidebar-history-input-field"
                    />
                  </div>
                  <button
                    onClick={handleManualHistoryUpdate}
                    className="lead-sidebar-history-update-btn"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* History Timeline */}
              <div className="lead-sidebar-history-timeline">
                {historyData.length > 0 ? (
                  historyData.map((entry, index) => (
                    <div key={entry.id} className="lead-sidebar-history-item">
                      {index < historyData.length - 1 && (
                        <div className="lead-sidebar-history-line"></div>
                      )}
                      
                      <div className={`lead-sidebar-history-dot ${isToday(entry.action_timestamp) ? 'today' : 'past'}`}></div>
                      
                      <div className="lead-sidebar-history-content">
                        <div className={`lead-sidebar-history-action ${isToday(entry.action_timestamp) ? 'today' : 'past'}`}>
                          {entry.main_action}
                        </div>
                        <div className="lead-sidebar-history-description">
                          {entry.description}
                        </div>
                        <div className="lead-sidebar-history-time">
                          {new Date(entry.action_timestamp).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lead-sidebar-history-empty">
                    No history available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit/Update Button - Only show for Info tab */}
          {activeTab === 'info' && (
            <div className="lead-sidebar-update-section">
              {!isEditingMode ? (
                <button 
                  onClick={onEditModeToggle}
                  className="lead-sidebar-update-button"
                >
                  <Edit size={isMobile ? 18 : 16} /> Update
                </button>
              ) : (
                <div className="lead-sidebar-update-buttons">
                  <button 
                    onClick={handleUpdateAllFields}
                    className="primary"
                  >
                    Update
                  </button>
                  <button 
                    onClick={onEditModeToggle}
                    className="secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeadSidebar;