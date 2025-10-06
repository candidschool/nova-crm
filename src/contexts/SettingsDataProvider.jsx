import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';

// Create the context
const SettingsDataContext = createContext();

// Custom hook to use the context
const useSettingsData = () => {
  const context = useContext(SettingsDataContext);
  if (!context) {
    throw new Error('useSettingsData must be used within a SettingsDataProvider');
  }
  return context;
};

// Provider component
const SettingsDataProvider = ({ children }) => {
  const [settingsData, setSettingsData] = useState({
    stages: [],
    counsellors: [],
    sources: [],
    grades: [],
    formFields: []
  });

  // ← UPDATED: Added secondPhone to field labels
  const [fieldLabels, setFieldLabels] = useState({
    // Static fields (never change their labels)
    parentsName: 'Parents Name',
    kidsName: 'Kids Name',
    phone: 'Phone',
    email: 'Email',
    grade: 'Grade',
    counsellor: 'Counsellor',
    stage: 'Stage',
    source: 'Source',
    
    // Dynamic fields (labels can change based on settings)
    secondPhone: 'Second Phone', // ← NEW: Added secondPhone
    offer: 'Offer',
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
    enrolled: 'Enrolled',
    notes: 'Notes'
  });

  // Store field mappings from database
  const [fieldMappings, setFieldMappings] = useState({});
  
  // Store stage mappings from database
  const [stageMappings, setStageMappings] = useState({});
  const [stageKeyToDataMapping, setStageKeyToDataMapping] = useState({});
  
  const [loading, setLoading] = useState(true);

  // Direct mapping function for form fields
  const getInternalFieldNameFromMapping = (dbFieldName) => {
    console.log('=== DIRECT FIELD MAPPING LOOKUP ===');
    console.log(`Looking up field: "${dbFieldName}"`);
    console.log('Available field mappings:', fieldMappings);
    
    const internalFieldName = fieldMappings[dbFieldName];
    console.log(`Direct field mapping result: "${dbFieldName}" → "${internalFieldName}"`);
    
    return internalFieldName || null;
  };

  // Direct mapping function for stages
  const getStageKeyFromName = (stageName) => {
    console.log('=== DIRECT STAGE MAPPING LOOKUP ===');
    console.log(`Looking up stage: "${stageName}"`);
    console.log('Available stage mappings:', stageMappings);
    
    const stageKey = stageMappings[stageName];
    console.log(`Direct stage mapping result: "${stageName}" → "${stageKey}"`);
    
    return stageKey || null;
  };

  // Function to fetch all settings data
  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAllSettings();
      
      console.log('=== SETTINGS DATA FETCH ===');
      console.log('Raw settings data:', data);
      
      // Extract and sort data
      const stages = data.stages
        ?.filter(stage => stage.is_active)
        ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
      
      // Handle counsellors with user_id
      const counsellors = data.counsellors
        ?.filter(counsellor => counsellor.is_active)
        ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        ?.map(counsellor => ({
          ...counsellor,
          hasUserAccount: !!counsellor.user_id // Flag for UI indication
        })) || [];
      
      const sources = data.sources
        ?.filter(source => source.is_active)
        ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
      
      const grades = data.grades
        ?.filter(grade => grade.is_active)
        ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
      
      const formFields = data.form_fields || [];
      
      console.log('Form fields from database:', formFields);
      console.log('Stages from database:', stages);
      console.log('Counsellors from database:', counsellors);
      
      // Create direct mappings for form fields
      const newFieldMappings = {};
      const updatedLabels = { ...fieldLabels };
      
      console.log('=== CREATING DIRECT FIELD MAPPINGS ===');
      formFields.forEach(field => {
        console.log(`Processing field: "${field.name}" with field_key: "${field.field_key}"`);
        
        if (field.field_key) {
          newFieldMappings[field.name] = field.field_key;
          
          if (!isStaticField(field.field_key)) {
            updatedLabels[field.field_key] = field.name;
            console.log(`✅ FIELD MAPPED: "${field.name}" → "${field.field_key}" (label updated)`);
          } else {
            console.log(`🔒 FIELD STATIC: "${field.name}" → "${field.field_key}" (label not updated)`);
          }
        } else {
          const sanitizedKey = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          newFieldMappings[field.name] = sanitizedKey;
          updatedLabels[sanitizedKey] = field.name;
          console.log(`🆕 FIELD CUSTOM: "${field.name}" → "${sanitizedKey}" (new custom field)`);
        }
      });

      // Create direct mappings for stages
      const newStageMappings = {};
      const newStageKeyToDataMapping = {};
      
      console.log('=== CREATING DIRECT STAGE MAPPINGS ===');
      stages.forEach(stage => {
        console.log(`Processing stage: "${stage.name}" with stage_key: "${stage.stage_key}"`);
        
        if (stage.stage_key) {
          // Name to key mapping
          newStageMappings[stage.name] = stage.stage_key;
          // Key to full data mapping
          newStageKeyToDataMapping[stage.stage_key] = stage;
          console.log(`✅ STAGE MAPPED: "${stage.name}" → "${stage.stage_key}"`);
        } else {
          // For stages without stage_key, create a mapping based on sanitized name
          const sanitizedKey = stage.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          newStageMappings[stage.name] = sanitizedKey;
          newStageKeyToDataMapping[sanitizedKey] = stage;
          console.log(`🆕 STAGE LEGACY: "${stage.name}" → "${sanitizedKey}" (no stage_key)`);
        }
      });
      
      console.log('Final field mappings:', newFieldMappings);
      console.log('Final field labels:', updatedLabels);
      console.log('Final stage mappings:', newStageMappings);
      console.log('Final stage key to data mapping:', newStageKeyToDataMapping);
      
      // Set all state
      setSettingsData({
        stages,
        counsellors, // Now includes hasUserAccount flag
        sources,
        grades,
        formFields
      });
      
      setFieldMappings(newFieldMappings);
      setFieldLabels(updatedLabels);
      setStageMappings(newStageMappings);
      setStageKeyToDataMapping(newStageKeyToDataMapping);
      
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ← UPDATED: Check if field is static (label never changes) - added secondPhone exception
  const isStaticField = (fieldKey) => {
    const staticFields = ['parentsName', 'kidsName', 'phone', 'email', 'grade', 'counsellor', 'stage', 'source'];
    return staticFields.includes(fieldKey);
  };

  // Function to get field label
  const getFieldLabel = (fieldKey) => {
    return fieldLabels[fieldKey] || fieldKey;
  };

  // Function to get field key from display name (reverse lookup)
  const getFieldKey = (displayName) => {
    return fieldMappings[displayName] || displayName;
  };

  // Function to get stage info - uses stage_key
  const getStageInfo = (stageIdentifier) => {
    // First try to find by stage_key
    const stageByKey = stageKeyToDataMapping[stageIdentifier];
    if (stageByKey) {
      return stageByKey;
    }
    
    // Fallback: find by name (for backwards compatibility)
    return settingsData.stages.find(stage => stage.name === stageIdentifier);
  };

  // Function to get stage color - uses stage_key
  const getStageColor = (stageIdentifier) => {
    const stage = getStageInfo(stageIdentifier);
    return stage?.color || '#B3D7FF';
  };

  // Function to get stage score - uses stage_key
  const getStageScore = (stageIdentifier) => {
    const stage = getStageInfo(stageIdentifier);
    return stage?.score || 10;
  };

  // Function to get stage category - uses stage_key
  const getStageCategory = (stageIdentifier) => {
    const stage = getStageInfo(stageIdentifier);
    return stage?.status || 'New';
  };

  // Function to get stage name from stage_key
  const getStageNameFromKey = (stageKey) => {
    const stage = stageKeyToDataMapping[stageKey];
    return stage?.name || stageKey;
  };

  // Helper functions for counsellors
  const getCounsellorById = (counsellorId) => {
    return settingsData.counsellors.find(counsellor => counsellor.id === counsellorId);
  };

  const getCounsellorsByUserAccount = (hasUserAccount = true) => {
    return settingsData.counsellors.filter(counsellor => 
      hasUserAccount ? counsellor.hasUserAccount : !counsellor.hasUserAccount
    );
  };

  // Function to refresh settings data
  const refreshSettingsData = () => {
    fetchSettingsData();
  };

  // Load settings data on mount
  useEffect(() => {
    fetchSettingsData();
  }, []);

  const value = {
    // Data
    settingsData,
    fieldLabels,
    fieldMappings,
    stageMappings,
    stageKeyToDataMapping,
    loading,
    
    // Helper functions for fields
    getFieldLabel,
    getFieldKey,
    getInternalFieldNameFromMapping,
    
    // Helper functions for stages
    getStageInfo,
    getStageColor,
    getStageScore,
    getStageCategory,
    getStageKeyFromName,
    getStageNameFromKey,
    
    // Helper functions for counsellors
    getCounsellorById,
    getCounsellorsByUserAccount,
    
    // General functions
    refreshSettingsData,
    isStaticField
  };

  return (
    <SettingsDataContext.Provider value={value}>
      {children}
    </SettingsDataContext.Provider>
  );
};

export default SettingsDataProvider;
export { useSettingsData };