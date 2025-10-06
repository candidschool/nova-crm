import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { settingsService } from '../services/settingsService';
import { logStageChange } from '../utils/historyLogger';
import LeftSidebar from './LeftSidebar';
import LeadSidebar from './LeadSidebar';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import FilterDropdown, { FilterButton, applyFilters } from './FilterDropdown';
import LeadStateProvider, { useLeadState } from './LeadStateProvider';
import SettingsDataProvider, { useSettingsData } from '../contexts/SettingsDataProvider';
import MobileHeaderDropdown from './MobileHeaderDropdown';
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
  X
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

  // Stage dropdown states
  const [stageDropdownOpen, setStageDropdownOpen] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // DELETE FUNCTIONALITY - NEW STATES
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // VIEW DETAILS POPUP STATES - NEW
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [selectedFollowUpDetails, setSelectedFollowUpDetails] = useState(null);

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
  const [showFilter, setShowFilter] = useState(false);
  const [counsellorFilters, setCounsellorFilters] = useState([]);
  const [stageFilters, setStageFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);

  // DATE RANGE STATES - NEW FOR FOLLOW-UP TABLE
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0]    // Today
  });
  const [followUpLeadsData, setFollowUpLeadsData] = useState([]);

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
      notes: lead.notes || ''
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
      const allLeadIds = displayLeads.map(lead => lead.id);
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

  // VIEW DETAILS FUNCTIONALITY - NEW
  const handleViewDetails = (e, lead) => {
    e.stopPropagation(); // Prevent opening sidebar
    setSelectedFollowUpDetails({
      lead: lead,
      followUps: lead.followUps || [],
      nextFollowUpDate: lead.nextFollowUpDate,
      followUpDetails: lead.followUpDetails
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
  }, [searchTerm, counsellorFilters, stageFilters, statusFilters, dateRange]);

  // Calculate stage counts
  const getStageCount = (stageName) => {
    const stageKey = getStageKeyFromName(stageName);
    return followUpLeadsData.filter(lead => {
      const leadStageKey = getStageKeyForLead(lead.stage);
      return leadStageKey === stageKey || lead.stage === stageName;
    }).length;
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

  // ← UPDATED: MAIN FETCH FUNCTION WITH ROLE-BASED FILTERING
  const fetchFollowUpLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== FOLLOW-UP LEADS FETCH WITH ROLE-BASED FILTERING ===');
      console.log('Fetching follow-ups for date range:', dateRange);
      console.log('User role:', user.role);
      console.log('User name:', user.full_name);
      
      // Fetch follow-ups within the date range
      const { data: followUpsData, error: followUpsError } = await supabase
        .from(TABLE_NAMES.FOLLOW_UPS)
        .select('lead_id, follow_up_date, details, created_at')
        .gte('follow_up_date', dateRange.startDate)
        .lte('follow_up_date', dateRange.endDate)
        .order('follow_up_date', { ascending: true });

      if (followUpsError) throw followUpsError;

      console.log('Follow-ups found:', followUpsData);

      if (!followUpsData || followUpsData.length === 0) {
        setFollowUpLeadsData([]);
        setLeadsData([]);
        return;
      }

      // Get unique lead IDs
      const leadIds = [...new Set(followUpsData.map(f => f.lead_id))];
      console.log('Unique lead IDs:', leadIds);

      // ← NEW: Build the leads query with role-based filtering
      let leadsQuery = supabase
        .from(TABLE_NAMES.LEADS)
        .select('*')
        .in('id', leadIds);

      // ← NEW: Apply role-based filtering
      if (user.role !== 'admin') {
        console.log('Applying role-based filter for regular user');
        leadsQuery = leadsQuery.eq('counsellor', user.full_name);
      } else {
        console.log('Admin user - showing all leads');
      }

      // Execute the query
      const { data: leadsResponse, error: leadsError } = await leadsQuery.order('id', { ascending: false });

      if (leadsError) throw leadsError;

      console.log('Role-filtered leads found:', leadsResponse.length);

      // Also fetch activity data
      const { data: activityResponse, error: activityError } = await supabase
        .from(TABLE_NAMES.LAST_ACTIVITY_BY_LEAD)
        .select('*');

      if (activityError) throw activityError;

      // Convert leads data with custom fields
      console.log('Converting leads data with custom fields...');
      const convertedData = await Promise.all(
        leadsResponse.map(async (leadRecord) => {
          const convertedLead = await convertDatabaseToUIWithCustomFields(leadRecord);
          
          // Add follow-up information to each lead
          const leadFollowUps = followUpsData.filter(f => f.lead_id === leadRecord.id);
          convertedLead.followUps = leadFollowUps;
          convertedLead.nextFollowUpDate = leadFollowUps[0]?.follow_up_date; // First one due to ordering
          convertedLead.followUpDetails = leadFollowUps[0]?.details;
          
          return convertedLead;
        })
      );
      
      setFollowUpLeadsData(convertedData);
      setLeadsData(convertedData); // For compatibility with existing components
      
      // Process activity data
      const activityMap = {};
      activityResponse.forEach(item => {
        activityMap[item.record_id] = item.last_activity;
      });
      setLastActivityData(activityMap);
      
      console.log('Role-filtered follow-up leads loaded:', convertedData);
      
    } catch (error) {
      console.error('Error fetching follow-up leads:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads on component mount and when date range changes
  useEffect(() => {
    console.time('Follow-up page load time');
    fetchFollowUpLeads().then(() => {
      console.timeEnd('Follow-up page load time');
    });
  }, [dateRange]);

  // Handle date range change
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper functions for styling
  const getStageClass = (stage) => {
    const stageMap = {
      "New Lead": "stage-new-lead",
      "Connected": "stage-connected",
      "Meeting Booked": "stage-meeting-booked",
      "Meeting Done": "stage-meeting-done",
      "Proposal Sent": "stage-proposal-sent",
      "Visit Booked": "stage-visit-booked",
      "Visit Done": "stage-visit-done",
      "Registered": "stage-registered",
      "Admission": "stage-admission",
      "No Response": "stage-no-response"
    };
    return stageMap[stage] || "stage-new-lead";
  };

  const getCategoryClass = (category) => {
    const categoryMap = {
      "New": "status-new",
      "Warm": "status-warm",
      "Hot": "status-hot",
      "Enrolled": "status-enrolled",
      "Cold": "status-cold"
    };
    return categoryMap[category] || "status-new";
  };

  // Sidebar functions
  const openSidebar = (lead) => {
    console.log('Opening sidebar for lead:', lead);
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

  // Handle stage change from sidebar
  const handleSidebarStageChange = async (leadId, newStageKey) => {
    try {
      const lead = followUpLeadsData.find(l => l.id === leadId);
      const oldStageKey = lead.stage;
      const updatedScore = getStageScore(newStageKey);
      const updatedCategory = getStageCategory(newStageKey);
      
      const oldStageName = getStageDisplayName(oldStageKey);
      const newStageName = getStageDisplayName(newStageKey);
      
      if (oldStageKey !== newStageKey) {
        await logStageChange(leadId, oldStageName, newStageName, 'sidebar');
      }

      let updateData = { 
        stage: newStageKey,
        score: updatedScore, 
        category: updatedCategory,
        updated_at: new Date().toISOString()
      };

      const noResponseKey = getStageKeyFromName('No Response');
      if (newStageKey === noResponseKey && oldStageKey !== noResponseKey) {
        updateData.previous_stage = oldStageKey;
      }

      if (oldStageKey === noResponseKey && newStageKey !== noResponseKey) {
        updateData.previous_stage = null;
      }

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      await fetchLastActivityData();

      const updatedLeads = followUpLeadsData.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              stage: newStageKey, 
              stageDisplayName: newStageName,
              score: updatedScore, 
              category: updatedCategory 
            }
          : lead
      );
      
      setFollowUpLeadsData(updatedLeads);
      setLeadsData(updatedLeads);

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({
          ...selectedLead,
          stage: newStageKey,
          stageDisplayName: newStageName,
          score: updatedScore,
          category: updatedCategory
        });
      }

      alert('Stage updated successfully!');
      
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Error updating stage: ' + error.message);
    }
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

      const oldStageKey = selectedLead.stage;
      const newStageKey = stageKey;
      
      if (oldStageKey !== newStageKey) {
        const oldStageName = getStageDisplayName(oldStageKey);
        const newStageName = getStageDisplayName(newStageKey);
        await logStageChange(selectedLead.id, oldStageName, newStageName, 'sidebar edit all');
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

  // Handle stage dropdown toggle
  const handleStageDropdownToggle = (e, leadId) => {
    e.stopPropagation();
    setStageDropdownOpen(stageDropdownOpen === leadId ? null : leadId);
  };

  // Handle stage change from dropdown
  const handleStageChangeFromDropdown = async (e, leadId, newStageKey) => {
    e.stopPropagation();
    
    try {
      const lead = followUpLeadsData.find(l => l.id === leadId);
      const oldStageKey = lead.stage;
      const updatedScore = getStageScore(newStageKey);
      const updatedCategory = getStageCategory(newStageKey);
      
      const oldStageName = getStageDisplayName(oldStageKey);
      const newStageName = getStageDisplayName(newStageKey);
      
      if (oldStageKey !== newStageKey) {
        await logStageChange(leadId, oldStageName, newStageName, 'table dropdown');
      }

      let updateData = { 
        stage: newStageKey,
        score: updatedScore, 
        category: updatedCategory,
        updated_at: new Date().toISOString()
      };

      const noResponseKey = getStageKeyFromName('No Response');
      if (newStageKey === noResponseKey && oldStageKey !== noResponseKey) {
        updateData.previous_stage = oldStageKey;
      }

      if (oldStageKey === noResponseKey && newStageKey !== noResponseKey) {
        updateData.previous_stage = null;
      }

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        throw error;
      }

      await fetchLastActivityData();

      const updatedLeads = followUpLeadsData.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              stage: newStageKey, 
              stageDisplayName: newStageName,
              score: updatedScore, 
              category: updatedCategory 
            }
          : lead
      );
      
      setFollowUpLeadsData(updatedLeads);
      setLeadsData(updatedLeads);
      
      setStageDropdownOpen(null);
      
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Error updating stage: ' + error.message);
    }
  };

  // Close stage dropdown when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (stageDropdownOpen) {
        setStageDropdownOpen(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [stageDropdownOpen]);

  // Search functionality
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setFilteredLeads([]);
    } else {
      const filtered = followUpLeadsData.filter(lead => 
        lead.parentsName.toLowerCase().includes(term.toLowerCase()) ||
        lead.kidsName.toLowerCase().includes(term.toLowerCase()) ||
        lead.phone.toLowerCase().includes(term.toLowerCase()) ||
        getStageDisplayName(lead.stage).toLowerCase().includes(term.toLowerCase()) ||
        lead.counsellor.toLowerCase().includes(term.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(term.toLowerCase())) ||
        (lead.occupation && lead.occupation.toLowerCase().includes(term.toLowerCase())) ||
        (lead.location && lead.location.toLowerCase().includes(term.toLowerCase())) ||
        (lead.currentSchool && lead.currentSchool.toLowerCase().includes(term.toLowerCase())) ||
        (lead.source && lead.source.toLowerCase().includes(term.toLowerCase())) ||
        (lead.followUpDetails && lead.followUpDetails.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredLeads(filtered);
    }
  };

  // Determine which data to display
  const getDisplayLeads = () => {
    let filtered = followUpLeadsData;
    
    // Apply search first
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(lead => 
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
        (lead.followUpDetails && lead.followUpDetails.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Then apply filters
    return applyFilters(filtered, counsellorFilters, stageFilters, statusFilters, getStageDisplayName, getStageKeyFromName);
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
              Follow-ups Found: {followUpLeadsData.length}
            </span>
            
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
                setCounsellorFilters={setCounsellorFilters}
                setStageFilters={setStageFilters}
                setStatusFilters={setStatusFilters}
                settingsData={settingsData} 
                getFieldLabel={getFieldLabel}
                getStageKeyFromName={getStageKeyFromName}
                getStageDisplayName={getStageDisplayName}
              />
            </div>

            {/* Mobile View */}
            <div className="mobile-header-actions">
              <MobileHeaderDropdown
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                showFilter={showFilter}
                setShowFilter={setShowFilter}
                counsellorFilters={counsellorFilters}
                stageFilters={stageFilters}
                statusFilters={statusFilters}
                setCounsellorFilters={setCounsellorFilters}
                setStageFilters={setStageFilters}
                setStatusFilters={setStatusFilters}
                settingsData={settingsData}
                getFieldLabel={getFieldLabel}
                getStageKeyFromName={getStageKeyFromName}
                getStageDisplayName={getStageDisplayName}
                FilterButton={FilterButton}
                hideAddButtons={true} // Hide add/import buttons
              />
            </div>
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
                <th>View Details</th>
              </tr>
            </thead>
            <tbody>
              {!loading && displayLeads.length > 0 ? (
                displayLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => openSidebar(lead)} 
                    className="table-row mobile-tap-row"
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => handleIndividualCheckboxChange(lead.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()} 
                      />
                    </td>
                    <td>
                      <div className="id-info">
                        <div className="lead-id">{lead.id}</div>
                        <div className="created-date">{new Date(lead.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                    </td>
                    <td>
                      <div className="parent-info">
                        <div className="parent-name">{lead.parentsName}</div>
                        <div className="kid-name">{lead.kidsName}</div>
                      </div>
                    </td>
                    <td>{formatPhoneForMobile(lead.phone)}</td>
                    <td className="desktop-only">{lead.grade}</td>
                    <td>
                      <div className="stage-dropdown-container">
                        <div 
                          className="stage-badge stage-dropdown-trigger" 
                          style={{ 
                            backgroundColor: getStageColorFromSettings(lead.stage), 
                            color: '#333'
                          }}
                          onClick={(e) => handleStageDropdownToggle(e, lead.id)}
                        >
                          <span>{getStageDisplayName(lead.stage)}</span>
                          <ChevronDown 
                            size={14} 
                            className={`chevron ${stageDropdownOpen === lead.id ? 'open' : ''}`}
                          />
                        </div>
                        
                        {/* Dynamic Stage Dropdown */}
                        {stageDropdownOpen === lead.id && (
                          <div className="stage-dropdown-menu">
                            {stages.map((stage, index) => (
                              <div
                                key={stage.value}
                                className="stage-dropdown-item"
                                onClick={(e) => handleStageChangeFromDropdown(e, lead.id, stage.value)}
                              >
                                <span 
                                  className="stage-color-dot"
                                  style={{ backgroundColor: stage.color }}
                                ></span>
                                <span className="stage-name">{stage.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="desktop-only">
                      <span className="status-badge-text">
                        {lead.category}
                      </span>
                    </td>
                    <td className="counsellor-middle">
                      <div className="counsellor-avatar">
                        {getCounsellorInitials(lead.counsellor)}
                      </div>
                    </td>
                    <td>
                      <div className="follow-up-info">
                        <div className="follow-up-date">
                          {formatDateForDisplay(lead.nextFollowUpDate)}
                        </div>
                      </div>
                    </td>
                    <td className="counsellor-middle">
                      <button
                        className="view-details-btn"
                        onClick={(e) => handleViewDetails(e, lead)}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : !loading ? (
                <tr>
                  <td colSpan="10" className="no-data">
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
        onStageChange={handleSidebarStageChange}
        onRefreshActivityData={fetchLastActivityData}
        getStageColor={getStageColorFromSettings}
        getCounsellorInitials={getCounsellorInitials}
        getScoreFromStage={getStageScore}
        getCategoryFromStage={getStageCategory}
      />

      {/* Follow-up Details Popup */}
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
                      className={`followup-item ${index === 0 ? 'next' : ''}`}
                    >
                      <div className="followup-item-header">
                        <div className="followup-date">
                          <Calendar size={14} />
                          {formatFullDate(followUp.follow_up_date)}
                        </div>
                        {index === 0 && (
                          <span className="followup-next-badge">Next</span>
                        )}
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
        leadsData={followUpLeadsData}
      />
    </div>
  );
};

export default FollowUpTable;