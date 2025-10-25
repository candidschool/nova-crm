import React, { createContext, useContext, useState, useCallback } from 'react';
import { TABLE_NAMES } from '../config/tableNames';

// Create the context
const LeadStateContext = createContext();

// Custom hook to use the lead state
const useLeadState = () => {
  const context = useContext(LeadStateContext);
  if (!context) {
    throw new Error('useLeadState must be used within a LeadStateProvider');
  }
  return context;
};

// Permission helper functions
const canViewAllLeads = (userRole) => {
  return userRole === 'admin' || userRole === 'jr_counselor';
};

const canEditLead = (userRole, lead, userName) => {
  if (userRole === 'admin') return true;
  if (userRole === 'user') return lead.counsellor === userName; // Counselor - only own leads
  if (userRole === 'jr_counselor') return false; // Read-only
  if (userRole === 'outsider') return false; // Read-only
  return false;
};

const canDeleteLeads = (userRole) => {
  return userRole === 'admin'; // Only admin can delete
};

const canAddLeads = (userRole) => {
  return true; // All roles can add leads
};

const canReassignLeads = (userRole, lead, userName) => {
  if (userRole === 'admin') return true; // Admin can reassign any lead
  if (userRole === 'user') return lead.counsellor === userName; // Counselor can reassign own leads
  return false; // Jr. Counselor and Outsider cannot reassign
};

// LeadStateProvider component
const LeadStateProvider = ({ children, user }) => {
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadsData, setLeadsDataInternal] = useState([]);
  const [allLeadsData, setAllLeadsData] = useState([]);

  // Role-based filtering function
  const applyRoleBasedFilter = useCallback((leads) => {
    if (!user) {
      console.log('No user provided, returning empty array');
      return [];
    }

    console.log('=== ROLE-BASED FILTERING ===');
    console.log('User:', user);
    console.log('User role:', user.role);
    console.log('Total leads before filtering:', leads.length);

    // Admin and Jr. Counselor see all leads
    if (canViewAllLeads(user.role)) {
      console.log(`${user.role} user - showing all leads`);
      return leads;
    }

    // Counselor (user) and Outsider see only their assigned leads
    const filteredLeads = leads.filter(lead => {
      const isAssigned = lead.counsellor === user.full_name;
      if (!isAssigned) {
        console.log(`Filtering out lead ${lead.id} - assigned to ${lead.counsellor}, user is ${user.full_name}`);
      }
      return isAssigned;
    });

    console.log(`${user.role} user - filtered to ${filteredLeads.length} leads assigned to ${user.full_name}`);
    return filteredLeads;
  }, [user]);

  // Wrapper for setLeadsData that applies role-based filtering
  const setLeadsData = useCallback((leads) => {
    console.log('setLeadsData called with:', leads.length, 'leads');
    
    // Store all leads (unfiltered) for admin operations
    setAllLeadsData(leads);
    
    // Apply role-based filtering and set filtered data
    const filteredLeads = applyRoleBasedFilter(leads);
    setLeadsDataInternal(filteredLeads);
    
    console.log('Final filtered leads count:', filteredLeads.length);
  }, [applyRoleBasedFilter]);

  // Update a specific lead in the leadsData array
  const updateLeadInList = useCallback((leadId, updatedFields) => {
    // Update in both filtered and unfiltered data
    setAllLeadsData(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updatedFields }
          : lead
      )
    );

    setLeadsDataInternal(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, ...updatedFields }
          : lead
      )
    );
  }, []);

  // Update the selected lead
  const updateSelectedLead = useCallback((updatedFields) => {
    setSelectedLead(prevLead => 
      prevLead ? { ...prevLead, ...updatedFields } : null
    );
  }, []);

  // Update both selected lead and the lead in the list
  const updateLead = useCallback((leadId, updatedFields) => {
    // Update in the leads list
    updateLeadInList(leadId, updatedFields);
    
    // Update selected lead if it matches
    if (selectedLead && selectedLead.id === leadId) {
      updateSelectedLead(updatedFields);
    }
  }, [selectedLead, updateLeadInList, updateSelectedLead]);

  // Handle action status updates with field_key awareness
  const updateActionStatus = useCallback((leadId, stageField, newStatus) => {
    const updateFields = { [stageField]: newStatus };
    updateLead(leadId, updateFields);
  }, [updateLead]);

  // Handle complete lead updates with field_key and stage_key support
  const updateCompleteLeadData = useCallback((leadId, formData, getScoreFromStage, getCategoryFromStage, getStageKeyFromName, getStageDisplayName) => {
    // Format phone number properly
    let formattedPhone = formData.phone;
    if (formattedPhone && !formattedPhone.startsWith('+91')) {
      formattedPhone = formattedPhone.replace(/^\+91/, '');
      formattedPhone = `+91${formattedPhone}`;
    }

    // Format secondary phone number properly
    let formattedSecondPhone = formData.secondPhone;
    if (formattedSecondPhone && !formattedSecondPhone.startsWith('+91')) {
      formattedSecondPhone = formattedSecondPhone.replace(/^\+91/, '');
      formattedSecondPhone = `+91${formattedSecondPhone}`;
    }

    // Handle stage_key conversion
    let stageKey = formData.stage;
    let stageDisplayName = formData.stage;

    if (getStageKeyFromName && getStageDisplayName) {
      const convertedStageKey = getStageKeyFromName(formData.stage);
      if (convertedStageKey) {
        stageKey = convertedStageKey;
        stageDisplayName = getStageDisplayName(stageKey);
      } else {
        stageDisplayName = getStageDisplayName(formData.stage);
      }
    }

    // Complete field mapping
    const updatedFields = {
      parentsName: formData.parentsName,
      kidsName: formData.kidsName, 
      phone: formattedPhone,
      secondPhone: formattedSecondPhone,
      email: formData.email,
      grade: formData.grade,
      source: formData.source,
      counsellor: formData.counsellor,
      stage: stageKey,
      stageDisplayName: stageDisplayName,
      occupation: formData.occupation,
      location: formData.location,
      currentSchool: formData.currentSchool,
      offer: formData.offer,
      meetingDate: formData.meetingDate,
      meetingTime: formData.meetingTime,
      meetingLink: formData.meetingLink,
      visitDate: formData.visitDate,
      visitTime: formData.visitTime,
      visitLocation: formData.visitLocation,
      registrationFees: formData.registrationFees,
      enrolled: formData.enrolled,
      notes: formData.notes,
      score: getScoreFromStage ? getScoreFromStage(stageKey) : 20,
      category: getCategoryFromStage ? getCategoryFromStage(stageKey) : 'New'
    };

    console.log('=== LEAD STATE UPDATE ===');
    console.log('Lead ID:', leadId);
    console.log('Updated Fields:', updatedFields);

    updateLead(leadId, updatedFields);
  }, [updateLead]);

  // Handle field value updates with field_key awareness
  const updateLeadField = useCallback((leadId, fieldKey, fieldValue, fieldLabel) => {
    console.log('=== FIELD UPDATE ===');
    console.log(`Updating field ${fieldKey} (${fieldLabel}) to:`, fieldValue);
    
    const updateFields = { [fieldKey]: fieldValue };
    updateLead(leadId, updateFields);
  }, [updateLead]);

  // Handle stage updates with stage_key support
  const updateLeadStage = useCallback((leadId, stageKey, getScoreFromStage, getCategoryFromStage, getStageDisplayName) => {
    console.log('=== STAGE UPDATE ===');
    console.log(`Updating lead ${leadId} stage to:`, stageKey);
    
    const stageDisplayName = getStageDisplayName ? getStageDisplayName(stageKey) : stageKey;
    const score = getScoreFromStage ? getScoreFromStage(stageKey) : 20;
    const category = getCategoryFromStage ? getCategoryFromStage(stageKey) : 'New';

    const updateFields = {
      stage: stageKey,
      stageDisplayName: stageDisplayName,
      score: score,
      category: category
    };

    console.log('Stage update fields:', updateFields);
    updateLead(leadId, updateFields);
  }, [updateLead]);

  // Batch update multiple fields with field_key support
  const updateLeadFields = useCallback((leadId, fieldsObject, fieldMappings) => {
    console.log('=== BATCH FIELD UPDATE ===');
    console.log('Lead ID:', leadId);
    console.log('Fields Object:', fieldsObject);

    const updateFields = {};
    
    Object.entries(fieldsObject).forEach(([key, value]) => {
      if (fieldMappings && fieldMappings[key]) {
        const fieldKey = fieldMappings[key];
        updateFields[fieldKey] = value;
      } else {
        updateFields[key] = value;
      }
    });

    console.log('Final update fields:', updateFields);
    updateLead(leadId, updateFields);
  }, [updateLead]);

  const value = {
    // State
    selectedLead,
    leadsData, // Filtered data based on user role
    allLeadsData, // Unfiltered data (for admin operations)
    user, // User object with role
    
    // Setters
    setSelectedLead,
    setLeadsData, // Applies role-based filtering automatically
    
    // Update functions
    updateLead,
    updateActionStatus,
    updateCompleteLeadData,
    updateSelectedLead,
    updateLeadInList,
    updateLeadField,
    updateLeadStage,
    updateLeadFields,

    // Permission helper functions
    canViewAllLeads: () => canViewAllLeads(user?.role),
    canEditLead: (lead) => canEditLead(user?.role, lead, user?.full_name),
    canDeleteLeads: () => canDeleteLeads(user?.role),
    canAddLeads: () => canAddLeads(user?.role),
    canReassignLeads: (lead) => canReassignLeads(user?.role, lead, user?.full_name)
  };

  return (
    <LeadStateContext.Provider value={value}>
      {children}
    </LeadStateContext.Provider>
  );
};

export default LeadStateProvider;
export { useLeadState, canViewAllLeads, canEditLead, canDeleteLeads, canAddLeads, canReassignLeads };
