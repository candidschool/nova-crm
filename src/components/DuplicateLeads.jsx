//Duplicated leads checknows
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import LeftSidebar from './LeftSidebar';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { 
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trash2,
  Users,
  Phone,
  RefreshCw
} from 'lucide-react';

const DuplicateLeads = ({ onLogout, user }) => {
  const { 
    settingsData, 
    getFieldLabel,
    getStageColor,
    getStageKeyFromName,
    getStageNameFromKey,
    stageKeyToDataMapping,
    loading: settingsLoading 
  } = useSettingsData();

  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const stages = settingsData.stages.map(stage => ({
    value: stage.stage_key || stage.name,
    label: stage.name,
    color: stage.color || '#B3D7FF',
    score: stage.score || 10,
    category: stage.category || 'New'
  }));

  const getStageDisplayName = (stageValue) => {
    if (stageKeyToDataMapping[stageValue]) {
      return getStageNameFromKey(stageValue);
    }
    return stageValue;
  };

  const getStageColorFromSettings = (stageValue) => {
    const stageKey = stageKeyToDataMapping[stageValue] ? stageValue : getStageKeyFromName(stageValue);
    return getStageColor(stageKey);
  };

  // Normalize phone number function
  const normalizePhone = (phone) => {
    if (!phone) return null;
    // Remove all non-numeric characters and leading +91
    return phone.toString().replace(/\D/g, '').replace(/^91/, '');
  };

  // Fetch duplicate leads
  const fetchDuplicateLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all leads using pagination to bypass limits
      let allLeads = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      console.log('Starting to fetch all leads with pagination...');

      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from(TABLE_NAMES.LEADS)
          .select('*')
          .order('phone', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError) throw pageError;

        console.log(`Fetched page ${page + 1}: ${pageData.length} leads`);
        
        if (pageData.length > 0) {
          allLeads = [...allLeads, ...pageData];
          page++;
        }
        
        if (pageData.length < pageSize) {
          hasMore = false;
        }
      }

      const leadsError = null;

      if (leadsError) throw leadsError;

      console.log('Total leads fetched:', allLeads.length);

      // Group by normalized phone number
      const phoneGroups = {};
      const skippedLeads = [];

      allLeads.forEach(lead => {
        const normalizedPhone = normalizePhone(lead.phone);
        
        // Skip leads with no phone number
        if (!normalizedPhone) {
          skippedLeads.push(lead.id);
          return;
        }

        if (!phoneGroups[normalizedPhone]) {
          phoneGroups[normalizedPhone] = [];
        }
        
        phoneGroups[normalizedPhone].push({
          id: lead.id,
          parentsName: lead.parents_name || '',
          kidsName: lead.kids_name || '',
          phone: lead.phone,
          secondPhone: lead.second_phone || '',
          email: lead.email || '',
          location: lead.location || '',
          grade: lead.grade || '',
          stage: lead.stage,
          counsellor: lead.counsellor || '',
          source: lead.source || '',
          category: lead.category || '',
          occupation: lead.occupation || '',
          currentSchool: lead.current_school || '',
          createdTime: new Date(lead.created_at).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      });

      // Debug logging
      console.log('Phone groups created:', Object.keys(phoneGroups).length);
      console.log('Skipped leads (no phone):', skippedLeads.length);

      // Filter only duplicates (phone number appears more than once)
      const duplicates = Object.entries(phoneGroups)
        .filter(([phone, leads]) => {
          const isDuplicate = leads.length > 1;
          if (isDuplicate) {
            console.log(`Found duplicate group for phone ${phone}:`, leads.length, 'leads');
          }
          return isDuplicate;
        })
        .map(([phone, leads]) => ({
          phone: leads[0].phone, // Use original phone format from first lead
          normalizedPhone: phone,
          leads,
          count: leads.length
        }))
        .sort((a, b) => b.count - a.count); // Sort by count (highest first)

      console.log('Total duplicate groups found:', duplicates.length);
      console.log('Total duplicate leads:', duplicates.reduce((sum, g) => sum + g.count, 0));

      setDuplicateGroups(duplicates);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching duplicate leads:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicateLeads();
  }, []);

  // Toggle group expansion
  const toggleGroup = (phone) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(phone)) {
      newExpanded.delete(phone);
    } else {
      newExpanded.add(phone);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand all groups
  const expandAll = () => {
    const allPhones = duplicateGroups.map(g => g.phone);
    setExpandedGroups(new Set(allPhones));
  };

  // Collapse all groups
  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Handle individual checkbox
  const handleIndividualCheckboxChange = (leadId, checked) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  // Handle group checkbox (select all in group)
  const handleGroupCheckboxChange = (leads, checked) => {
    const leadIds = leads.map(l => l.id);
    if (checked) {
      setSelectedLeads(prev => [...new Set([...prev, ...leadIds])]);
    } else {
      setSelectedLeads(prev => prev.filter(id => !leadIds.includes(id)));
    }
  };

  // Check if all leads in group are selected
  const isGroupSelected = (leads) => {
    return leads.every(lead => selectedLeads.includes(lead.id));
  };

  // Handle delete
  const handleDeleteClick = () => {
    if (selectedLeads.length > 0) {
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .delete()
        .in('id', selectedLeads);

      if (error) throw error;

      await fetchDuplicateLeads();
      setSelectedLeads([]);
      setShowDeleteDialog(false);
      alert(`Successfully deleted ${selectedLeads.length} lead(s)`);
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

  // Search filter
  const getFilteredGroups = () => {
    if (!searchTerm.trim()) return duplicateGroups;

    return duplicateGroups.filter(group => {
      const searchLower = searchTerm.toLowerCase();
      return (
        group.phone.includes(searchTerm) ||
        group.normalizedPhone.includes(searchTerm.replace(/\D/g, '')) ||
        group.leads.some(lead => 
          lead.parentsName.toLowerCase().includes(searchLower) ||
          lead.kidsName.toLowerCase().includes(searchLower) ||
          lead.email.toLowerCase().includes(searchLower)
        )
      );
    });
  };

  const filteredGroups = getFilteredGroups();

  // Calculate stats
  const totalDuplicateLeads = duplicateGroups.reduce((sum, group) => sum + group.count, 0);
  const totalUniquePhones = duplicateGroups.length;

  const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';
    return phone.replace('+91', '');
  };

  const getStageCount = () => 0;

  if (loading || settingsLoading) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <LeftSidebar 
          activeNavItem="duplicates"
          stages={stages}
          getStageCount={getStageCount}
          stagesTitle="Stages"
          stagesIcon={Users}
          onLogout={onLogout}
          user={user}
        />
        <div className="nova-main">
          <div className="loading-message">
            <Loader2 size={16} className="animate-spin" /> Loading duplicate leads...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LeftSidebar 
        activeNavItem="duplicates"
        stages={stages}
        getStageCount={getStageCount}
        stagesTitle="Stages"
        stagesIcon={Users}
        onLogout={onLogout}
        user={user}
      />

      <div className="nova-main">
        <div className="nova-header">
          <div className="header-left">
            <div className="header-title-row">
              <h1>
                <Phone size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Duplicate Leads
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="total-count">
                {totalDuplicateLeads} Duplicate Leads
              </span>
              <span className="total-count" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                {totalUniquePhones} Unique Phone Numbers
              </span>
            </div>

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
                  placeholder="Search by phone, name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <button 
                onClick={fetchDuplicateLeads}
                className="btn"
                style={{ padding: '8px 16px', fontSize: '14px' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '4px' }} />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} style={{ marginRight: '4px' }} />
                    Refresh
                  </>
                )}
              </button>
              
              <button 
                onClick={expandAll}
                className="btn"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Expand All
              </button>
              
              <button 
                onClick={collapseAll}
                className="btn"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} /> Error: {error}
          </div>
        )}

        <div className="nova-table-container" style={{ marginTop: '85px' }}>
          {filteredGroups.length > 0 ? (
            <div className="duplicate-groups-container">
              {filteredGroups.map((group, groupIndex) => {
                const isExpanded = expandedGroups.has(group.phone);
                const isSelected = isGroupSelected(group.leads);

                return (
                  <div key={group.phone} className="duplicate-group" style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    overflow: 'hidden'
                  }}>
                    {/* Group Header */}
                    <div 
                      className="duplicate-group-header"
                      style={{
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleGroup(group.phone)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleGroupCheckboxChange(group.leads, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                      />
                      
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        
                        <Phone size={18} style={{ color: '#6b7280' }} />
                        
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '16px' }}>
                            {formatPhoneForDisplay(group.phone)}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {group.count} duplicate{group.count > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        {group.count} Leads
                      </div>
                    </div>

                    {/* Group Content (Expanded) */}
                    {isExpanded && (
                      <div className="duplicate-group-content" style={{ padding: '0' }}>
                        <table className="nova-table" style={{ marginBottom: '0' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}></th>
                              <th>ID</th>
                              <th>Parent</th>
                              <th>Kid</th>
                              <th>Email</th>
                              <th>Grade</th>
                              <th>Stage</th>
                              <th>Counsellor</th>
                              <th>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.leads.map((lead, leadIndex) => (
                              <tr key={lead.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedLeads.includes(lead.id)}
                                    onChange={(e) => handleIndividualCheckboxChange(lead.id, e.target.checked)}
                                  />
                                </td>
                                <td>
                                  <div className="lead-id">{lead.id}</div>
                                </td>
                                <td>{lead.parentsName}</td>
                                <td>{lead.kidsName}</td>
                                <td>{lead.email || '-'}</td>
                                <td>{lead.grade}</td>
                                <td>
                                  <div 
                                    className="stage-badge" 
                                    style={{ 
                                      backgroundColor: getStageColorFromSettings(lead.stage), 
                                      color: '#333'
                                    }}
                                  >
                                    {getStageDisplayName(lead.stage)}
                                  </div>
                                </td>
                                <td>{lead.counsellor}</td>
                                <td style={{ fontSize: '13px', color: '#6b7280' }}>
                                  {lead.createdTime}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-data" style={{ padding: '60px 20px', textAlign: 'center' }}>
              {searchTerm ? (
                <>
                  <AlertCircle size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', color: '#6b7280' }}>
                    No duplicate leads found matching "{searchTerm}"
                  </p>
                </>
              ) : (
                <>
                  <Phone size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                  <p style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    No Duplicate Leads Found!
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    All phone numbers are unique in the system.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        selectedLeads={selectedLeads}
        leadsData={filteredGroups.flatMap(g => g.leads)}
      />
    </div>
  );
};

export default DuplicateLeads;
