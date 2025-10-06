import React, { useState, useEffect, useRef } from 'react';

const Stage1ActionButton = ({ 
  leadData,
  onComplete,
  getFieldLabel // ← NEW: Field_key aware label function (optional for this component)
}) => {
  console.log('🔵 Stage1ActionButton component rendered!');
  console.log('🔵 leadData received:', leadData);
  console.log('🔵 leadData type:', typeof leadData);
  console.log('🔵 leadData keys:', leadData ? Object.keys(leadData) : 'N/A');
  
  const [isLoading, setIsLoading] = useState(false);
  const hasCalledApi = useRef(false); // Add this to track if API was already called

  // ← UPDATED: Enhanced validation function with better field_key support
  const validateParameters = () => {
    const missingParams = [];
    
    // Define field labels - use getFieldLabel if available, otherwise fallback to defaults
    const getLabel = (fieldKey) => {
      if (getFieldLabel && typeof getFieldLabel === 'function') {
        return getFieldLabel(fieldKey);
      }
      // Fallback labels
      const fallbackLabels = {
        'phone': 'Phone',
        'parentsName': 'Parent Name',
        'kidsName': 'Student Name',
        'grade': 'Grade'
      };
      return fallbackLabels[fieldKey] || fieldKey;
    };
    
    // Validate required fields
    if (!leadData?.phone || leadData.phone.trim() === '') {
      missingParams.push(getLabel('phone'));
    }
    if (!leadData?.parentsName || leadData.parentsName.trim() === '') {
      missingParams.push(getLabel('parentsName'));
    }
    if (!leadData?.kidsName || leadData.kidsName.trim() === '') {
      missingParams.push(getLabel('kidsName'));
    }
    if (!leadData?.grade || leadData.grade.trim() === '') {
      missingParams.push(getLabel('grade'));
    }
    
    console.log('🔍 Validation check:', {
      phone: leadData?.phone,
      parentsName: leadData?.parentsName,
      kidsName: leadData?.kidsName,
      grade: leadData?.grade,
      missingParams
    });
    
    return missingParams;
  };

  const handleApiCall = async () => {
    // Prevent duplicate calls
    if (hasCalledApi.current) {
      console.log('🟡 API call already made, skipping...');
      return;
    }

    console.log('🟡 handleApiCall started');
    console.log('🔍 Lead data validation:', leadData);

    // ← UPDATED: Enhanced validation check with better error reporting
    const missingParams = validateParameters();
    if (missingParams.length > 0) {
      console.log('🔴 Missing required parameters:', missingParams);
      if (onComplete) {
        onComplete(false, `Missing required information: ${missingParams.join(', ')}`);
      }
      return;
    }
    
    hasCalledApi.current = true; // Mark as called
    setIsLoading(true);
    
    try {
      console.log('🟡 Making API call with data:', {
        phone: leadData.phone,
        parentsName: leadData.parentsName,
        kidsName: leadData.kidsName,
        grade: leadData.grade
      });

      // ← API call for new lead (Stage 1) - unchanged, working correctly
      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2Q0MyIsIm5hbWUiOiJOb3ZhIEludGVybmF0aW9uYWwgU2Nob29sIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2QzZCIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTQ1Njg4NjR9.-nntqrB_61dj0Pw66AEL_YwN6VvljWf5CtPf2fiALMw',
          campaignName: 'welcome',
          destination: leadData.phone,
          userName: leadData.parentsName,
          templateParams: [leadData.parentsName, leadData.kidsName, leadData.grade]
        })
      });

      console.log('🟡 API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔴 API response error:', errorText);
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('🟢 Stage 1 API Response:', result);

      // Notify parent component that API call completed
      if (onComplete) {
        onComplete(true);
      }

    } catch (error) {
      console.error('🔴 Error in Stage 1 API call:', error);
      
      // Still notify completion (don't fail the lead creation due to API error)
      if (onComplete) {
        onComplete(false, error.message);
      }
    } finally {
      setIsLoading(false);
      console.log('🟡 handleApiCall finished');
    }
  };

  // ← UPDATED: Enhanced useEffect with better debugging
  useEffect(() => {
    console.log('🔵 useEffect triggered!');
    console.log('🔍 useEffect conditions:', {
      leadDataExists: !!leadData,
      leadDataValue: leadData,
      hasCalledApi: hasCalledApi.current,
      shouldCall: leadData && !hasCalledApi.current
    });
    
    if (leadData && !hasCalledApi.current) {
      console.log('🔵 leadData exists and API not called yet, calling handleApiCall');
      console.log('🔵 Full leadData object:', JSON.stringify(leadData, null, 2));
      
      // Add a small delay to ensure all state is properly set
      setTimeout(() => {
        console.log('🔵 About to call handleApiCall after timeout');
        handleApiCall();
      }, 100);
    } else {
      console.log('🔴 Conditions not met for API call:', {
        noLeadData: !leadData,
        alreadyCalled: hasCalledApi.current,
        leadDataType: typeof leadData,
        leadDataKeys: leadData ? Object.keys(leadData) : 'N/A'
      });
    }
  }, [leadData]);

  // ← NEW: Debug logging for component lifecycle
  useEffect(() => {
    console.log('🔵 Stage1ActionButton mounted');
    return () => {
      console.log('🔵 Stage1ActionButton unmounted');
    };
  }, []);

  console.log('🔵 Stage1ActionButton returning (invisible)');
  // Return nothing (invisible component)
  return null;
};

export default Stage1ActionButton;