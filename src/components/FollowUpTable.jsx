import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { settingsService } from '../services/settingsService';
import LeftSidebar from './LeftSidebar';
import LeadSidebar from './LeadSidebar';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import FilterDropdown, { FilterButton, applyFilters } from './FilterDropdown';
import LeadStateProvider, { useLeadState } from './LeadStateProvider';
import SettingsDataProvider, { useSettingsData } from '../contexts/SettingsDataProvider';

import { TABLE_NAMES } from '../config/tableNames';
import { 
  Search,
  Filter,
  ChevronDown,
  Clipboard,
  History,
  FileText,
  Phone,
  Edit,
  Edit2,
  AlertCircle,
  Loader2,
  Play,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Link,
  DollarSign,
  CheckCircle,
  Trash2,
  CalendarDays,
  Eye,
  X,
  RefreshCw
} from 'lucide-react';

const FollowUpTable = ({ onLogout, user }) => {
  // Use settings data context
  const { 
    settingsData, 
    getFieldLabel,
    getStageInfo,
    getStageColor, 
    getStageScore, 
    getStageCategory,
    getStageKeyFromName,
    getStageNameFromKey,
    stageKeyToDataMapping,
    loading: settingsLoading 
  } = useSettingsData();
  
  const { 
    selectedLead, 
    setSelectedLead, 
    leadsData,
    setLeadsData,
    updateCompleteLeadData,
    getScoreFromStage,
    getCategoryFromStage
  } = useLeadState();

  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Search functionality states
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLeads, setFilteredLeads] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // DELETE FUNCTIONALITY - STATES
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // VIEW DETAILS POPUP STATES
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [selectedFollowUpDetails, setSelectedFollowUpDetails] = useState(null);

  // Follow-up Status Change Modal
  const [followUpStatusModal, setFollowUpStatusModal] = useState({
    isOpen: false,
    followUpId: null,
    leadId: null,
    currentStatus: null,
    selectedStatus: null,
    comment: '',
    error: ''
  });

  // Store latest follow-up comments per lead
  const [latestFollowUpComments, setLatestFollowUpComments] = useState({});

  // Sidebar editing states
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [sidebarFormData, setSidebarFormData] = useState({
    parentsName: '',
    kidsName: '',
    grade: '',
    source: '',
    stage: '',
    offer: '',
    email: '',
    phone: '',
    secondPhone: '',
    occupation: '',
    location: '',
    currentSchool: '',
    meetingDate: '',
    meetingTime: '',
    meetingLink: '',
    visitDate: '',
    visitTime: '',
    visitLocation: '',
    registrationFees: '',
    enrolled: '',
    notes: ''
  });

  // Real data from Supabase
  const [lastActivityData, setLastActivityData] = useState({});

  // Filter states
  // Filter states
  const [showFilter, setShowFilter] = useState(false);
  const [counsellorFilters, setCounsellorFilters] = useState([]);
  const [stageFilters, setStageFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [sourceFilters, setSourceFilters] = useState([]);

  // DATE RANGE STATES

  // DATE RANGE STATES
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0]    // Today
  });
  
  // Store follow-up rows (not lead rows)
  const [followUpRowsData, setFollowUpRowsData] = useState([]);

  // 🆕 AUTO-RESCHEDULE STATE
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduledCount, setRescheduledCount] = useState(0);

  // Get dynamic stages
  const stages = settingsData.stages.map(stage => ({
    value: stage.stage_key || stage.name,
    label: stage.name,
    color: stage.color || '#B3D7FF',
    score: stage.score || 10,
    category: stage.category || 'New'
  }));

  // Helper functions for stage_key conversion
  const getStageKeyForLead = (stageValue) => {
    if (stageKeyToDataMapping[stageValue]) {
      return stageValue;
    }
    return getStageKeyFromName(stageValue) || stageValue;
  };

  const getStageDisplayName = (stageValue) => {
    if (stageKeyToDataMapping[stageValue]) {
      return getStageNameFromKey(stageValue);
    }
    return stageValue;
  };

  // Convert database record to UI format with custom fields support
  const convertDatabaseToUIWithCustomFields = async (dbRecord) => {
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

    // Handle stage value
    const stageValue = dbRecord.stage;
    const stageKey = getStageKeyForLead(stageValue);
    const displayName = getStageDisplayName(stageValue);

    // Base lead data
    const baseLeadData = {
      id: dbRecord.id,
      parentsName: dbRecord.parents_name,
      kidsName: dbRecord.kids_name,
      phone: dbRecord.phone,
      secondPhone: dbRecord.second_phone || '',
      location: dbRecord.location,
      grade: dbRecord.grade,
      stage: stageKey,
      stageDisplayName: displayName,
      score: dbRecord.score,
      category: dbRecord.category,
      counsellor: dbRecord.counsellor,
      offer: dbRecord.offer,
      notes: dbRecord.notes || '',
      email: dbRecord.email || '',
      occupation: dbRecord.occupation || '',
      source: dbRecord.source || settingsData.sources?.[0]?.name || 'Instagram',
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

    // Fetch and attach custom fields
    try {
      const customFields = await settingsService.getCustomFieldsForLead(dbRecord.id);
      baseLeadData.customFields = customFields;
    } catch (error) {
      console.error('Error fetching custom fields for lead', dbRecord.id, error);
      baseLeadData.customFields = {};
    }

    return baseLeadData;
  };

  // Setup sidebar form data with custom fields support
  const setupSidebarFormDataWithCustomFields = (lead) => {
    const baseFormData = {
      parentsName: lead.parentsName || '',
      kidsName: lead.kidsName || '',
      grade: lead.grade || '',
      source: lead.source || settingsData.sources?.[0]?.name || 'Instagram',
      stage: lead.stage,
      counsellor: lead.counsellor || '', 
      offer: lead.offer || 'Welcome Kit',
      email: lead.email || '',
      phone: lead.phone || '',
      secondPhone: lead.secondPhone || '',
      occupation: lead.occupation || '',
      location: lead.location || '',
      currentSchool: lead.currentSchool || '',
      meetingDate: lead.meetingDate || '',
      meetingTime: lead.meetingTime || '',
      meetingLink: lead.meetingLink || '',
      visitDate: lead.visitDate || '',
      visitTime: lead.visitTime || '',
      visitLocation: lead.visitLocation || '',
      registrationFees: lead.registrationFees || '',
      enrolled: lead.enrolled || '',
      notes: lead.notes || '',
      meeting_confirmed: lead.meeting_confirmed || '',
      visit_confirmed: lead.visit_confirmed || ''
    };

    return baseFormData;
  };

  // DELETE FUNCTIONALITY
  const handleIndividualCheckboxChange = (leadId, checked) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
      setSelectAll(false);
    }
  };

  const handleSelectAllChange = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allLeadIds = displayLeads.map(row => row.leadData.id);
      setSelectedLeads(allLeadIds);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleDeleteClick = () => {
    if (selectedLeads.length > 0) {
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      // Delete custom fields for selected leads first
      for (const leadId of selectedLeads) {
        try {
          await settingsService.deleteAllCustomFieldsForLead(leadId);
        } catch (error) {
          console.error('Error deleting custom fields for lead', leadId, error);
        }
      }

      // Delete the leads themselves
      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .delete()
        .in('id', selectedLeads);

      if (error) {
        throw error;
      }

      // Refresh the leads data
      await fetchFollowUpLeads();
      
      // Clear selections
      setSelectedLeads([]);
      setSelectAll(false);
      setShowDeleteDialog(false);
      
    } catch (error) {
      console.error('Error deleting leads:', error);
      alert('Error deleting leads: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  // Fetch Latest Follow-up Comments
  const fetchLatestFollowUpComments = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LOGS)
        .select('record_id, description')
        .eq('main_action', 'Follow-up Status Updated')
        .order('action_timestamp', { ascending: false });

      if (error) throw error;

      const comments = {};
      const seen = new Set();

      data?.forEach(entry => {
        const leadId = entry.record_id;
        if (!seen.has(leadId)) {
          const description = entry.description;
          const commentMatch = description.match(/Comment:\s*"([^"]*)"/);
          if (commentMatch) {
            comments[leadId] = commentMatch[1];
            seen.add(leadId);
          }
        }
      });

      setLatestFollowUpComments(comments);
    } catch (error) {
      console.error('Error fetching latest follow-up comments:', error);
    }
  };

  // 🆕 AUTO-RESCHEDULE OVERDUE FOLLOW-UPS TO NEXT DAY
  const autoRescheduleOverdueFollowUps = async () => {
    console.log('=== AUTO-RESCHEDULE CHECK START ===');
    setIsRescheduling(true);
    setRescheduledCount(0);

    try {
      // Get today's date in local timezone
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;

      console.log('Today (local):', todayString);

      // Find all overdue follow-ups (status = "Not Done" OR null, and date < today)
      const { data: overdueFollowUps, error: fetchError } = await supabase
        .from(TABLE_NAMES.FOLLOW_UPS)
        .select('id, lead_id, follow_up_date, status')
        .or('status.eq.Not Done,status.is.null')
        .lt('follow_up_date', todayString);

      if (fetchError) {
        console.error('Error fetching overdue follow-ups:', fetchError);
        throw fetchError;
      }

      console.log(`Found ${overdueFollowUps?.length || 0} overdue follow-ups to reschedule`);
      
      if (overdueFollowUps && overdueFollowUps.length > 0) {
        console.log('Overdue follow-ups:', overdueFollowUps);
      }

      if (!overdueFollowUps || overdueFollowUps.length === 0) {
        console.log('✅ No follow-ups need rescheduling');
        setIsRescheduling(false);
        return;
      }

      // Reschedule each follow-up to THE NEXT DAY (original date + 1 day)
      let successCount = 0;
      for (const followUp of overdueFollowUps) {
        try {
          // Get the current follow-up date
          const currentDate = new Date(followUp.follow_up_date + 'T00:00:00');
          
          // Add 1 day to it
          const nextDay = new Date(currentDate);
          nextDay.setDate(nextDay.getDate() + 1);
          
          // Format as YYYY-MM-DD
          const nextDayYear = nextDay.getFullYear();
          const nextDayMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
          const nextDayDay = String(nextDay.getDate()).padStart(2, '0');
          const nextDayString = `${nextDayYear}-${nextDayMonth}-${nextDayDay}`;

          console.log(`Rescheduling follow-up ${followUp.id}: ${followUp.follow_up_date} → ${nextDayString}`);

          // Update follow-up with next day's date
          const { error: updateError } = await supabase
            .from(TABLE_NAMES.FOLLOW_UPS)
            .update({
              follow_up_date: nextDayString
            })
            .eq('id', followUp.id);

          if (updateError) {
            console.error(`❌ Error rescheduling follow-up ${followUp.id}:`, updateError);
          } else {
            successCount++;
            console.log(`✅ Successfully rescheduled follow-up ${followUp.id}: ${followUp.follow_up_date} → ${nextDayString}`);
          }
        } catch (error) {
          console.error(`❌ Error processing follow-up ${followUp.id}:`, error);
        }
      }

      setRescheduledCount(successCount);
      console.log(`=== AUTO-RESCHEDULE COMPLETE: ${successCount}/${overdueFollowUps.length} rescheduled ===`);

    } catch (error) {
      console.error('❌ Error in auto-reschedule:', error);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Open Follow-up Status Change Modal
  const openFollowUpStatusModal = (e, followUpId, leadId, currentStatus) => {
    e.stopPropagation();
    setFollowUpStatusModal({
      isOpen: true,
      followUpId: followUpId,
      leadId: leadId,
      currentStatus: currentStatus,
      selectedStatus: null,
      comment: '',
      error: ''
    });
  };

  // Close Follow-up Status Modal
  const closeFollowUpStatusModal = () => {
    setFollowUpStatusModal({
      isOpen: false,
      followUpId: null,
      leadId: null,
      currentStatus: null,
      selectedStatus: null,
      comment: '',
      error: ''
    });
  };

  // Handle Follow-up Status Modal Submit
  const handleFollowUpStatusModalSubmit = async () => {
    if (!followUpStatusModal.comment.trim()) {
      setFollowUpStatusModal(prev => ({
        ...prev,
        error: 'Please add a comment before submitting'
      }));
      return;
    }

    if (!followUpStatusModal.selectedStatus) {
      setFollowUpStatusModal(prev => ({
        ...prev,
        error: 'Please select a status'
      }));
      return;
    }

    try {
      console.log('Updating follow-up status:', followUpStatusModal.followUpId, followUpStatusModal.selectedStatus);
      
      const oldStatus = followUpStatusModal.currentStatus;
      const newStatus = followUpStatusModal.selectedStatus;

      // Update database
      const { error } = await supabase
        .from(TABLE_NAMES.FOLLOW_UPS)
        .update({ status: newStatus })
        .eq('id', followUpStatusModal.followUpId);

      if (error) {
        console.error('Database update failed:', error);
        throw error;
      }

      // Log to history with comment
      const descriptionWithComment = `Follow-up status changed from "${oldStatus}" to "${newStatus}". Comment: "${followUpStatusModal.comment}". Current Status is "${newStatus}".`;
      
      const { error: logError } = await supabase
        .from(TABLE_NAMES.LOGS)
        .insert([{
          main_action: 'Follow-up Status Updated',
          description: descriptionWithComment,
          table_name: TABLE_NAMES.FOLLOW_UPS,
          record_id: followUpStatusModal.leadId.toString(),
          action_timestamp: new Date().toISOString()
        }]);

      if (logError) {
        console.error('Error logging follow-up status change:', logError);
      }

      console.log('✅ Follow-up status updated successfully');
      
      // Update latest comments state
      setLatestFollowUpComments(prev => ({
        ...prev,
        [followUpStatusModal.leadId]: followUpStatusModal.comment
      }));

      // Close modal
      closeFollowUpStatusModal();
      
      // Refresh the entire data
      await fetchFollowUpLeads();
      await fetchLatestFollowUpComments();
      
    } catch (error) {
      console.error('Error updating follow-up status:', error);
      setFollowUpStatusModal(prev => ({
        ...prev,
        error: 'Error updating status: ' + error.message
      }));
    }
  };

  // VIEW DETAILS FUNCTIONALITY
  const handleViewDetails = async (e, row) => {
    e.stopPropagation();
    
    // Fetch the latest comment for this lead
    let latestComment = null;
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LOGS)
        .select('description')
        .eq('main_action', 'Follow-up Status Updated')
        .eq('record_id', row.leadData.id.toString())
        .order('action_timestamp', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const description = data[0].description;
        const commentMatch = description.match(/Comment:\s*"([^"]*)"/);
        if (commentMatch) {
          latestComment = commentMatch[1];
        }
      }
    } catch (error) {
      console.error('Error fetching latest comment:', error);
    }
    
    setSelectedFollowUpDetails({
      lead: row.leadData,
      followUps: row.allFollowUpsForLead || [],
      nextFollowUpDate: row.followUpDate,
      followUpDetails: row.followUpDetails,
      latestComment: latestComment
    });
    setShowDetailsPopup(true);
  };

  const closeDetailsPopup = () => {
    setShowDetailsPopup(false);
    setSelectedFollowUpDetails(null);
  };

  // Clear selections when data changes
  useEffect(() => {
    setSelectedLeads([]);
    setSelectAll(false);
  }, [searchTerm, counsellorFilters, stageFilters, statusFilters, sourceFilters, dateRange]);

  // Calculate stage counts
  const getStageCount = (stageName) => {
    const stageKey = getStageKeyFromName(stageName);
    const uniqueLeads = new Set();
    followUpRowsData.forEach(row => {
      const leadStageKey = getStageKeyForLead(row.leadData.stage);
      if (leadStageKey === stageKey || row.leadData.stage === stageName) {
        uniqueLeads.add(row.leadData.id);
      }
    });
    return uniqueLeads.size;
  };

  // Get stage color
  const getStageColorFromSettings = (stageValue) => {
    const stageKey = getStageKeyForLead(stageValue);
    return getStageColor(stageKey);
  };

  // Get counsellor initials
  const getCounsellorInitials = (fullName) => {
    if (!fullName) return 'NA';
    const words = fullName.trim().split(' ');
    const firstTwoWords = words.slice(0, 2);
    return firstTwoWords.map(word => word.charAt(0).toUpperCase()).join('');
  };

  // Fetch last activity data
  const fetchLastActivityData = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LAST_ACTIVITY_BY_LEAD)
        .select('*');

      if (error) throw error;

      const activityMap = {};
      data.forEach(item => {
        activityMap[item.record_id] = item.last_activity;
      });

      setLastActivityData(activityMap);
    } catch (error) {
      console.error('Error fetching last activity data:', error);
    }
  };

  // MAIN FETCH FUNCTION
  const fetchFollowUpLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== FOLLOW-UP LEADS FETCH START ===');
      console.log('User:', user?.full_name, 'Role:', user?.role);
      console.log('Date range:', dateRange);
      
      // Step 1: Fetch ALL follow-ups
      const { data: followUpsData, error: followUpsError } = await supabase
        .from(TABLE_NAMES.FOLLOW_UPS)
        .select('id, lead_id, follow_up_date, details, status, created_at')
        .order('follow_up_date', { ascending: true });

      if (followUpsError) {
        console.error('Error fetching follow-ups:', followUpsError);
        throw followUpsError;
      }

      console.log('✅ Total follow-ups in database:', followUpsData?.length || 0);

      if (!followUpsData || followUpsData.length === 0) {
        console.log('❌ No follow-ups found in database');
        setFollowUpRowsData([]);
        setLeadsData([]);
        setLoading(false);
        return;
      }

      // Step 2: Filter follow-ups by date range
      const filteredFollowUps = followUpsData.filter(f => {
        if (!f.follow_up_date) return false;
        
        const followUpDate = f.follow_up_date.split('T')[0];
        const startDate = dateRange.startDate;
        const endDate = dateRange.endDate;
        
        return followUpDate >= startDate && followUpDate <= endDate;
      });

      console.log('✅ Follow-ups in date range:', filteredFollowUps.length);

      if (filteredFollowUps.length === 0) {
        console.log('❌ No follow-ups in selected date range');
        setFollowUpRowsData([]);
        setLeadsData([]);
        setLoading(false);
        return;
      }

      // Step 3: Get unique lead IDs from filtered follow-ups
      const leadIds = [...new Set(filteredFollowUps.map(f => f.lead_id))];
      console.log('✅ Unique lead IDs from follow-ups:', leadIds);

      // Step 4: Fetch ALL leads first (no role filtering yet)
      const { data: allLeadsResponse, error: allLeadsError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .select('*')
        .in('id', leadIds)
        .order('id', { ascending: false });

      if (allLeadsError) {
        console.error('Error fetching leads:', allLeadsError);
        throw allLeadsError;
      }

      console.log('✅ Total leads fetched:', allLeadsResponse?.length || 0);

      // Step 5: Apply role-based filtering in memory
      let leadsResponse = allLeadsResponse;
      
      if (user && user.role !== 'admin') {
        console.log('👤 Regular user - filtering by counsellor:', user.full_name);
        leadsResponse = allLeadsResponse.filter(lead => lead.counsellor === user.full_name);
        console.log('✅ Leads after counsellor filter:', leadsResponse.length);
      } else {
        console.log('👑 Admin user - showing all leads');
      }

      if (!leadsResponse || leadsResponse.length === 0) {
        console.log('❌ No leads found after role filtering');
        setFollowUpRowsData([]);
        setLeadsData([]);
        setLoading(false);
        return;
      }

      // Step 6: Fetch activity data
      const { data: activityResponse, error: activityError } = await supabase
        .from(TABLE_NAMES.LAST_ACTIVITY_BY_LEAD)
        .select('*');

      if (activityError) {
        console.error('Error fetching activity:', activityError);
      }

      // Step 7: CREATE ROWS FOR EACH FOLLOW-UP
      const followUpRows = [];
      
      for (const leadRecord of leadsResponse) {
        const convertedLead = await convertDatabaseToUIWithCustomFields(leadRecord);
        
        // Get ALL follow-ups for this lead (for sidebar)
        const allLeadFollowUps = followUpsData.filter(f => f.lead_id === leadRecord.id);
        
        // Get follow-ups in date range for this lead
        const leadFollowUpsInRange = filteredFollowUps.filter(f => f.lead_id === leadRecord.id);
        
        // CREATE ONE ROW PER FOLLOW-UP IN DATE RANGE
        for (const followUp of leadFollowUpsInRange) {
          followUpRows.push({
            // Unique row ID (combination of lead ID and follow-up ID)
            rowId: `${leadRecord.id}-${followUp.id}`,
            
            // Lead data (same for all follow-ups of this lead)
            leadData: convertedLead,
            
            // This specific follow-up's data
            followUpId: followUp.id,
            followUpDate: followUp.follow_up_date.split('T')[0],
            followUpDetails: followUp.details,
            followUpStatus: followUp.status || 'Not Done',
            followUpCreatedAt: followUp.created_at,
            
            // All follow-ups for this lead (for sidebar)
            allFollowUpsForLead: allLeadFollowUps
          });
        }
      }
      
      // Sort rows by follow-up date
      followUpRows.sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
      
      console.log('✅ Total follow-up rows created:', followUpRows.length);
      console.log('=== FOLLOW-UP LEADS FETCH COMPLETE ===');
      
      setFollowUpRowsData(followUpRows);
      
      // Also update leadsData with unique leads for other components
      const uniqueLeadsMap = new Map();
      followUpRows.forEach(row => {
        if (!uniqueLeadsMap.has(row.leadData.id)) {
          uniqueLeadsMap.set(row.leadData.id, row.leadData);
        }
      });
      setLeadsData(Array.from(uniqueLeadsMap.values()));
      
      // Activity data
      if (activityResponse) {
        const activityMap = {};
        activityResponse.forEach(item => {
          activityMap[item.record_id] = item.last_activity;
        });
        setLastActivityData(activityMap);
      }

      // Fetch latest follow-up comments
      await fetchLatestFollowUpComments();
      
    } catch (error) {
      console.error('❌ Error fetching follow-up leads:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Fetch leads and auto-reschedule on mount and date range change
  useEffect(() => {
    const loadData = async () => {
      // First, auto-reschedule overdue follow-ups
      await autoRescheduleOverdueFollowUps();
      
      // Then fetch the updated data
      await fetchFollowUpLeads();
    };
    
    loadData();
  }, [dateRange.startDate, dateRange.endDate]);

  // Handle date range change
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sidebar functions
  const openSidebar = (lead) => {
    setSelectedLead(lead);
    const formData = setupSidebarFormDataWithCustomFields(lead);
    setSidebarFormData(formData);
    setShowSidebar(true);
    setIsEditingMode(false);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setSelectedLead(null);
    setIsEditingMode(false);
  };

  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    setIsEditingMode(!isEditingMode);
  };

  // Handle form field changes
  const handleSidebarFieldChange = (field, value) => {
    setSidebarFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle update all fields function
  const handleUpdateAllFields = async () => {
    try {
      let formattedPhone = sidebarFormData.phone;
      if (formattedPhone && !formattedPhone.startsWith('+91')) {
        formattedPhone = formattedPhone.replace(/^\+91/, '');
        formattedPhone = `+91${formattedPhone}`;
      }
      
      const stageKey = getStageKeyForLead(sidebarFormData.stage);
      
      const updateData = {
        parents_name: sidebarFormData.parentsName,
        kids_name: sidebarFormData.kidsName,
        grade: sidebarFormData.grade,
        source: sidebarFormData.source,
        phone: formattedPhone,
        second_phone: sidebarFormData.secondPhone,
        stage: stageKey,
        score: getStageScore(stageKey),
        category: getStageCategory(stageKey),
        counsellor: sidebarFormData.counsellor,
        offer: sidebarFormData.offer,
        email: sidebarFormData.email,
        occupation: sidebarFormData.occupation,
        location: sidebarFormData.location,
        current_school: sidebarFormData.currentSchool,
        meet_link: sidebarFormData.meetingLink,
        visit_location: sidebarFormData.visitLocation,
        reg_fees: sidebarFormData.registrationFees,
        enrolled: sidebarFormData.enrolled,
        notes: sidebarFormData.notes,
        updated_at: new Date().toISOString()
      };

      if (sidebarFormData.meetingDate && sidebarFormData.meetingTime) {
        updateData.meet_datetime = new Date(`${sidebarFormData.meetingDate}T${sidebarFormData.meetingTime}:00`).toISOString();
      }

      if (sidebarFormData.visitDate && sidebarFormData.visitTime) {
        updateData.visit_datetime = new Date(`${sidebarFormData.visitDate}T${sidebarFormData.visitTime}:00`).toISOString();
      }

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) {
        throw error;
      }

      await fetchLastActivityData();
      await fetchFollowUpLeads();

      setIsEditingMode(false);

      updateCompleteLeadData(selectedLead.id, sidebarFormData, getStageScore, getStageCategory);

    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead: ' + error.message);
    }
  };

  // Search functionality
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  // Determine which data to display
  const getDisplayLeads = () => {
    let filtered = followUpRowsData;
    
    // Apply search first
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(row => {
        const lead = row.leadData;
        return (
          lead.parentsName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.kidsName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getStageDisplayName(lead.stage).toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.counsellor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.occupation && lead.occupation.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.location && lead.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.currentSchool && lead.currentSchool.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (lead.source && lead.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (row.followUpDetails && row.followUpDetails.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }
    
    // Then apply filters on the lead data
    if (counsellorFilters.length > 0 || stageFilters.length > 0 || statusFilters.length > 0 || sourceFilters.length > 0) {
      filtered = filtered.filter(row => {
        const lead = row.leadData;
        
        // Counsellor filter
        if (counsellorFilters.length > 0 && !counsellorFilters.includes(lead.counsellor)) {
          return false;
        }
        
        // Stage filter
        if (stageFilters.length > 0) {
          const leadStageKey = getStageKeyForLead(lead.stage);
          const leadStageDisplay = getStageDisplayName(lead.stage);
          const matchesStage = stageFilters.some(filterStage => {
            const filterStageKey = getStageKeyFromName(filterStage);
            return leadStageKey === filterStageKey || leadStageDisplay === filterStage;
          });
          if (!matchesStage) return false;
        }
        
        // Status filter
        // Status filter
        if (statusFilters.length > 0 && !statusFilters.includes(lead.category)) {
          return false;
        }
        
        // Source filter
        if (sourceFilters.length > 0 && !sourceFilters.includes(lead.source)) {
          return false;
        }
        
        return true;
      });
    }
    
    return filtered;
  };

  const displayLeads = getDisplayLeads();

  // Format phone for mobile display
  const formatPhoneForMobile = (phone) => {
    if (!phone) return '';
    return phone.replace('+91', '').trim();
  };

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Format full date for popup
  const formatFullDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Show loading if either leads or settings are loading
  if (loading || settingsLoading) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="nova-main">
          <div className="loading-message">
            <Loader2 size={16} className="animate-spin" /> Loading follow-ups...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Sidebar */}
      <LeftSidebar 
        activeNavItem="followup"
        activeSubmenuItem=""
        stages={stages}
        getStageCount={getStageCount}
        stagesTitle="Stages"
        stagesIcon={Play}
        onLogout={onLogout}
        user={user}
      />

      {/* Main Content */}
      <div className="nova-main">
        {/* Header */}
        <div className="nova-header">
          <div className="header-left">
            <div className="header-title-row">
              <h1>
                <CalendarDays size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Follow-ups
              </h1>
            </div>
            
            {/* DATE RANGE PICKER */}
            <div className="date-range-container">
              <div className="date-input-group">
                <label>From:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="date-input-group">
                <label>To:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <span className="total-count">
              Follow-ups Found: {followUpRowsData.length}
            </span>
            
            {/* 🆕 RESCHEDULE INDICATOR */}
            {isRescheduling && (
              <span className="reschedule-indicator">
                <RefreshCw size={14} className="animate-spin" />
                Auto-rescheduling...
              </span>
            )}
            
            {rescheduledCount > 0 && !isRescheduling && (
              <span className="reschedule-success">
                ✓ {rescheduledCount} follow-up{rescheduledCount > 1 ? 's' : ''} auto-rescheduled
              </span>
            )}
            
            {/* DELETE BUTTON */}
            {selectedLeads.length > 0 && (
              <button 
                className="delete-selected-btn" 
                onClick={handleDeleteClick}
                disabled={isDeleting}
              >
                <Trash2 size={16} />
                Delete {selectedLeads.length} Selected
              </button>
            )}
          </div>

          <div className="header-right">
            {/* Desktop View */}
            <div className="desktop-header-actions">
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search follow-ups..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="search-input"
                />
              </div>
              <FilterButton
                showFilter={showFilter}
                setShowFilter={setShowFilter}
                counsellorFilters={counsellorFilters}
                stageFilters={stageFilters}
                statusFilters={statusFilters}
                sourceFilters={sourceFilters}
                setCounsellorFilters={setCounsellorFilters}
                setStageFilters={setStageFilters}
                setStatusFilters={setStatusFilters}
                setSourceFilters={setSourceFilters}
                settingsData={settingsData} 
                getFieldLabel={getFieldLabel}
                getStageKeyFromName={getStageKeyFromName}
                getStageDisplayName={getStageDisplayName}
              />
            </div>

            {/* Mobile View */}
            
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <AlertCircle size={16} /> Error: {error}
          </div>
        )}

        {/* Follow-ups Table */}
        <div className="nova-table-container nova-followup-table">
          <table className="nova-table">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    className="select-all"
                    checked={selectAll}
                    onChange={(e) => handleSelectAllChange(e.target.checked)}
                  />
                </th>
                <th>ID</th>
                <th>Parent</th>
                <th>Phone</th>
                <th className="desktop-only">{getFieldLabel('grade')}</th>
                <th>Stage</th>
                <th className="desktop-only">Status</th>
                <th className="desktop-only">{getFieldLabel('counsellor')}</th>
                <th>Follow-up</th>
                <th>F/U Status</th>
                <th>View Details</th>
              </tr>
            </thead>
            <tbody>
              {!loading && displayLeads.length > 0 ? (
                displayLeads.map(row => (
                  <tr 
                    key={row.rowId}
                    onClick={() => openSidebar(row.leadData)} 
                    className="table-row mobile-tap-row"
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(row.leadData.id)}
                        onChange={(e) => handleIndividualCheckboxChange(row.leadData.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()} 
                      />
                    </td>
                    <td>
                      <div className="id-info">
                        <div className="lead-id">{row.leadData.id}</div>
                        <div className="created-date">{new Date(row.leadData.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                    </td>
                    <td>
                      <div className="parent-info">
                        <div className="parent-name">{row.leadData.parentsName}</div>
                        <div className="kid-name">{row.leadData.kidsName}</div>
                      </div>
                    </td>
                    <td>{formatPhoneForMobile(row.leadData.phone)}</td>
                    <td className="desktop-only">{row.leadData.grade}</td>
                    
                    {/* STAGE - DISPLAY ONLY (NO DROPDOWN) */}
                    <td>
                      <div 
                        className="stage-badge" 
                        style={{ 
                          backgroundColor: getStageColorFromSettings(row.leadData.stage), 
                          color: '#333',
                          cursor: 'default'
                        }}
                      >
                        <span>{getStageDisplayName(row.leadData.stage)}</span>
                      </div>
                    </td>
                    
                    <td className="desktop-only">
                      <span className="status-badge-text">
                        {row.leadData.category}
                      </span>
                    </td>
                    <td className="counsellor-middle">
                      <div className="counsellor-avatar">
                        {getCounsellorInitials(row.leadData.counsellor)}
                      </div>
                    </td>
                    <td>
                      <div className="follow-up-info">
                        <div className="follow-up-date">
                          {formatDateForDisplay(row.followUpDate)}
                        </div>
                      </div>
                    </td>
                    
                    {/* FOLLOW-UP STATUS - OPENS MODAL */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div 
                        className={`followup-status-badge ${row.followUpStatus === 'Done' ? 'done' : 'not-done'}`}
                        onClick={(e) => openFollowUpStatusModal(e, row.followUpId, row.leadData.id, row.followUpStatus)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span>{row.followUpStatus || 'Not Done'}</span>
                        <Edit2 size={12} style={{ marginLeft: '4px' }} />
                      </div>
                    </td>
                    
                    <td className="counsellor-middle">
                      <button
                        className="view-details-btn"
                        onClick={(e) => handleViewDetails(e, row)}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : !loading ? (
                <tr>
                  <td colSpan="11" className="no-data">
                    {searchTerm 
                      ? 'No follow-ups found for your search.' 
                      : `No follow-ups scheduled for ${dateRange.startDate === dateRange.endDate ? 
                          formatDateForDisplay(dateRange.startDate) : 
                          `${formatDateForDisplay(dateRange.startDate)} - ${formatDateForDisplay(dateRange.endDate)}`}`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOLLOW-UP STATUS CHANGE MODAL */}
      {followUpStatusModal.isOpen && (
        <div className="stage-modal-overlay" onClick={closeFollowUpStatusModal}>
          <div className="stage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stage-modal-header">
              <h3>Change Follow-up Status</h3>
              <button 
                className="stage-modal-close-btn" 
                onClick={closeFollowUpStatusModal}
              >
                <X size={20} />
              </button>
            </div>

            <div className="stage-modal-body">
              <div className="stage-modal-form-group">
                <label className="stage-modal-label">Select New Status</label>
                <select
                  value={followUpStatusModal.selectedStatus || ''}
                  onChange={(e) => setFollowUpStatusModal(prev => ({
                    ...prev,
                    selectedStatus: e.target.value,
                    error: ''
                  }))}
                  className="stage-modal-select"
                >
                  <option value="">-- Select Status --</option>
                  <option value="Done">Done</option>
                  <option value="Not Done">Not Done</option>
                </select>
              </div>

              <div className="stage-modal-form-group">
                <label className="stage-modal-label">Comment (Required)</label>
                <textarea
                  value={followUpStatusModal.comment}
                  onChange={(e) => setFollowUpStatusModal(prev => ({
                    ...prev,
                    comment: e.target.value,
                    error: ''
                  }))}
                  placeholder="Enter reason for status change..."
                  className="stage-modal-textarea"
                  rows="4"
                />
              </div>

              {followUpStatusModal.error && (
                <div className="stage-modal-error">
                  {followUpStatusModal.error}
                </div>
              )}
            </div>

            <div className="stage-modal-footer">
              <button 
                className="stage-modal-cancel-btn" 
                onClick={closeFollowUpStatusModal}
              >
                Cancel
              </button>
              <button 
                className="stage-modal-submit-btn" 
                onClick={handleFollowUpStatusModalSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Sidebar Component */}
      <LeadSidebar
        key={selectedLead?.id}
        showSidebar={showSidebar}
        selectedLead={selectedLead}
        isEditingMode={isEditingMode}
        sidebarFormData={sidebarFormData}
        stages={stages}
        settingsData={settingsData}
        onClose={closeSidebar}
        onEditModeToggle={handleEditModeToggle}
        onFieldChange={handleSidebarFieldChange}
        onUpdateAllFields={handleUpdateAllFields}
        onRefreshActivityData={fetchLastActivityData}
        getStageColor={getStageColorFromSettings}
        getCounsellorInitials={getCounsellorInitials}
        getScoreFromStage={getStageScore}
        getCategoryFromStage={getStageCategory}
      />

      {/* FOLLOW-UP DETAILS POPUP - WITH LATEST COMMENT */}
      {showDetailsPopup && selectedFollowUpDetails && (
        <div className="popup-overlay" onClick={closeDetailsPopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="popup-header">
              <h3 className="popup-title">
                <CalendarDays size={20} />
                Follow-up Details
              </h3>
              <button className="popup-close-btn" onClick={closeDetailsPopup}>
                <X size={20} />
              </button>
            </div>

            {/* Lead Info */}
            <div className="lead-info-section">
              <h4 className="lead-info-title">Lead Information</h4>
              <div className="lead-info-grid">
                <div>
                  <strong>Parent:</strong> {selectedFollowUpDetails.lead.parentsName}
                </div>
                <div>
                  <strong>Child:</strong> {selectedFollowUpDetails.lead.kidsName}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedFollowUpDetails.lead.phone}
                </div>
                <div>
                  <strong>Grade:</strong> {selectedFollowUpDetails.lead.grade}
                </div>
              </div>
            </div>

            {/* LATEST COMMENT SECTION */}
            {selectedFollowUpDetails.latestComment && (
              <div className="latest-comment-section">
                <h4 className="latest-comment-title">
                  <FileText size={16} />
                  Latest Comment
                </h4>
                <div className="latest-comment-box">
                  {selectedFollowUpDetails.latestComment}
                </div>
              </div>
            )}

            {/* Follow-up List */}
            <div>
              <h4 className="followup-schedule-title">
                <Clock size={16} />
                Follow-up Schedule
              </h4>

              {selectedFollowUpDetails.followUps && selectedFollowUpDetails.followUps.length > 0 ? (
                <div className="followup-list">
                  {selectedFollowUpDetails.followUps.map((followUp, index) => (
                    <div 
                      key={index}
                      className={`followup-item ${followUp.status === 'Done' ? 'followup-done' : ''}`}
                    >
                      <div className="followup-item-header">
                        <div className="followup-date">
                          <Calendar size={14} />
                          {formatFullDate(followUp.follow_up_date)}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {followUp.status === 'Done' && (
                            <span className="followup-done-badge">
                              <CheckCircle size={12} /> Done
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="followup-details">
                        {followUp.details || 'No details provided'}
                      </div>
                      
                      <div className="followup-created">
                        Created: {new Date(followUp.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-followups-message">
                  No follow-up details available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        selectedLeads={selectedLeads}
        leadsData={Array.from(new Set(followUpRowsData.map(r => r.leadData)))}
      />
    </div>
  );
};

export default FollowUpTable;
