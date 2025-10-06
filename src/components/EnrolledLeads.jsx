import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { settingsService } from '../services/settingsService';
import { logStageChange } from '../utils/historyLogger';
import AddLeadForm from './AddLeadForm';
import LeftSidebar from './LeftSidebar';
import LeadSidebar from './LeadSidebar';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import FilterDropdown, { FilterButton, applyFilters } from './FilterDropdown';
import LeadStateProvider,{ useLeadState } from './LeadStateProvider';
import SettingsDataProvider, { useSettingsData } from '../contexts/SettingsDataProvider';
import ImportLeadsModal from './ImportLeadsModal';
import { TABLE_NAMES } from '../config/tableNames';
import MobileHeaderDropdown from './MobileHeaderDropdown';
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
  Plus
} from 'lucide-react';

const EnrolledLeads = ({ onLogout, user }) => {
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLeads, setFilteredLeads] = useState([]);

  const [stageDropdownOpen, setStageDropdownOpen] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const [lastActivityData, setLastActivityData] = useState({});

  const [showFilter, setShowFilter] = useState(false);
  const [counsellorFilters, setCounsellorFilters] = useState([]);
  const [stageFilters, setStageFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [alertFilter, setAlertFilter] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 1000;

  const stages = settingsData.stages.map(stage => ({
    value: stage.stage_key || stage.name,
    label: stage.name,
    color: stage.color || '#B3D7FF',
    score: stage.score || 10,
    category: stage.category || 'New'
  }));

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

  // ✅ OPTIMIZED: Synchronous conversion function (no async needed)
  const convertDatabaseToUI = (dbRecord, customFieldsMap) => {
    let meetingDate = '';
    let meetingTime = '';
    let visitDate = '';
    let visitTime = '';

    if (dbRecord.meet_datetime) {
      const meetDateTimeStr = dbRecord.meet_datetime.replace('Z', '').replace(' ', 'T');
      const [datePart, timePart] = meetDateTimeStr.split('T');
      meetingDate = datePart;
      meetingTime = timePart ? timePart.slice(0, 5) : '';
    }

    if (dbRecord.visit_datetime) {
      const visitDateTimeStr = dbRecord.visit_datetime.replace('Z', '').replace(' ', 'T');
      const [datePart, timePart] = visitDateTimeStr.split('T');
      visitDate = datePart;
      visitTime = timePart ? timePart.slice(0, 5) : '';
    }

    const stageValue = dbRecord.stage;
    const stageKey = getStageKeyForLead(stageValue);
    const displayName = getStageDisplayName(stageValue);

    return {
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
      stage2_r1: dbRecord.stage2_r1 || '',
      stage2_r2: dbRecord.stage2_r2 || '',
      stage7_r1: dbRecord.stage7_r1 || '',
      stage7_r2: dbRecord.stage7_r2 || '',
      previousStage: dbRecord.previous_stage || '',
      customFields: customFieldsMap[dbRecord.id] || {},
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
      for (const leadId of selectedLeads) {
        try {
          await settingsService.deleteAllCustomFieldsForLead(leadId);
        } catch (error) {
          console.error('Error deleting custom fields for lead', leadId, error);
        }
      }

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .delete()
        .in('id', selectedLeads);

      if (error) {
        throw error;
      }

      await fetchLeads();
      
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

  useEffect(() => {
    setSelectedLeads([]);
    setSelectAll(false);
    setCurrentPage(1);
  }, [searchTerm, counsellorFilters, stageFilters, statusFilters, alertFilter]);

  const getStageCount = (stageName) => {
  const stageKey = getStageKeyFromName(stageName);
  return leadsData.filter(lead => {
    const leadStageKey = getStageKeyForLead(lead.stage);
    const isEnrolledLead = lead.category === 'Enrolled';
    return isEnrolledLead && (leadStageKey === stageKey || lead.stage === stageName);
  }).length;
};

  const getStageColorFromSettings = (stageValue) => {
    const stageKey = getStageKeyForLead(stageValue);
    return getStageColor(stageKey);
  };

  const getCounsellorInitials = (fullName) => {
    if (!fullName) return 'NA';
    const words = fullName.trim().split(' ');
    const firstTwoWords = words.slice(0, 2);
    return firstTwoWords.map(word => word.charAt(0).toUpperCase()).join('');
  };

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

  const getDaysSinceLastActivity = (leadId) => {
    const lastActivity = lastActivityData[leadId];
    if (!lastActivity) {
      return 0;
    }
    
    const lastActivityDate = new Date(lastActivity);
    const today = new Date();
    const diffTime = today - lastActivityDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const shouldShowAlert = (leadId) => {
    const days = getDaysSinceLastActivity(leadId);
    return days >= 3;
  };

  // ✅ OPTIMIZED: Bulk fetch leads and custom fields
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.time('Total Fetch Time');
      
      // Fetch all leads in batches
      let allLeads = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      
      console.time('Leads Fetch');
      while (hasMore) {
        console.log(`Fetching batch starting from ${from}...`);
        
        const { data, error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .select('*')
          .order('id', { ascending: false })
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        console.log(`Fetched ${data.length} leads in this batch`);
        allLeads = [...allLeads, ...data];
        
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          from += batchSize;
        }
      }
      console.timeEnd('Leads Fetch');

      console.log('Total leads fetched from database:', allLeads.length);
      
      // Fetch activity data
      console.time('Activity Fetch');
      const { data: activityData, error: activityError } = await supabase
        .from(TABLE_NAMES.LAST_ACTIVITY_BY_LEAD)
        .select('*');
      
      if (activityError) throw activityError;
      console.timeEnd('Activity Fetch');

      // ✅ BULK FETCH: Get ALL custom fields in ONE query
      console.time('Custom Fields Bulk Fetch');
      console.log('Bulk fetching custom fields for all leads...');
      const leadIds = allLeads.map(lead => lead.id);
      const customFieldsByLead = await settingsService.getCustomFieldsForLeads(leadIds);
      console.timeEnd('Custom Fields Bulk Fetch');
      console.log('Custom fields bulk fetch complete');

      // ✅ OPTIMIZED: Convert leads with pre-fetched custom fields (synchronous map)
      console.time('Data Conversion');
      console.log('Converting leads data...');
      const convertedData = allLeads.map(dbRecord => 
        convertDatabaseToUI(dbRecord, customFieldsByLead)
      );
      console.timeEnd('Data Conversion');
      console.log('Leads data converted. Total:', convertedData.length);
      
      // Set activity data
      const activityMap = {};
      activityData.forEach(item => {
        activityMap[item.record_id] = item.last_activity;
      });
      setLastActivityData(activityMap);

      // Set leads data
      setLeadsData(convertedData);
      
      console.timeEnd('Total Fetch Time');
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Refresh single lead function
  const refreshSingleLead = async (leadId) => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      // Fetch custom fields for this single lead
      const customFields = await settingsService.getCustomFieldsForLead(leadId);
      const customFieldsMap = { [leadId]: customFields };

      const convertedLead = convertDatabaseToUI(data, customFieldsMap);

      setLeadsData(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? convertedLead : lead
        )
      );

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(convertedLead);
        setSidebarFormData(setupSidebarFormDataWithCustomFields(convertedLead));
      }

      await fetchLastActivityData();

      return convertedLead;
    } catch (error) {
      console.error('Error refreshing single lead:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.time('Page load time');
    fetchLeads().then(() => {
      console.timeEnd('Page load time');
    });
  }, []);

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

  const handleEditModeToggle = () => {
    console.log('handleEditModeToggle called - current isEditingMode:', isEditingMode);
    setIsEditingMode(!isEditingMode);
    console.log('handleEditModeToggle - new isEditingMode:', !isEditingMode);
  };

  const handleSidebarFieldChange = (field, value) => {
    console.log('Field change:', field, value);
    setSidebarFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSidebarStageChange = async (leadId, newStageKey) => {
    try {
      const lead = leadsData.find(l => l.id === leadId);
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

      const updatedLeads = leadsData.map(lead => 
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

  const handleUpdateAllFields = async () => {
    try {
      console.log('handleUpdateAllFields called with sidebarFormData:', sidebarFormData);
      
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
        updateData.meet_datetime = `${sidebarFormData.meetingDate}T${sidebarFormData.meetingTime}:00`;
      }

      if (sidebarFormData.visitDate && sidebarFormData.visitTime) {
        updateData.visit_datetime = `${sidebarFormData.visitDate}T${sidebarFormData.visitTime}:00`;
      }

      const oldStageKey = selectedLead.stage;
      const newStageKey = stageKey;
      
      if (oldStageKey !== newStageKey) {
        const oldStageName = getStageDisplayName(oldStageKey);
        const newStageName = getStageDisplayName(newStageKey);
        await logStageChange(selectedLead.id, oldStageName, newStageName, 'sidebar edit all');
      }

      console.log('Database update data:', updateData);

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) {
        throw error;
      }

      console.log('Database update successful');

      await fetchLastActivityData();

      await fetchLeads();

      setIsEditingMode(false);

      updateCompleteLeadData(selectedLead.id, sidebarFormData, getStageScore, getStageCategory);

      console.log('Sidebar refresh completed successfully');

    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead: ' + error.message);
    }
  };

  const handleStageDropdownToggle = (e, leadId) => {
    e.stopPropagation();
    setStageDropdownOpen(stageDropdownOpen === leadId ? null : leadId);
  };

  const handleStageChangeFromDropdown = async (e, leadId, newStageKey) => {
    e.stopPropagation();
    
    try {
      const lead = leadsData.find(l => l.id === leadId);
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

      const updatedLeads = leadsData.map(lead => 
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
      
      setLeadsData(updatedLeads);
      
      setStageDropdownOpen(null);
      
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Error updating stage: ' + error.message);
    }
  };

  const handleAddLead = async (action = 'add') => {
    await fetchLeads();
  };

  const handleShowAddForm = () => {
    setShowAddForm(true);
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
  };

  const handleShowImportModal = () => {
    setShowImportModal(true);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
  };

  const handleImportComplete = async () => {
    await fetchLeads();
    setShowImportModal(false);
  };

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

  const handleSearchClick = () => {
    setShowSearch(true);
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setFilteredLeads([]);
    } else {
      const filtered = leadsData.filter(lead => 
        lead.parentsName.toLowerCase().includes(term.toLowerCase()) ||
        lead.kidsName.toLowerCase().includes(term.toLowerCase()) ||
        lead.phone.toLowerCase().includes(term.toLowerCase()) ||
        getStageDisplayName(lead.stage).toLowerCase().includes(term.toLowerCase()) ||
        lead.counsellor.toLowerCase().includes(term.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(term.toLowerCase())) ||
        (lead.occupation && lead.occupation.toLowerCase().includes(term.toLowerCase())) ||
        (lead.location && lead.location.toLowerCase().includes(term.toLowerCase())) ||
        (lead.currentSchool && lead.currentSchool.toLowerCase().includes(term.toLowerCase())) ||
        (lead.source && lead.source.toLowerCase().includes(term.toLowerCase()))
      );
      setFilteredLeads(filtered);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredLeads([]);
    setShowSearch(false);
  };

  const getDisplayLeads = () => {
    let filtered = leadsData.filter(lead => lead.category === 'Enrolled');
    
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
        (lead.source && lead.source.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return applyFilters(filtered, counsellorFilters, stageFilters, statusFilters, alertFilter, getStageDisplayName, getStageKeyFromName, getDaysSinceLastActivity);
  };

  const allFilteredLeads = getDisplayLeads();

  const enrolledLeadsCount = leadsData.filter(lead => lead.category === 'Enrolled').length;

  
  const totalPages = Math.ceil(allFilteredLeads.length / leadsPerPage);
  const startIndex = (currentPage - 1) * leadsPerPage;
  const endIndex = startIndex + leadsPerPage;
  
  const displayLeads = allFilteredLeads.slice(startIndex, endIndex);

  const formatPhoneForMobile = (phone) => {
    if (!phone) return '';
    return phone.replace('+91', '').trim();
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const PaginationControls = () => (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing {startIndex + 1} to {Math.min(endIndex, allFilteredLeads.length)} of {allFilteredLeads.length} leads
      </div>
      
      <div className="pagination-controls">
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          First
        </button>
        
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          Previous
        </button>
        
        <span className="pagination-current">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Next
        </button>
        
        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Last
        </button>
      </div>
    </div>
  );

  if (loading || settingsLoading) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="nova-main">
          <div className="loading-message">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LeftSidebar 
        activeNavItem="leads"
        activeSubmenuItem="enrolled"
        stages={stages}
        getStageCount={enrolledLeadsCount}
        stagesTitle="Enrolled Stages"
        stagesIcon={Play}
        onLogout={onLogout}
        user={user}
      />

      <div className="nova-main">
        <div className="nova-header">
          <div className="header-left">
            <div className="header-title-row">
              <h1>Enrolled Leads</h1>
            </div>
            <span className="total-count">
              Total Enrolled Leads {allFilteredLeads.length}
            </span>
            
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
            <div className="desktop-header-actions">
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search leads..."
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
                alertFilter={alertFilter}
                setCounsellorFilters={setCounsellorFilters}
                setStageFilters={setStageFilters}
                setStatusFilters={setStatusFilters}
                setAlertFilter={setAlertFilter}
                settingsData={settingsData} 
                getFieldLabel={getFieldLabel}
                getStageKeyFromName={getStageKeyFromName}
                getStageDisplayName={getStageDisplayName}
              />
              <button 
                className="import-leads-btn" 
                onClick={handleShowImportModal}
                title="Import Leads"
              >
                <Plus size={20} />
              </button>
              <button className="add-lead-btn" onClick={handleShowAddForm}>
                + Add Lead
              </button>
            </div>

            <div className="mobile-header-actions">
              <MobileHeaderDropdown
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                showFilter={showFilter}
                setShowFilter={setShowFilter}
                counsellorFilters={counsellorFilters}
                stageFilters={stageFilters}
                statusFilters={statusFilters}
                alertFilter={alertFilter}
                setCounsellorFilters={setCounsellorFilters}
                setStageFilters={setStageFilters}
                setStatusFilters={setStatusFilters}
                setAlertFilter={setAlertFilter}
                settingsData={settingsData}
                getFieldLabel={getFieldLabel}
                getStageKeyFromName={getStageKeyFromName}
                getStageDisplayName={getStageDisplayName}
                onShowImportModal={handleShowImportModal}
                onShowAddForm={handleShowAddForm}
                FilterButton={FilterButton}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} /> Error: {error}
          </div>
        )}

        {totalPages > 1 && <PaginationControls />}

        <div className="nova-table-container">
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
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {displayLeads.length > 0 ? (
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
                    <td>{lead.grade}</td>
                    <td>
                      <div className="stage-dropdown-container" style={{ position: 'relative', width: '100%' }}>
                        <div 
                          className="stage-badge stage-dropdown-trigger" 
                          style={{ 
                            backgroundColor: getStageColorFromSettings(lead.stage), 
                            color: '#333',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: 'max-content',
                            minWidth: '140px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}
                          onClick={(e) => handleStageDropdownToggle(e, lead.id)}
                        >
                          <span style={{ fontWeight: '600' }}>{getStageDisplayName(lead.stage)}</span>
                          <ChevronDown 
                            size={14} 
                            style={{ 
                              flexShrink: 0,
                              transition: 'transform 0.2s ease',
                              transform: stageDropdownOpen === lead.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              marginLeft: '8px'
                            }} 
                          />
                        </div>
                        
                        {stageDropdownOpen === lead.id && (
                          <div className="stage-dropdown-menu" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 70,
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            maxHeight: '380px',
                            overflowY: 'auto',
                            marginTop: '2px',
                            minWidth: '150px',
                            width: 'max-content'
                          }}>
                            {stages.map((stage, index) => (
                              <div
                                key={stage.value}
                                className="stage-dropdown-item"
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  backgroundColor: 'white',
                                  color: '#333',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  borderBottom: index < stages.length - 1 ? '1px solid #f3f4f6' : 'none',
                                  transition: 'all 0.15s ease',
                                  whiteSpace: 'nowrap'
                                }}
                                onClick={(e) => handleStageChangeFromDropdown(e, lead.id, stage.value)}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f8f9fa';
                                  e.target.style.transform = 'translateX(2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'white';
                                  e.target.style.transform = 'translateX(0px)';
                                }}
                              >
                                <span 
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: stage.color,
                                    border: '1px solid rgba(0,0,0,0.15)',
                                    flexShrink: 0
                                  }}
                                ></span>
                                <span style={{ flex: 1 }}>{stage.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td>
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
                      {shouldShowAlert(lead.id) && (
                        <div className="alert-badge">
                          {getDaysSinceLastActivity(lead.id)}D
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-data">
                    {searchTerm 
                      ? 'No results found for your search.' 
                      : 'No Enrolled leads available. Enrolled leads will appear here when their status changes to "Enrolled".'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && <PaginationControls />}
      </div>

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
        onRefreshSingleLead={refreshSingleLead}
        getStageColor={getStageColorFromSettings}
        getCounsellorInitials={getCounsellorInitials}
        getScoreFromStage={getStageScore}
        getCategoryFromStage={getStageCategory}
      />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        selectedLeads={selectedLeads}
        leadsData={leadsData}
      />

      {showAddForm && (
        <AddLeadForm
          isOpen={showAddForm}
          onClose={handleCloseAddForm}
          onSubmit={handleAddLead}
          existingLeads={leadsData}
          settingsData={settingsData}
        />
      )}

      {showImportModal && (
        <ImportLeadsModal
          isOpen={showImportModal}
          onClose={handleCloseImportModal}
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default EnrolledLeads;