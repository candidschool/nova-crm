import React, { useEffect, useState } from 'react';
import { settingsService } from '../services/settingsService';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { CheckCircle, XCircle } from 'lucide-react';
import { cancelReminders } from '../utils/api';

const InfoTab = ({
  selectedLead,
  isEditingMode,
  formData,
  onFieldChange,
  stages,
  settingsData,
  getStageColor,
  canEdit = true,
  canReassign = true,
  customFieldsData = {},      // ✅ ADDED
  onCustomFieldChange,        // ✅ ADDED
  onRefreshSingleLead,        // ✅ ADDED
  getFieldLabel               // ✅ ADDED (was missing)
}) => {
  
  const [showMeetingConfirmation, setShowMeetingConfirmation] = useState(false);
  const [showVisitConfirmation, setShowVisitConfirmation] = useState(false);
  const [meetingConfirmed, setMeetingConfirmed] = useState(false);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  
  if (!settingsData) {
    console.log('settingsData not loaded yet');
    return <div className="lead-sidebar-tab-content">Loading settings...</div>;
  }

  const sources = settingsData?.sources?.map(source => source.name) || ['Instagram'];
  const grades = settingsData?.grades?.map(grade => grade.name) || ['LKG'];

  const hasDateTimePassed = (date, time) => {
    if (!date || !time || date === '' || time === '') {
      console.log('hasDateTimePassed: Missing date or time', { date, time });
      return false;
    }
    
    const dateTimeString = `${date}T${time}:00`;
    const dateTime = new Date(dateTimeString);
    const now = new Date();
    
    const isPassed = now > dateTime;
    
    console.log('=== DATE TIME CHECK ===');
    console.log('Date string:', dateTimeString);
    console.log('Parsed datetime:', dateTime.toString());
    console.log('Current time:', now.toString());
    console.log('Is passed?', isPassed);
    console.log('Time difference (ms):', now.getTime() - dateTime.getTime());
    
    return isPassed;
  };

  useEffect(() => {
    setMeetingConfirmed(false);
    setVisitConfirmed(false);
    setShowMeetingConfirmation(false);
    setShowVisitConfirmation(false);
  }, [selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead) return;
    
    console.log('=== CONFIRMATION CHECK ===');
    console.log('isEditingMode:', isEditingMode);
    
    // MEETING CHECK - ✅ FIXED: Changed FormData to formData (lowercase)
    const meetingDate = formData.meetingDate || selectedLead.meetingDate;
    const meetingTime = formData.meetingTime || selectedLead.meetingTime;
    
    console.log('Meeting Date:', meetingDate, 'Meeting Time:', meetingTime);
    
    const hasMeetingPassed = hasDateTimePassed(meetingDate, meetingTime);
    const meetingAlreadyConfirmed = selectedLead.meeting_confirmed === 'Yes';
    
    console.log('hasMeetingPassed:', hasMeetingPassed, 'meetingAlreadyConfirmed:', meetingAlreadyConfirmed, 'showMeetingConfirmation:', showMeetingConfirmation);
    
    if (hasMeetingPassed && !meetingAlreadyConfirmed && !isEditingMode) {
      console.log('✓ SHOWING MEETING CONFIRMATION');
      setShowMeetingConfirmation(true);
    } else if (!hasMeetingPassed || meetingAlreadyConfirmed || isEditingMode) {
      setShowMeetingConfirmation(false);
    }
    
    // VISIT CHECK - ✅ FIXED: Changed FormData to formData (lowercase)
    const visitDate = formData.visitDate || selectedLead.visitDate;
    const visitTime = formData.visitTime || selectedLead.visitTime;
    
    console.log('Visit Date:', visitDate, 'Visit Time:', visitTime);
    
    const hasVisitPassed = hasDateTimePassed(visitDate, visitTime);
    const visitAlreadyConfirmed = selectedLead.visit_confirmed === 'Yes';
    
    console.log('hasVisitPassed:', hasVisitPassed, 'visitAlreadyConfirmed:', visitAlreadyConfirmed, 'showVisitConfirmation:', showVisitConfirmation);
    
    if (hasVisitPassed && !visitAlreadyConfirmed && !isEditingMode) {
      console.log('✓ SHOWING VISIT CONFIRMATION');
      setShowVisitConfirmation(true);
    } else if (!hasVisitPassed || visitAlreadyConfirmed || isEditingMode) {
      setShowVisitConfirmation(false);
    }
  }, [
    selectedLead?.id,
    selectedLead?.meetingDate,
    selectedLead?.meetingTime,
    selectedLead?.meeting_confirmed,
    selectedLead?.visitDate,
    selectedLead?.visitTime,
    selectedLead?.visit_confirmed,
    formData.meetingDate,  // ✅ FIXED: Changed FormData to formData
    formData.meetingTime,  // ✅ FIXED: Changed FormData to formData
    formData.visitDate,    // ✅ FIXED: Changed FormData to formData
    formData.visitTime,    // ✅ FIXED: Changed FormData to formData
    isEditingMode
  ]);

  const handleMeetingConfirmation = async (didHappen) => {
    if (didHappen) {
      try {
        const { error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({
            meeting_confirmed: 'Yes',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLead.id);

        if (error) throw error;

        setShowMeetingConfirmation(false);
        setMeetingConfirmed(true);
        
        if (onRefreshSingleLead) {
          await onRefreshSingleLead(selectedLead.id);
        }
        
        alert('Meeting confirmed successfully');
      } catch (error) {
        console.error('Error confirming meeting:', error);
        alert('Error confirming meeting: ' + error.message);
      }
    } else {
      try {
        const { error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({
            meet_datetime: null,
            meet_link: null,
            stage4_status: null,
            stage2_r1: null,
            stage2_r2: null,
            meeting_confirmed: 'No',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLead.id);

        if (error) throw error;

        try {
          await cancelReminders(selectedLead.id, 'meeting');
          console.log('Meeting reminders cancelled');
        } catch (reminderError) {
          console.error('Error cancelling meeting reminders:', reminderError);
        }

        setShowMeetingConfirmation(false);
        // Don't set meetingConfirmed to true when clicking No
        
        onFieldChange('meetingDate', '');
        onFieldChange('meetingTime', '');
        onFieldChange('meetingLink', '');
        
        if (onRefreshSingleLead) {
          await onRefreshSingleLead(selectedLead.id);
        }
        
        alert('Meeting details cleared successfully');
      } catch (error) {
        console.error('Error clearing meeting data:', error);
        alert('Error clearing meeting data: ' + error.message);
      }
    }
  };

  const handleVisitConfirmation = async (didHappen) => {
    if (didHappen) {
      try {
        const { error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({
            visit_confirmed: 'Yes',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLead.id);

        if (error) throw error;

        setShowVisitConfirmation(false);
        setVisitConfirmed(true);
        
        if (onRefreshSingleLead) {
          await onRefreshSingleLead(selectedLead.id);
        }
        
        alert('Visit confirmed successfully');
      } catch (error) {
        console.error('Error confirming visit:', error);
        alert('Error confirming visit: ' + error.message);
      }
    } else {
      try {
        const { error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({
            visit_datetime: null,
            visit_location: null,
            stage7_status: null,
            stage7_r1: null,
            stage7_r2: null,
            visit_confirmed: 'No',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLead.id);

        if (error) throw error;

        try {
          await cancelReminders(selectedLead.id, 'visit');
          console.log('Visit reminders cancelled');
        } catch (reminderError) {
          console.error('Error cancelling visit reminders:', reminderError);
        }

        setShowVisitConfirmation(false);
        // Don't set visitConfirmed to true when clicking No
        
        onFieldChange('visitDate', '');
        onFieldChange('visitTime', '');
        onFieldChange('visitLocation', '');
        
        if (onRefreshSingleLead) {
          await onRefreshSingleLead(selectedLead.id);
        }
        
        alert('Visit details cleared successfully');
      } catch (error) {
        console.error('Error clearing visit data:', error);
        alert('Error clearing visit data: ' + error.message);
      }
    }
  };

  function isBuiltInField(fieldName) {
    const builtInFields = [
      'Parents Name', 'Kids Name', 'Phone', 'Email', 'Location', 
      'Occupation', 'Current School', 'Offer', 'Notes', 'Meeting Date', 
      'Meeting Time', 'Meeting Link', 'Visit Date', 'Visit Time', 
      'Visit Location', 'Registration Fees', 'Enrolled', 'Parent Name',
      'Kid Name', 'Class', 'Grade', 'Source', 'Stage', 'Counsellor',
      'Secondary Phone', 'Second Phone'
    ];
    
    const normalizedFieldName = fieldName.toLowerCase().trim();
    const normalizedBuiltInFields = builtInFields.map(f => f.toLowerCase().trim());
    
    return normalizedBuiltInFields.includes(normalizedFieldName);
  }

  const formFields = settingsData?.form_fields || 
                    settingsData?.formFields || 
                    settingsData?.custom_fields || 
                    settingsData?.customFields || 
                    settingsData?.fields || 
                    [];

  const customFields = formFields?.filter(field => {
    const isCustomField = field.is_custom === true;
    return isCustomField && field.is_active;
  }) || [];

  const getConsistentFieldKey = (field) => {
    if (field.field_key) {
      return field.field_key;
    }
    
    if (field.is_custom && field.id) {
      return `custom_field_${field.id}`;
    }
    
    return field.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const migrateCustomFieldData = (customFields, currentCustomFieldsData) => {
    const migratedData = { ...currentCustomFieldsData };
    
    customFields.forEach(field => {
      const newKey = getConsistentFieldKey(field);
      const oldKey = field.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      if (oldKey !== newKey && currentCustomFieldsData[oldKey] && !currentCustomFieldsData[newKey]) {
        migratedData[newKey] = currentCustomFieldsData[oldKey];
        delete migratedData[oldKey];
        
        console.log(`Migrated custom field data: ${oldKey} → ${newKey}`);
        
        if (onCustomFieldChange) {
          onCustomFieldChange(newKey, currentCustomFieldsData[oldKey]);
        }
      }
    });
    
    return migratedData;
  };

  useEffect(() => {
    if (customFields.length > 0 && Object.keys(customFieldsData).length > 0) {
      const migratedData = migrateCustomFieldData(customFields, customFieldsData);
      
      if (JSON.stringify(migratedData) !== JSON.stringify(customFieldsData)) {
        console.log('Custom field data migration completed');
      }
    }
  }, [customFields, customFieldsData]);

  const renderCustomFieldInput = (field) => {
    const fieldKey = getConsistentFieldKey(field);
    const fieldValue = customFieldsData[fieldKey] || '';

    if (!isEditingMode) {
      if (field.field_type === 'Dropdown' && field.dropdown_options) {
        return (
          <div className="lead-sidebar-field-value">
            {fieldValue || ''}
          </div>
        );
      } else {
        return (
          <div className="lead-sidebar-field-value">
            {fieldValue || ''}
          </div>
        );
      }
    } else {
      if (field.field_type === 'Dropdown' && field.dropdown_options) {
        return (
          <select
            value={fieldValue}
            onChange={(e) => onCustomFieldChange(fieldKey, e.target.value)}
            className="lead-sidebar-form-select"
          >
            <option value="">Select {field.name}</option>
            {field.dropdown_options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else if (field.field_type === 'Numeric') {
        return (
          <input 
            type="number" 
            value={fieldValue} 
            onChange={(e) => onCustomFieldChange(fieldKey, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            className="lead-sidebar-form-input"
          />
        );
      } else {
        return (
          <input 
            type="text" 
            value={fieldValue} 
            onChange={(e) => onCustomFieldChange(fieldKey, e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            className="lead-sidebar-form-input"
          />
        );
      }
    }
  };

  const formatPhoneForDisplay = (phoneNumber) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/^\+91/, '');
  };

  const handlePhoneChange = (fieldName, value) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 10);
    onFieldChange(fieldName, limitedDigits);
  };

  return (
    <div className="lead-sidebar-tab-content">
      {/* Parent Info Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Parent Info</h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Parent Name</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.parentsName === 'NA' || selectedLead?.parentsName === 'NULL' ? '' : (selectedLead?.parentsName || '')}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={formData.parentsName !== undefined ? formData.parentsName : (selectedLead?.parentsName === 'NA' || selectedLead?.parentsName === 'NULL' ? '' : (selectedLead?.parentsName || ''))} 
                  onChange={(e) => onFieldChange('parentsName', e.target.value)}
                  placeholder="Enter parent name"
                  className="lead-sidebar-form-input"
                />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Phone</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{selectedLead?.phone || ''}</div>
              ) : (
                <div className="input-group">
                  <span className="input-group-text" style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRight: 'none', padding: '8px 12px', fontSize: '14px' }}>+91</span>
                  <input type="text" value={formatPhoneForDisplay(formData.phone || selectedLead?.phone || '')} onChange={(e) => handlePhoneChange('phone', e.target.value)} placeholder="Enter 10-digit number" maxLength="10" className="lead-sidebar-form-input" style={{ borderLeft: 'none' }} />
                </div>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('secondPhone')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{selectedLead?.secondPhone || formData.secondPhone || ''}</div>
              ) : (
                <div className="input-group">
                  <span className="input-group-text" style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRight: 'none', padding: '8px 12px', fontSize: '14px' }}>+91</span>
                  <input type="text" value={formatPhoneForDisplay(formData.secondPhone || selectedLead?.secondPhone || '')} onChange={(e) => handlePhoneChange('secondPhone', e.target.value)} placeholder={`Enter 10-digit ${getFieldLabel('secondPhone').toLowerCase()} (optional)`} maxLength="10" className="lead-sidebar-form-input" style={{ borderLeft: 'none' }} />
                </div>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Email</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{formData.email || ''}</div>
              ) : (
                <input type="email" value={formData.email || ''} onChange={(e) => onFieldChange('email', e.target.value)} placeholder="Enter email" className="lead-sidebar-form-input" />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('occupation')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{(formData.occupation === 'NULL' || !formData.occupation) ? '' : formData.occupation}</div>
              ) : (
                <input type="text" value={formData.occupation || ''} onChange={(e) => onFieldChange('occupation', e.target.value)} placeholder={`Enter ${getFieldLabel('occupation').toLowerCase()}`} className="lead-sidebar-form-input" />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Source</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{selectedLead?.source || sources[0] || 'Instagram'}</div>
              ) : (
                <select value={formData.source || selectedLead?.source || sources[0] || 'Instagram'} onChange={(e) => onFieldChange('source', e.target.value)} className="lead-sidebar-form-select">
                  {sources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Child Info Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Child Info</h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Kid Name</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{selectedLead?.kidsName === 'NA' || selectedLead?.kidsName === 'NULL' ? '' : (selectedLead?.kidsName || '')}</div>
              ) : (
                <input type="text" value={formData.kidsName !== undefined ? formData.kidsName : (selectedLead?.kidsName === 'NA' || selectedLead?.kidsName === 'NULL' ? '' : (selectedLead?.kidsName || ''))} onChange={(e) => onFieldChange('kidsName', e.target.value)} placeholder="Enter kid name" className="lead-sidebar-form-input" />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Class</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{selectedLead?.grade || ''}</div>
              ) : (
                <select value={formData.grade || selectedLead?.grade || grades[0] || 'LKG'} onChange={(e) => onFieldChange('grade', e.target.value)} className="lead-sidebar-form-select">
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('location')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{formData.location || ''}</div>
              ) : (
                <input type="text" value={formData.location || ''} onChange={(e) => onFieldChange('location', e.target.value)} placeholder={`Enter ${getFieldLabel('location').toLowerCase()}`} className="lead-sidebar-form-input" />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('currentSchool')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">{(formData.currentSchool === 'NULL' || !formData.currentSchool) ? '' : formData.currentSchool}</div>
              ) : (
                <input type="text" value={formData.currentSchool || ''} onChange={(e) => onFieldChange('currentSchool', e.target.value)} placeholder={`Enter ${getFieldLabel('currentSchool').toLowerCase()}`} className="lead-sidebar-form-input" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Details Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Call Details</h6>
          </div>
          <div className="lead-sidebar-section-content" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {showMeetingConfirmation && (
              <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', minWidth: '180px', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#856404' }}>Did the call happen?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button onClick={() => handleMeetingConfirmation(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><CheckCircle size={14} /> Yes</button>
                  <button onClick={() => handleMeetingConfirmation(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><XCircle size={14} /> No</button>
                </div>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('meetingDate')}</label>
                {!isEditingMode ? (<div className="lead-sidebar-field-value">{formData.meetingDate || ''}</div>) : (<input type="date" value={formData.meetingDate || ''} onChange={(e) => onFieldChange('meetingDate', e.target.value)} className="lead-sidebar-form-input" />)}
              </div>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('meetingTime')}</label>
                {!isEditingMode ? (<div className="lead-sidebar-field-value">{formData.meetingTime || ''}</div>) : (<input type="time" value={formData.meetingTime || ''} onChange={(e) => onFieldChange('meetingTime', e.target.value)} className="lead-sidebar-form-input" />)}
              </div>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('meetingLink')}</label>
                {!isEditingMode ? (<div className="lead-sidebar-field-value">{(formData.meetingLink === 'NULL' || !formData.meetingLink) ? '' : (<a href={formData.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>{formData.meetingLink}</a>)}</div>) : (<input type="text" value={formData.meetingLink || ''} onChange={(e) => onFieldChange('meetingLink', e.target.value)} placeholder={`Enter ${getFieldLabel('meetingLink').toLowerCase()}`} className="lead-sidebar-form-input" />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Details Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Visit Details</h6>
          </div>
          <div className="lead-sidebar-section-content" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {showVisitConfirmation && (
              <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', minWidth: '180px', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#856404' }}>Did they visit the school?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button onClick={() => handleVisitConfirmation(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><CheckCircle size={14} /> Yes</button>
                  <button onClick={() => handleVisitConfirmation(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><XCircle size={14} /> No</button>
                </div>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('visitDate')}</label>
                {!isEditingMode ? (<div className="lead-sidebar-field-value">{formData.visitDate || ''}</div>) : (<input type="date" value={formData.visitDate || ''} onChange={(e) => onFieldChange('visitDate', e.target.value)} className="lead-sidebar-form-input" />)}
              </div>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('visitTime')}</label>
                {!isEditingMode ? (<div className="lead-sidebar-field-value">{formData.visitTime || ''}</div>) : (<input type="time" value={formData.visitTime || ''} onChange={(e) => onFieldChange('visitTime', e.target.value)} className="lead-sidebar-form-input" />)}
              </div>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('visitLocation')}</label>
                {!isEditingMode ? (<div className="lead-sidebar-field-value">{(formData.visitLocation === 'NULL' || !formData.visitLocation) ? '' : formData.visitLocation}</div>) : (<input type="text" value={formData.visitLocation || ''} onChange={(e) => onFieldChange('visitLocation', e.target.value)} placeholder={`Enter ${getFieldLabel('visitLocation').toLowerCase()}`} className="lead-sidebar-form-input" />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admission Details Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Admission Details</h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('registrationFees')}</label>
              {!isEditingMode ? (<div className={`lead-sidebar-status-badge ${formData.registrationFees === 'Paid' ? 'paid' : 'unpaid'}`}>{(formData.registrationFees === 'NULL' || !formData.registrationFees) ? 'Not Paid' : formData.registrationFees}</div>) : (<select value={formData.registrationFees || 'Not Paid'} onChange={(e) => onFieldChange('registrationFees', e.target.value)} className="lead-sidebar-form-select"><option value="Not Paid">Not Paid</option><option value="Paid">Paid</option></select>)}
            </div>
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('enrolled')}</label>
              {!isEditingMode ? (<div className={`lead-sidebar-status-badge ${formData.enrolled === 'Yes' ? 'paid' : 'unpaid'}`}>{(formData.enrolled === 'NULL' || !formData.enrolled) ? 'No' : formData.enrolled}</div>) : (<select value={formData.enrolled || 'No'} onChange={(e) => onFieldChange('enrolled', e.target.value)} className="lead-sidebar-form-select"><option value="No">No</option><option value="Yes">Yes</option></select>)}
            </div>
          </div>
        </div>
      </div>

      {/* Counsellor Details Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Counsellor Details</h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('counsellor')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {formData.counsellor || selectedLead?.counsellor || 'Not Assigned'}
                </div>
              ) : (
                <select 
                  value={formData.counsellor || ''} 
                  onChange={(e) => onFieldChange('counsellor', e.target.value)} 
                  className="lead-sidebar-form-select"
                  disabled={!canReassign}
                >
                  <option value="">Select your {getFieldLabel('counsellor')}</option>
                  {settingsData?.counsellors?.map(counsellor => (
                    <option key={counsellor.id} value={counsellor.name}>
                      {counsellor.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes/Description Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">Notes / Description</h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Notes</label>
              {!isEditingMode ? (<div className="lead-sidebar-field-value" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>{formData.notes || 'No notes available'}</div>) : (<textarea value={formData.notes || ''} onChange={(e) => onFieldChange('notes', e.target.value)} placeholder="Enter notes or description about this lead..." className="lead-sidebar-form-input" rows={5} style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'inherit', padding: '8px' }} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields Section */}
      {customFields.length > 0 ? (
        <div className="lead-sidebar-section">
          <div className="lead-sidebar-section-layout">
            <div className="lead-sidebar-section-title-container">
              <h6 className="lead-sidebar-section-title">Other Fields</h6>
            </div>
            <div className="lead-sidebar-section-content">
              {customFields.map((field) => {
                const fieldKey = getConsistentFieldKey(field);
                return (
                  <div key={field.id || field.name} className="lead-sidebar-form-row">
                    <label className="lead-sidebar-form-label">{field.name}{field.mandatory && <span style={{ color: 'red' }}> *</span>}</label>
                    {renderCustomFieldInput(field)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="lead-sidebar-section">
          <div className="lead-sidebar-section-layout">
            <div className="lead-sidebar-section-title-container">
              <h6 className="lead-sidebar-section-title">Other Fields</h6>
            </div>
            <div className="lead-sidebar-section-content">
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No additional fields configured.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTab;
