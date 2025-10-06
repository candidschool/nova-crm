import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSettingsData } from '../contexts/SettingsDataProvider'; // ← UPDATED: Import settings
import OverviewDashboard from './OverviewDashboard';
import LeftSidebar from './LeftSidebar';
import { Play, Loader2 } from 'lucide-react';
import { TABLE_NAMES } from '../config/tableNames';

const Dashboard = ({ onLogout, user }) => {
  // ← UPDATED: Use settings data context with stage_key support
  const { 
    settingsData, 
    getFieldLabel, // ← NEW: For dynamic field labels
    getStageInfo,
    getStageColor,
    getStageScore,
    getStageCategory,
    getStageKeyFromName, // ← NEW: Convert stage name to stage_key
    getStageNameFromKey, // ← NEW: Convert stage_key to stage name
    stageKeyToDataMapping, // ← NEW: Direct stage data mapping
    loading: settingsLoading 
  } = useSettingsData();

  const [leadsData, setLeadsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ← UPDATED: Get dynamic stages with stage_key support
  const stages = settingsData.stages.map(stage => ({
    value: stage.stage_key || stage.name, // ← Use stage_key if available
    label: stage.name, // ← Display name
    color: stage.color || '#B3D7FF',
    score: stage.score || 10,
    category: stage.status || 'New'
  }));

  // ← NEW: Helper functions for stage_key conversion
  const getStageKeyForLead = (stageValue) => {
    // If it's already a stage_key, return it
    if (stageKeyToDataMapping[stageValue]) {
      return stageValue;
    }
    // Otherwise, convert stage name to stage_key
    return getStageKeyFromName(stageValue) || stageValue;
  };

  const getStageDisplayName = (stageValue) => {
    // If it's a stage_key, get the display name
    if (stageKeyToDataMapping[stageValue]) {
      return getStageNameFromKey(stageValue);
    }
    // Otherwise, it's probably already a stage name
    return stageValue;
  };

  // ← UPDATED: Convert database record to UI format with stage_key support
  const convertDatabaseToUI = (dbRecord) => {
    // Parse datetime fields
    let meetingDate = '';
    let meetingTime = '';
    let visitDate = '';
    let visitTime = '';

    if (dbRecord.meet_datetime) {
      const meetDateTime = new Date(dbRecord.meet_datetime);
      meetingDate = meetDateTime.toISOString().split('T')[0];
      meetingTime = meetDateTime.toTimeString().slice(0, 5);
    }

    if (dbRecord.visit_datetime) {
      const visitDateTime = new Date(dbRecord.visit_datetime);
      visitDate = visitDateTime.toISOString().split('T')[0];
      visitTime = visitDateTime.toTimeString().slice(0, 5);
    }

    // ← NEW: Handle stage value - could be stage name or stage_key
    const stageValue = dbRecord.stage;
    const stageKey = getStageKeyForLead(stageValue);
    const displayName = getStageDisplayName(stageValue);

    return {
      id: dbRecord.id,
      parentsName: dbRecord.parents_name,
      kidsName: dbRecord.kids_name,
      phone: dbRecord.phone,
      location: dbRecord.location,
      grade: dbRecord.grade,
      stage: stageKey, // ← Store stage_key internally
      stageDisplayName: displayName, // ← Store display name for UI
      score: dbRecord.score,
      category: dbRecord.category,
      counsellor: dbRecord.counsellor,
      offer: dbRecord.offer,
      notes: dbRecord.notes,
      email: dbRecord.email || '',
      occupation: dbRecord.occupation || '',
      source: dbRecord.source || (settingsData?.sources?.[0]?.name || 'Instagram'), // ← UPDATED: Dynamic default source
      currentSchool: dbRecord.current_school || '',
      meetingDate: meetingDate,
      meetingTime: meetingTime,
      meetingLink: dbRecord.meet_link || '',
      visitDate: visitDate,
      visitTime: visitTime,
      visitLocation: dbRecord.visit_location || '',
      registrationFees: dbRecord.reg_fees || '',
      enrolled: dbRecord.enrolled || '',
      stage2_status: dbRecord.stage2_status || '',
      stage3_status: dbRecord.stage3_status || '',
      stage4_status: dbRecord.stage4_status || '',
      stage5_status: dbRecord.stage5_status || '',
      stage6_status: dbRecord.stage6_status || '',
      stage7_status: dbRecord.stage7_status || '',
      stage8_status: dbRecord.stage8_status || '',
      stage9_status: dbRecord.stage9_status || '',
      previousStage: dbRecord.previous_stage || '',
      createdTime: new Date(dbRecord.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).replace(',', '')
    };
  };

  // Fetch leads from Supabase
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      console.log('=== DASHBOARD DATA FETCH ===');
      console.log('Raw data from Supabase:', data);
      const convertedData = data.map(convertDatabaseToUI);
      console.log('Converted data with stage_key:', convertedData);
      setLeadsData(convertedData);
      
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads on component mount
  useEffect(() => {
    fetchLeads();
  }, []);

  // ← UPDATED: Calculate stage counts using stage_key
  const getStageCount = (stageName) => {
    console.log('=== STAGE COUNT CALCULATION ===');
    console.log('Looking for stage:', stageName);
    
    const stageKey = getStageKeyFromName(stageName);
    console.log('Stage key for', stageName, ':', stageKey);
    
    const count = leadsData.filter(lead => {
      const leadStageKey = getStageKeyForLead(lead.stage);
      const matches = leadStageKey === stageKey || lead.stage === stageName;
      
      if (matches) {
        console.log(`Lead ${lead.id} matches stage ${stageName} (key: ${stageKey})`);
      }
      
      return matches;
    }).length;
    
    console.log(`Final count for ${stageName}:`, count);
    return count;
  };

  // ← UPDATED: Show loading if either leads or settings are loading
  if (loading || settingsLoading) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <LeftSidebar 
          activeNavItem="dashboard"
          activeSubmenuItem="overview"
          stages={stages}
          getStageCount={getStageCount} // ← Updated function
          stagesTitle={getFieldLabel('stage') || 'Stages'} // ← NEW: Dynamic field label
          stagesIcon={Play}
          onLogout={onLogout}
          user={user}
        />
        <div className="nova-main">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            fontSize: '18px',
            color: '#666'
          }}>
            <Loader2 size={16} className="animate-spin" style={{ marginRight: '8px' }} />
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <LeftSidebar 
          activeNavItem="dashboard"
          activeSubmenuItem="overview"
          stages={stages}
          getStageCount={getStageCount} // ← Updated function
          stagesTitle={getFieldLabel('stage') || 'Stages'} // ← NEW: Dynamic field label
          stagesIcon={Play}
          onLogout={onLogout}
          user={user}
        />
        <div className="nova-main">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            fontSize: '18px',
            color: '#ef4444'
          }}>
            Error loading dashboard: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ← UPDATED: Left Sidebar with dynamic stages and field labels */}
      <LeftSidebar 
        activeNavItem="dashboard"
        activeSubmenuItem="overview"
        stages={stages}
        getStageCount={getStageCount} // ← Updated function
        stagesTitle={getFieldLabel('stage') || 'Stages'} // ← NEW: Dynamic field label
        stagesIcon={Play}
        onLogout={onLogout}
        user={user}
      />

      {/* Main Dashboard Content */}
      <div className="nova-main">
        <OverviewDashboard />
      </div>
    </div>
  );
};

export default Dashboard;