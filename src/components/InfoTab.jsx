import React, { useEffect, useState } from 'react';
import { settingsService } from '../services/settingsService';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { CheckCircle, XCircle } from 'lucide-react';
import { cancelReminders } from '../utils/api';

const InfoTab = ({
  selectedLead,
  isEditingMode,
  sidebarFormData,
  onFieldChange,
  settingsData,
  getFieldLabel,
  customFieldsData = {},
  onCustomFieldChange,
  onRefreshLead,
  onRefreshSingleLead
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
      return false;
    }
    
    const dateTimeString = `${date}T${time}:00`;
    const dateTime = new Date(dateTimeString);
    const now = new Date();
    
    return now > dateTime;
  };

  useEffect(() => {
    setMeetingConfirmed(false);
    setVisitConfirmed(false);
    setShowMeetingConfirmation(false);
    setShowVisitConfirmation(false);
  }, [selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead || isEditingMode) return;
    
    console.log('=== CONFIRMATION CHECK (Once per lead) ===');
    console.log('Selected Lead ID:', selectedLead.id);
    console.log('Meeting Confirmed:', meetingConfirmed);
    console.log('Visit Confirmed:', visitConfirmed);
    
    const meetingDate = sidebarFormData.meetingDate || selectedLead.meetingDate;
    const meetingTime = sidebarFormData.meetingTime || selectedLead.meetingTime;
    
    const hasMeetingPassed = hasDateTimePassed(meetingDate, meetingTime);
    
    console.log('Meeting Date:', meetingDate);
    console.log('Meeting Time:', meetingTime);
    console.log('Has meeting passed?', hasMeetingPassed);
    
    if (hasMeetingPassed && !meetingConfirmed && !showMeetingConfirmation) {
      console.log('Showing meeting confirmation');
      setShowMeetingConfirmation(true);
    }
    
    const visitDate = sidebarFormData.visitDate || selectedLead.visitDate;
    const visitTime = sidebarFormData.visitTime || selectedLead.visitTime;
    
    const hasVisitPassed = hasDateTimePassed(visitDate, visitTime);
    
    console.log('Visit Date:', visitDate);
    console.log('Visit Time:', visitTime);
    console.log('Has visit passed?', hasVisitPassed);
    
    if (hasVisitPassed && !visitConfirmed && !showVisitConfirmation) {
      console.log('Showing visit confirmation');
      setShowVisitConfirmation(true);
    }
  }, [selectedLead?.id]);

  const handleMeetingConfirmation = async (didHappen) => {
    if (didHappen) {
      setShowMeetingConfirmation(false);
      setMeetingConfirmed(true);
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
        setMeetingConfirmed(true);
        
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
      setShowVisitConfirmation(false);
      setVisitConfirmed(true);
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
        setVisitConfirmed(true);
        
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
            <h6 className="lead-sidebar-section-title">
              Parent Info
            </h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Parent Name</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.parentsName || ''}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={sidebarFormData.parentsName || selectedLead?.parentsName || ''} 
                  onChange={(e) => onFieldChange('parentsName', e.target.value)}
                  placeholder="Enter parent name"
                  className="lead-sidebar-form-input"
                />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Phone</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.phone || ''}
                </div>
              ) : (
                <div className="input-group">
                  <span className="input-group-text" style={{ 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6',
                    borderRight: 'none',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}>
                    +91
                  </span>
                  <input 
                    type="text" 
                    value={formatPhoneForDisplay(sidebarFormData.phone || selectedLead?.phone || '')} 
                    onChange={(e) => handlePhoneChange('phone', e.target.value)}
                    placeholder="Enter 10-digit number"
                    maxLength="10"
                    className="lead-sidebar-form-input"
                    style={{ borderLeft: 'none' }}
                  />
                </div>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('secondPhone')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.secondPhone || sidebarFormData.secondPhone || ''}
                </div>
              ) : (
                <div className="input-group">
                  <span className="input-group-text" style={{ 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6',
                    borderRight: 'none',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}>
                    +91
                  </span>
                  <input 
                    type="text" 
                    value={formatPhoneForDisplay(sidebarFormData.secondPhone || selectedLead?.secondPhone || '')} 
                    onChange={(e) => handlePhoneChange('secondPhone', e.target.value)}
                    placeholder={`Enter 10-digit ${getFieldLabel('secondPhone').toLowerCase()} (optional)`}
                    maxLength="10"
                    className="lead-sidebar-form-input"
                    style={{ borderLeft: 'none' }}
                  />
                </div>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Email</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {sidebarFormData.email || ''}
                </div>
              ) : (
                <input 
                  type="email" 
                  value={sidebarFormData.email || ''} 
                  onChange={(e) => onFieldChange('email', e.target.value)}
                  placeholder="Enter email"
                  className="lead-sidebar-form-input"
                />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('occupation')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {(sidebarFormData.occupation === 'NULL' || !sidebarFormData.occupation) ? '' : sidebarFormData.occupation}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={sidebarFormData.occupation || ''} 
                  onChange={(e) => onFieldChange('occupation', e.target.value)}
                  placeholder={`Enter ${getFieldLabel('occupation').toLowerCase()}`}
                  className="lead-sidebar-form-input"
                />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Source</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.source || sources[0] || 'Instagram'}
                </div>
              ) : (
                <select
                  value={sidebarFormData.source || selectedLead?.source || sources[0] || 'Instagram'}
                  onChange={(e) => onFieldChange('source', e.target.value)}
                  className="lead-sidebar-form-select"
                >
                  {sources.map(source => (
                    <option key={source} value={source}>
                      {source}
                    </option>
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
            <h6 className="lead-sidebar-section-title">
              Child Info
            </h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Kid Name</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.kidsName || ''}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={sidebarFormData.kidsName || selectedLead?.kidsName || ''} 
                  onChange={(e) => onFieldChange('kidsName', e.target.value)}
                  placeholder="Enter kid name"
                  className="lead-sidebar-form-input"
                />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Class</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {selectedLead?.grade || ''}
                </div>
              ) : (
                <select
                  value={sidebarFormData.grade || selectedLead?.grade || grades[0] || 'LKG'}
                  onChange={(e) => onFieldChange('grade', e.target.value)}
                  className="lead-sidebar-form-select"
                >
                  {grades.map(grade => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('location')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {sidebarFormData.location || ''}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={sidebarFormData.location || ''} 
                  onChange={(e) => onFieldChange('location', e.target.value)}
                  placeholder={`Enter ${getFieldLabel('location').toLowerCase()}`}
                  className="lead-sidebar-form-input"
                />
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('currentSchool')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {(sidebarFormData.currentSchool === 'NULL' || !sidebarFormData.currentSchool) ? '' : sidebarFormData.currentSchool}
                </div>
              ) : (
                <input 
                  type="text" 
                  value={sidebarFormData.currentSchool || ''}
                  onChange={(e) => onFieldChange('currentSchool', e.target.value)}
                  placeholder={`Enter ${getFieldLabel('currentSchool').toLowerCase()}`}
                  className="lead-sidebar-form-input"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Details Section with Confirmation */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">
              Call Details
            </h6>
          </div>
          <div className="lead-sidebar-section-content" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {showMeetingConfirmation && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '12px',
                minWidth: '180px',
                flexShrink: 0
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '10px',
                  color: '#856404'
                }}>
                  Did the call happen?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => handleMeetingConfirmation(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <CheckCircle size={14} /> Yes
                  </button>
                  <button
                    onClick={() => handleMeetingConfirmation(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <XCircle size={14} /> No
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('meetingDate')}</label>
                {!isEditingMode ? (
                  <div className="lead-sidebar-field-value">
                    {sidebarFormData.meetingDate || ''}
                  </div>
                ) : (
                  <input 
                    type="date" 
                    value={sidebarFormData.meetingDate || ''} 
                    onChange={(e) => onFieldChange('meetingDate', e.target.value)}
                    className="lead-sidebar-form-input"
                  />
                )}
              </div>

              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('meetingTime')}</label>
                {!isEditingMode ? (
                  <div className="lead-sidebar-field-value">
                    {sidebarFormData.meetingTime || ''}
                  </div>
                ) : (
                  <input 
                    type="time" 
                    value={sidebarFormData.meetingTime || ''} 
                    onChange={(e) => onFieldChange('meetingTime', e.target.value)}
                    className="lead-sidebar-form-input"
                  />
                )}
              </div>

              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('meetingLink')}</label>
                {!isEditingMode ? (
                  <div className="lead-sidebar-field-value">
                    {(sidebarFormData.meetingLink === 'NULL' || !sidebarFormData.meetingLink) ? '' : (
                      <a 
                        href={sidebarFormData.meetingLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#007bff', textDecoration: 'underline' }}
                      >
                        {sidebarFormData.meetingLink}
                      </a>
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={sidebarFormData.meetingLink || ''} 
                    onChange={(e) => onFieldChange('meetingLink', e.target.value)}
                    placeholder={`Enter ${getFieldLabel('meetingLink').toLowerCase()}`}
                    className="lead-sidebar-form-input"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Details Section with Confirmation */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">
              Visit Details
            </h6>
          </div>
          <div className="lead-sidebar-section-content" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {showVisitConfirmation && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '12px',
                minWidth: '180px',
                flexShrink: 0
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  marginBottom: '10px',
                  color: '#856404'
                }}>
                  Did they visit the school?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => handleVisitConfirmation(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <CheckCircle size={14} /> Yes
                  </button>
                  <button
                    onClick={() => handleVisitConfirmation(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    <XCircle size={14} /> No
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('visitDate')}</label>
                {!isEditingMode ? (
                  <div className="lead-sidebar-field-value">
                    {sidebarFormData.visitDate || ''}
                  </div>
                ) : (
                  <input 
                    type="date" 
                    value={sidebarFormData.visitDate || ''} 
                    onChange={(e) => onFieldChange('visitDate', e.target.value)}
                    className="lead-sidebar-form-input"
                  />
                )}
              </div>

              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('visitTime')}</label>
                {!isEditingMode ? (
                  <div className="lead-sidebar-field-value">
                    {sidebarFormData.visitTime || ''}
                  </div>
                ) : (
                  <input 
                    type="time" 
                    value={sidebarFormData.visitTime || ''} 
                    onChange={(e) => onFieldChange('visitTime', e.target.value)}
                    className="lead-sidebar-form-input"
                  />
                )}
              </div>

              <div className="lead-sidebar-form-row">
                <label className="lead-sidebar-form-label">{getFieldLabel('visitLocation')}</label>
                {!isEditingMode ? (
                  <div className="lead-sidebar-field-value">
                    {(sidebarFormData.visitLocation === 'NULL' || !sidebarFormData.visitLocation) ? '' : sidebarFormData.visitLocation}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={sidebarFormData.visitLocation || ''} 
                    onChange={(e) => onFieldChange('visitLocation', e.target.value)}
                    placeholder={`Enter ${getFieldLabel('visitLocation').toLowerCase()}`}
                    className="lead-sidebar-form-input"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admission Details Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">
              Admission Details
            </h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('registrationFees')}</label>
              {!isEditingMode ? (
                <div className={`lead-sidebar-status-badge ${sidebarFormData.registrationFees === 'Paid' ? 'paid' : 'unpaid'}`}>
                  {(sidebarFormData.registrationFees === 'NULL' || !sidebarFormData.registrationFees) ? 'Not Paid' : sidebarFormData.registrationFees}
                </div>
              ) : (
                <select
                  value={sidebarFormData.registrationFees || 'Not Paid'}
                  onChange={(e) => onFieldChange('registrationFees', e.target.value)}
                  className="lead-sidebar-form-select"
                >
                  <option value="Not Paid">Not Paid</option>
                  <option value="Paid">Paid</option>
                </select>
              )}
            </div>

            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('enrolled')}</label>
              {!isEditingMode ? (
                <div className={`lead-sidebar-status-badge ${sidebarFormData.enrolled === 'Yes' ? 'paid' : 'unpaid'}`}>
                  {(sidebarFormData.enrolled === 'NULL' || !sidebarFormData.enrolled) ? 'No' : sidebarFormData.enrolled}
                </div>
              ) : (
                <select
                  value={sidebarFormData.enrolled || 'No'}
                  onChange={(e) => onFieldChange('enrolled', e.target.value)}
                  className="lead-sidebar-form-select"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Counsellor Details Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">
              Counsellor Details
            </h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">{getFieldLabel('counsellor')}</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value">
                  {sidebarFormData.counsellor || selectedLead?.counsellor || 'Not Assigned'}
                </div>
              ) : (
                <select
                  value={sidebarFormData.counsellor || ''}
                  onChange={(e) => onFieldChange('counsellor', e.target.value)}
                  className="lead-sidebar-form-select"
                >
                  <option value="" disabled>Select Counsellor</option>
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

      {/* ✅ NEW: Notes/Description Section */}
      <div className="lead-sidebar-section">
        <div className="lead-sidebar-section-layout">
          <div className="lead-sidebar-section-title-container">
            <h6 className="lead-sidebar-section-title">
              Notes / Description
            </h6>
          </div>
          <div className="lead-sidebar-section-content">
            <div className="lead-sidebar-form-row">
              <label className="lead-sidebar-form-label">Notes</label>
              {!isEditingMode ? (
                <div className="lead-sidebar-field-value" style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '8px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  {sidebarFormData.notes || 'No notes available'}
                </div>
              ) : (
                <textarea
                  value={sidebarFormData.notes || ''}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  placeholder="Enter notes or description about this lead..."
                  className="lead-sidebar-form-input"
                  rows={5}
                  style={{
                    resize: 'vertical',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    padding: '8px'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields Section */}
      {customFields.length > 0 ? (
        <div className="lead-sidebar-section">
          <div className="lead-sidebar-section-layout">
            <div className="lead-sidebar-section-title-container">
              <h6 className="lead-sidebar-section-title">
                Other Fields 
              </h6>
            </div>
            <div className="lead-sidebar-section-content">
              {customFields.map((field) => {
                const fieldKey = getConsistentFieldKey(field);
                
                return (
                  <div key={field.id || field.name} className="lead-sidebar-form-row">
                    <label className="lead-sidebar-form-label">
                      {field.name}
                      {field.mandatory && <span style={{ color: 'red' }}> *</span>}
                    </label>
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
              <h6 className="lead-sidebar-section-title">
                Other Fields
              </h6>
            </div>
            <div className="lead-sidebar-section-content">
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No additional fields configured.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTab;