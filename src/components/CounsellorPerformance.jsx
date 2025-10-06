import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import { 
  GraduationCap, 
  Trophy,
  Users,
  BarChart3,
  Loader2
} from 'lucide-react';
import LeftSidebar from './LeftSidebar';

// Import your custom icons
import meetingsDoneIcon from '../assets/icons/meetings-done.png';
import visitsDoneIcon from '../assets/icons/visits-done.png';
import registeredIcon from '../assets/icons/registered.png';
import enrolledIcon from '../assets/icons/enrolled.png';
import topPerformerIcon from '../assets/icons/top-performer.png';

const CounsellorPerformance = ({ onLogout, user }) => {
  // ← Use settings data context with stage_key support
  const { 
    settingsData, 
    getFieldLabel,
    getStageInfo,
    getStageColor: contextGetStageColor, 
    getStageCategory: contextGetStageCategory,
    getStageKeyFromName,
    getStageNameFromKey,
    stageKeyToDataMapping,
    loading: settingsLoading 
  } = useSettingsData();

  // ← OPTION 2: Direct data fetching - completely independent of LeadStateProvider
  const [rawLeadsData, setRawLeadsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: '',
    isActive: false
  });
  const [selectedMetric, setSelectedMetric] = useState('admission');
  
  // NEW: Mobile navigation state
  const [isMobile, setIsMobile] = useState(false);
  const [currentBarIndex, setCurrentBarIndex] = useState(0);

  // ← Get dynamic stages with stage_key support
  const stages = useMemo(() => {
    return settingsData.stages.map(stage => ({
      value: stage.stage_key || stage.name,
      label: stage.name,
      color: stage.color || '#B3D7FF',
      score: stage.score || 10,
      category: stage.status || 'New'
    }));
  }, [settingsData.stages]);

  // NEW: Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ← Stage key conversion functions
  const getLeadStageKey = (leadStageValue) => {
    // If the lead already has a stage_key, return it
    if (stageKeyToDataMapping[leadStageValue]) {
      return leadStageValue;
    }
    
    // Otherwise, try to convert stage name to stage_key
    const stageKey = getStageKeyFromName(leadStageValue);
    return stageKey || leadStageValue; // fallback to original value
  };

  const getLeadStageDisplayName = (leadStageValue) => {
    // If it's a stage_key, get the display name
    if (stageKeyToDataMapping[leadStageValue]) {
      return getStageNameFromKey(leadStageValue);
    }
    
    // Otherwise, it's probably already a stage name
    return leadStageValue;
  };

  // ← Convert database record to UI format with stage_key support
  const convertDatabaseToUI = (dbRecord) => {
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

    // ← Handle stage value with current settings context
    const stageValue = dbRecord.stage;
    const stageKey = getLeadStageKey(stageValue);
    const displayName = getLeadStageDisplayName(stageValue);

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
      source: dbRecord.source || (settingsData?.sources?.[0]?.name || 'Instagram'),
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

  // ← Process leads data with current settings - recomputed when settings change
  const leadsData = useMemo(() => {
    console.log('=== PROCESSING COUNSELLOR PERFORMANCE LEADS DATA ===');
    console.log('Raw leads count:', rawLeadsData.length);
    console.log('Settings stages:', settingsData.stages.length);
    
    if (!rawLeadsData.length || !settingsData.stages.length) {
      return [];
    }

    const processedData = rawLeadsData.map(convertDatabaseToUI);
    console.log('Processed leads count:', processedData.length);
    return processedData;
  }, [rawLeadsData, settingsData, stageKeyToDataMapping, getLeadStageKey, getLeadStageDisplayName]);

  // ← OPTION 2: Direct data fetching - independent of context
  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING ALL LEADS FOR COUNSELLOR PERFORMANCE ===');
      
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      console.log('Fetched leads count:', data.length);
      setRawLeadsData(data);
    } catch (error) {
      console.error('Error fetching leads for counsellor performance:', error);
    } finally {
      setLoading(false);
    }
  };

  // ← Fetch data on component mount
  useEffect(() => {
    fetchLeads();
  }, []);

  // Get current date for max date validation
  const currentDate = new Date().toISOString().split('T')[0];

  // ← Get all available stage keys and names dynamically from settings
  const availableStages = useMemo(() => {
    console.log('=== AVAILABLE STAGES FROM SETTINGS ===');
    console.log('Settings stages:', settingsData.stages);
    
    const stageList = settingsData.stages.map(stage => ({
      key: stage.stage_key || stage.name,
      name: stage.name,
      color: stage.color,
      score: stage.score,
      category: stage.status
    }));
    
    console.log('Available stage list:', stageList);
    return stageList;
  }, [settingsData.stages]);

  // ← Filter to only the 4 specific stages we want to track
  const targetStageKeys = ['meetingDone', 'visitDone', 'registered', 'admission'];
  const performanceStages = useMemo(() => {
    const filtered = availableStages.filter(stage => targetStageKeys.includes(stage.key));
    console.log('=== PERFORMANCE STAGES (FILTERED) ===');
    console.log('Target stage keys:', targetStageKeys);
    console.log('Filtered stages:', filtered);
    return filtered;
  }, [availableStages]);

  // ← Set default selected metric to admission
  useEffect(() => {
    if (performanceStages.length > 0 && !selectedMetric) {
      setSelectedMetric('admission');
    }
  }, [performanceStages, selectedMetric]);

  // Filter leads by date range
  const getFilteredLeadsByDate = useMemo(() => {
    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      return [];
    }

    if (!dateRange.isActive || !dateRange.fromDate || !dateRange.toDate) {
      return leadsData;
    }
    
    return leadsData.filter(lead => {
      try {
        const leadDate = new Date(lead.createdTime?.replace(/(\d{2}) (\w{3}) (\d{4})/, '$2 $1, $3'));
        const fromDate = new Date(dateRange.fromDate);
        const toDate = new Date(dateRange.toDate);
        toDate.setHours(23, 59, 59, 999);
        
        return leadDate >= fromDate && leadDate <= toDate;
      } catch (error) {
        console.error('Error parsing lead date:', lead.createdTime, error);
        return true;
      }
    });
  }, [leadsData, dateRange]);

  // ← Calculate counsellor performance using the 4 specific stages with proper stage keys
  const counsellorData = useMemo(() => {
    const filteredLeads = getFilteredLeadsByDate;
    
    console.log('=== COUNSELLOR PERFORMANCE CALCULATION ===');
    console.log('Filtered leads count:', filteredLeads.length);
    console.log('Performance stages:', performanceStages);
    
    const counsellorStats = filteredLeads.reduce((acc, lead) => {
      const counsellor = lead.counsellor || 'Unknown';
      
      if (!acc[counsellor]) {
        acc[counsellor] = {
          totalLeads: 0
        };
        
        // ← Initialize counters for only the 4 performance stages
        performanceStages.forEach(stage => {
          acc[counsellor][stage.key] = 0;
        });
      }
      
      acc[counsellor].totalLeads++;
      
      // ← Use stage_key logic
      const leadStageKey = getLeadStageKey(lead.stage);
      
      console.log(`Lead ${lead.id} - Stage Key: ${leadStageKey}, Display: ${lead.stageDisplayName}`);
      
      // ← Check only the 4 performance stages
      performanceStages.forEach(stage => {
        if (leadStageKey === stage.key) {
          acc[counsellor][stage.key]++;
          console.log(`  ✅ ${stage.name} for ${counsellor}`);
        }
      });
      
      return acc;
    }, {});

    console.log('Final counsellor stats:', counsellorStats);

    // ← Calculate conversion rates based on admission stage specifically
    return Object.entries(counsellorStats).map(([name, stats]) => ({
      name,
      ...stats,
      conversionRate: stats.totalLeads > 0 ? ((stats.admission || 0) / stats.totalLeads * 100).toFixed(0) : 0
    })).filter(counsellor => {
      // Only show counsellors that exist in settings
      const validCounsellors = settingsData?.counsellors?.map(c => c.name) || [];
      return validCounsellors.includes(counsellor.name);
    }).sort((a, b) => b.conversionRate - a.conversionRate);
  }, [getFilteredLeadsByDate, performanceStages, getLeadStageKey, settingsData?.counsellors]);

  // Get top performer
  const topPerformer = useMemo(() => {
    if (counsellorData.length === 0) return null;
    return counsellorData[0];
  }, [counsellorData]);

  // Prepare bar chart data with mobile support
  const barChartData = useMemo(() => {
    const fullData = counsellorData.map(counsellor => ({
      name: counsellor.name.split(' ')[0],
      value: counsellor[selectedMetric] || 0,
      fullName: counsellor.name,
      metric: selectedMetric
    }));
    
    // On mobile, show only one bar at a time
    if (isMobile && fullData.length > 0) {
      return [fullData[currentBarIndex] || fullData[0]];
    }
    
    return fullData;
  }, [counsellorData, selectedMetric, isMobile, currentBarIndex]);

  // NEW: Navigation functions for mobile
  const goToPreviousBar = () => {
    setCurrentBarIndex(prev => 
      prev > 0 ? prev - 1 : counsellorData.length - 1
    );
  };

  const goToNextBar = () => {
    setCurrentBarIndex(prev => 
      prev < counsellorData.length - 1 ? prev + 1 : 0
    );
  };

  // Reset current bar index when counsellor data changes
  useEffect(() => {
    if (currentBarIndex >= counsellorData.length && counsellorData.length > 0) {
      setCurrentBarIndex(0);
    }
  }, [counsellorData.length, currentBarIndex]);

  // ← Count function for sidebar using stage_key
  const getStageCount = (stageName) => {
    const stageKey = getStageKeyFromName(stageName);
    return leadsData.filter(lead => {
      const leadStageKey = getLeadStageKey(lead.stage);
      return leadStageKey === stageKey || lead.stage === stageName;
    }).length;
  };

  // ← Get stage name for display from stage key
  const getStageDisplayName = (stageKey) => {
    const stage = performanceStages.find(s => s.key === stageKey);
    return stage ? stage.name : stageKey;
  };

  // ← Loading check for both data and settings
  if (loading || settingsLoading) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <LeftSidebar 
          activeNavItem="counsellor"
          activeSubmenuItem=""
          stages={stages}
          getStageCount={getStageCount}
          stagesTitle="Performance"
          stagesIcon={BarChart3}
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
            Loading counsellor performance...
          </div>
        </div>
      </div>
    );
  }

  // Handle date filter submission
  const handleSubmit = () => {
    if (dateRange.fromDate && dateRange.toDate) {
      if (new Date(dateRange.fromDate) <= new Date(dateRange.toDate)) {
        setDateRange(prev => ({ ...prev, isActive: true }));
      } else {
        alert('From date must be before To date');
      }
    } else {
      alert('Please select both From and To dates');
    }
  };

  // Handle clear filter
  const handleClear = () => {
    setDateRange({ fromDate: '', toDate: '', isActive: false });
  };

  // Get counsellor initials
  const getCounsellorInitials = (fullName) => {
    if (!fullName) return 'NA';
    const words = fullName.trim().split(' ');
    const firstTwoWords = words.slice(0, 2);
    return firstTwoWords.map(word => word.charAt(0).toUpperCase()).join('');
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const stageName = getStageDisplayName(data.metric);
      return (
        <div className="dashboard-pie-tooltip">
          <p className="dashboard-pie-tooltip-title">{data.fullName}</p>
          <p className="dashboard-pie-tooltip-value">{data.value} {stageName}</p>
        </div>
      );
    }
    return null;
  };

  // Show loading state if no data
  if (!leadsData || leadsData.length === 0) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <LeftSidebar 
          activeNavItem="counsellor"
          activeSubmenuItem=""
          stages={stages}
          getStageCount={getStageCount}
          stagesTitle="Performance"
          stagesIcon={BarChart3}
          onLogout={onLogout}
          user={user}
        />
        <div className="nova-main">
          <div className="dashboard-no-data">
            <div className="dashboard-no-data-title">No leads data available</div>
            <div className="dashboard-no-data-subtitle">
              Make sure your leads are properly loaded from the database
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Sidebar */}
      <LeftSidebar 
        activeNavItem="counsellor"
        activeSubmenuItem=""
        stages={stages}
        getStageCount={getStageCount}
        stagesTitle="Performance"
        stagesIcon={BarChart3}
        onLogout={onLogout}
        user={user}
      />

      {/* Main Content */}
      <div className="nova-main">
        <div className="dashboard-overview">
          {/* Header */}
          <div className="dashboard-header">
            <h2 className="dashboard-title">
              {getFieldLabel('counsellor')} Performance
            </h2>
          </div>

          {/* Date Filter Section */}
          <div className="dashboard-date-filter">
            <span className="dashboard-date-filter-label">Select Date</span>
            
            <div className="dashboard-date-input-group">
              <label className="dashboard-date-label">From</label>
              <input
                type="date"
                value={dateRange.fromDate}
                max={currentDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
                className="dashboard-date-input"
              />
            </div>

            <div className="dashboard-date-input-group">
              <label className="dashboard-date-label">To</label>
              <input
                type="date"
                value={dateRange.toDate}
                max={currentDate}
                min={dateRange.fromDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
                className="dashboard-date-input"
              />
            </div>

            <button onClick={handleSubmit} className="dashboard-submit-btn">
              Submit
            </button>

            {dateRange.isActive && (
              <button onClick={handleClear} className="dashboard-clear-btn">
                Clear Filter
              </button>
            )}
          </div>

          {/* Conversion Insights */}
          <div className="counsellor-insights-section">
            <h3 className="counsellor-insights-title">Conversion Insights</h3>
            
            <div className="counsellor-cards-grid">
              {counsellorData.length > 0 ? (
                counsellorData.map((counsellor, index) => (
                  <div key={index} className="counsellor-card">
                    <div className="counsellor-card-header">
                      <h4 className="counsellor-name">{counsellor.name}</h4>
                    </div>
                    
                    <div className="counsellor-metrics">
                      {/* ← Show only the 4 performance stages */}
                      {performanceStages.map((stage, stageIndex) => (
                        <div key={stage.key} className="counsellor-metric">
                          <div className="counsellor-metric-icon">
                            <img 
                              src={stage.key === 'meetingDone' ? meetingsDoneIcon :
                                   stage.key === 'visitDone' ? visitsDoneIcon : 
                                   stage.key === 'registered' ? registeredIcon : 
                                   enrolledIcon} 
                              alt={stage.name} 
                              style={{ width: '16px', height: '16px' }}
                            />
                          </div>
                          <span className="counsellor-metric-label">{stage.name}</span>
                          <span className="counsellor-metric-value">{counsellor[stage.key] || 0}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="counsellor-conversion">
                      <span className="counsellor-conversion-label">Conversion %</span>
                      <span className="counsellor-conversion-value">{counsellor.conversionRate}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="counsellor-no-data">
                  No counsellor data available for the selected period
                </div>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="counsellor-charts-section">
            {/* Success Rate Chart - WITH MOBILE SUPPORT */}
            <div className="counsellor-chart-container">
              <h3 className="counsellor-chart-title">
                Success Rate by {getFieldLabel('counsellor')}
              </h3>

              <div className="counsellor-chart-controls">
                <select 
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="counsellor-metric-dropdown"
                >
                  {/* ← Dynamic options based on the 4 performance stages */}
                  {performanceStages.map(stage => (
                    <option key={stage.key} value={stage.key}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {barChartData.length > 0 ? (
                <>
                  {/* NEW: Mobile Navigation Controls */}
                  {isMobile && counsellorData.length > 1 && (
                    <div className="mobile-chart-navigation">
                      <button 
                        onClick={goToPreviousBar}
                        className="mobile-nav-btn"
                        aria-label="Previous counsellor"
                      >
                        ←
                      </button>
                      
                      <div className="mobile-chart-info">
                        <span className="mobile-chart-counter">
                          {currentBarIndex + 1} of {counsellorData.length}
                        </span>
                        <span className="mobile-chart-name">
                          {counsellorData[currentBarIndex]?.name || 'N/A'}
                        </span>
                      </div>
                      
                      <button 
                        onClick={goToNextBar}
                        className="mobile-nav-btn"
                        aria-label="Next counsellor"
                      >
                        →
                      </button>
                    </div>
                  )}
                  
                  <div className="counsellor-bar-chart">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <BarChart 
                        data={barChartData} 
                        margin={{ 
                          top: 20, 
                          right: 30, 
                          left: 20, 
                          bottom: isMobile ? 40 : 5 
                        }}
                      >
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          style={{ 
                            fontSize: isMobile ? '14px' : '12px', 
                            fontWeight: '500' 
                          }}
                          interval={0} // Show all labels
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          style={{ fontSize: '12px' }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#3B82F6" 
                          radius={[4, 4, 0, 0]}
                          label={{ 
                            position: 'top', 
                            fontSize: isMobile ? 14 : 12, 
                            fontWeight: 'bold' 
                          }}
                        />
                        <Tooltip content={<BarTooltip />} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="counsellor-chart-footer">
                    Currently viewing: {getStageDisplayName(selectedMetric)} this month.
                    {isMobile && counsellorData.length > 1 && (
                      <div className="mobile-swipe-hint">
                        Use navigation buttons to view other counsellors
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="counsellor-chart-empty">
                  No data available for chart
                </div>
              )}
            </div>

            {/* Top Performer */}
            <div className="counsellor-top-performer">
              <h3 className="counsellor-top-performer-title">Top Performer</h3>
              
              {topPerformer ? (
                <div className="counsellor-top-performer-content">
                  <div className="counsellor-trophy-icon">
                    <img 
                        src={topPerformerIcon}
                        alt="Trophy" 
                        style={{ width: '108px', height: '108px' }}
                        />
                  </div>
                  
                  <div className="counsellor-top-performer-info">
                    <div className="counsellor-top-performer-avatar">
                      {getCounsellorInitials(topPerformer.name)}
                    </div>
                    <div className="counsellor-top-performer-name">
                      {topPerformer.name}
                    </div>
                  </div>
                  
                  <div className="counsellor-top-performer-stats">
                    {/* ← Show admission count and conversion rate */}
                    <div className="counsellor-top-stat">
                      <div className="counsellor-top-stat-icon">
                        <img 
                          src={enrolledIcon} 
                          alt="Admission" 
                          style={{ width: '16px', height: '16px' }}
                        />
                      </div>
                      <span className="counsellor-top-stat-label">
                        {getStageDisplayName('admission')}
                      </span>
                      <span className="counsellor-top-stat-value">{topPerformer.admission || 0}</span>
                    </div>
                    
                    <div className="counsellor-top-stat">
                      <div className="counsellor-top-stat-icon">
                        <Users size={16} color="#F59E0B" />
                      </div>
                      <span className="counsellor-top-stat-label">Conversion</span>
                      <span className="counsellor-top-stat-value">{topPerformer.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="counsellor-top-performer-empty">
                  No performance data available
                </div>
              )}
            </div>
          </div>

          {/* Date Range Info */}
          {dateRange.isActive && (
            <div className="dashboard-date-info">
              Showing data from {dateRange.fromDate} to {dateRange.toDate}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard-overview {
          padding: 20px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .dashboard-title {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .dashboard-date-filter {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .counsellor-insights-section {
          margin: 24px 0;
        }

        .counsellor-insights-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #1f2937;
        }

        .counsellor-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .counsellor-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .counsellor-card-header {
          margin-bottom: 16px;
        }

        .counsellor-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .counsellor-metrics {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .counsellor-metric {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .counsellor-metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .counsellor-metric-icon img {
          width: 16px;
          height: 16px;
          object-fit: contain;
          filter: none;
        }

        .counsellor-metric-label {
          flex: 1;
          font-size: 14px;
          color: #6b7280;
        }

        .counsellor-metric-value {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          min-width: 24px;
          text-align: right;
        }

        .counsellor-conversion {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .counsellor-conversion-label {
          font-size: 14px;
          color: #6b7280;
        }

        .counsellor-conversion-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .counsellor-charts-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin: 24px 0;
        }

        .counsellor-chart-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .counsellor-chart-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #1f2937;
        }

        .counsellor-chart-controls {
          margin-bottom: 16px;
        }

        .counsellor-metric-dropdown {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          color: #374151;
          cursor: pointer;
        }

        .counsellor-metric-dropdown:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* NEW: Mobile navigation styles */
        .mobile-chart-navigation {
          display: none;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .mobile-nav-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .mobile-nav-btn:hover {
          background: #2563eb;
        }

        .mobile-nav-btn:active {
          background: #1d4ed8;
        }

        .mobile-chart-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .mobile-chart-counter {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .mobile-chart-name {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .mobile-swipe-hint {
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
          margin-top: 8px;
        }

        .counsellor-bar-chart {
          height: 300px;
          margin-bottom: 16px;
        }

        .counsellor-chart-footer {
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }

        .counsellor-chart-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #6b7280;
        }

        .counsellor-top-performer {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .counsellor-top-performer-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1f2937;
        }

        .counsellor-top-performer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .counsellor-trophy-icon {
          margin-bottom: 16px;
        }

        .counsellor-top-performer-info {
          margin-bottom: 20px;
        }

        .counsellor-top-performer-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #374151;
          margin: 0 auto 8px;
        }

        .counsellor-top-performer-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .counsellor-top-performer-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .counsellor-top-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .counsellor-top-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .counsellor-top-stat-icon img {
          width: 16px;
          height: 16px;
          object-fit: contain;
          filter: none;
        }

        .counsellor-top-stat-label {
          flex: 1;
          font-size: 14px;
          color: #6b7280;
        }

        .counsellor-top-stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .counsellor-no-data,
        .counsellor-top-performer-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 120px;
          color: #6b7280;
          font-size: 14px;
        }

        .dashboard-date-filter-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .dashboard-date-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dashboard-date-label {
          font-size: 12px;
          color: #6b7280;
        }

        .dashboard-date-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .dashboard-submit-btn,
        .dashboard-clear-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dashboard-submit-btn {
          background: #3b82f6;
          color: white;
        }

        .dashboard-submit-btn:hover {
          background: #2563eb;
        }

        .dashboard-clear-btn {
          background: #ef4444;
          color: white;
        }

        .dashboard-clear-btn:hover {
          background: #dc2626;
        }

        .dashboard-date-info {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin-top: 16px;
          padding: 12px;
          background: #f0f9ff;
          border-radius: 6px;
          border: 1px solid #bae6fd;
        }

        .dashboard-no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          text-align: center;
        }

        .dashboard-no-data-title {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .dashboard-no-data-subtitle {
          font-size: 14px;
          color: #6b7280;
        }

        .dashboard-pie-tooltip {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .dashboard-pie-tooltip-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .dashboard-pie-tooltip-value {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .counsellor-charts-section {
            grid-template-columns: 1fr;
          }
          
          .counsellor-cards-grid {
            grid-template-columns: 1fr;
          }
          
          .counsellor-bar-chart {
            height: 250px;
            margin-bottom: 8px;
          }
          
          .counsellor-chart-container {
            padding: 16px;
          }
          
          .mobile-chart-navigation {
            display: flex;
          }

          .dashboard-date-filter {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .dashboard-date-filter .dashboard-date-input-group {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }

          .dashboard-date-label {
            min-width: 40px;
          }

          .dashboard-overview {
            padding: 16px;
          }

          .dashboard-title {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .counsellor-card {
            padding: 12px;
          }

          .counsellor-name {
            font-size: 14px;
          }

          .mobile-nav-btn {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .mobile-chart-name {
            font-size: 13px;
          }

          .mobile-chart-counter {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default CounsellorPerformance;