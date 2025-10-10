import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import { TABLE_NAMES } from '../config/tableNames';

const OverviewDashboard = () => {
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

  // ALL STATE HOOKS FIRST
  const [leadsData, setLeadsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: '',
    isActive: false
  });

  // Generate dynamic source colors based on settings
  const generateSourceColors = useMemo(() => {
    const colors = [
      '#2A89DD', '#F6BD51', '#EE6E55', '#647BCA', '#30B2B6', 
      '#9D91CE', '#8B5CF6', '#F59E0B', '#6B7280', '#10B981',
      '#3B82F6', '#8B5A2B', '#EC4899', '#14B8A6', '#F97316'
    ];
    
    const sourceColors = {};
    
    // Get sources from settings or use defaults
    const availableSources = settingsData?.sources || [];
    
    availableSources.forEach((source, index) => {
      sourceColors[source.name] = colors[index % colors.length];
    });
    
    // Add fallback for Unknown
    sourceColors['Unknown'] = '#9D91CE';
    
    console.log('=== DYNAMIC SOURCE COLORS ===');
    console.log('Available sources from settings:', availableSources);
    console.log('Generated source colors:', sourceColors);
    
    return sourceColors;
  }, [settingsData?.sources]);

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

  const getStageColorFromSettings = (stageValue) => {
    const stageKey = getStageKeyForLead(stageValue);
    return getStageColor(stageKey);
  };

  // Convert database record to UI format with stage_key support
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
      stage: stageKey,
      stageDisplayName: displayName,
      score: dbRecord.score,
      category: dbRecord.category,
      counsellor: dbRecord.counsellor,
      offer: dbRecord.offer,
      notes: dbRecord.notes,
      email: dbRecord.email || '',
      occupation: dbRecord.occupation || '',
      source: dbRecord.source || (settingsData?.sources?.[0]?.name || 'Unknown'),
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

  // ✅ FIXED: Fetch leads function with batching to handle 4000+ leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // Fetch all leads in batches (same as LeadsTable.jsx)
      let allLeads = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      
      console.log('=== OVERVIEW DASHBOARD DATA FETCH ===');
      console.time('Total Fetch Time');
      
      while (hasMore) {
        console.log(`Fetching batch starting from ${from}...`);
        
        const { data, error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .select('*')
          .order('id', { ascending: true })
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

      console.timeEnd('Total Fetch Time');
      console.log('Total leads fetched from database:', allLeads.length);
      
      const convertedData = allLeads.map(convertDatabaseToUI);
      console.log('Converted data with stage_key:', convertedData.length);
      setLeadsData(convertedData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Get current date for max date validation
  const currentDate = new Date().toISOString().split('T')[0];

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

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const filteredLeads = getFilteredLeadsByDate;
    
    const counts = {
      allLeads: filteredLeads.length,
      warm: filteredLeads.filter(lead => lead.category === 'Warm').length,
      hot: filteredLeads.filter(lead => lead.category === 'Hot').length,
      cold: filteredLeads.filter(lead => lead.category === 'Cold').length,
      enrolled: filteredLeads.filter(lead => lead.category === 'Enrolled').length
    };
    
    return counts;
  }, [getFilteredLeadsByDate]);

  // Calculate source performance data using dynamic sources from settings
  const sourceData = useMemo(() => {
    const filteredLeads = getFilteredLeadsByDate;
    
    console.log('=== SOURCE DATA CALCULATION ===');
    console.log('Filtered leads:', filteredLeads);
    console.log('Available sources from settings:', settingsData?.sources);
    console.log('Generated source colors:', generateSourceColors);
    
    const sourceCount = filteredLeads.reduce((acc, lead) => {
      let source = lead.source;
      if (!source || source === null || source === undefined || source.trim() === '') {
        source = 'Unknown';
      }
      
      console.log(`Lead ${lead.id} has source: "${source}"`);
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    console.log('Source counts:', sourceCount);

    const data = Object.entries(sourceCount).map(([name, value]) => {
      const color = generateSourceColors[name] || '#9D91CE';
      
      console.log(`Source "${name}": ${value} leads, color: ${color}`);
      
      return {
        name: name,
        originalName: name,
        value,
        percentage: filteredLeads.length > 0 ? ((value / filteredLeads.length) * 100).toFixed(1) : 0,
        fill: color
      };
    });

    console.log('Final source data:', data);
    return data;
  }, [getFilteredLeadsByDate, generateSourceColors, settingsData?.sources]);

  // Calculate stage data with stage_key support and IMPROVED width calculation
  const stageData = useMemo(() => {
    const filteredLeads = getFilteredLeadsByDate;
    const totalLeads = filteredLeads.length;
    
    console.log('=== STAGE DATA CALCULATION ===');
    console.log('Filtered leads:', filteredLeads.length);
    console.log('Settings stages:', settingsData?.stages);
    
    const dynamicStages = settingsData?.stages?.filter(stage => stage.is_active) || [];
    
    // First pass: collect all counts
    const stagesWithCounts = dynamicStages.map(stageConfig => {
      const stageName = stageConfig.name;
      const stageKey = stageConfig.stage_key || stageName;
      
      const count = filteredLeads.filter(lead => {
        const leadStageKey = getStageKeyForLead(lead.stage);
        return leadStageKey === stageKey || lead.stage === stageName;
      }).length;
      
      return {
        stageName,
        stageKey,
        count,
        color: getStageColorFromSettings(stageKey)
      };
    });

    // Find max and min counts for better scaling
    const counts = stagesWithCounts.map(s => s.count).filter(c => c > 0);
    const maxCount = Math.max(...counts, 1);
    const minCount = Math.min(...counts.filter(c => c > 0), 1);
    
    console.log(`Max count: ${maxCount}, Min count: ${minCount}`);

    // Second pass: calculate widths with improved scaling
    return stagesWithCounts.map(({ stageName, stageKey, count, color }) => {
      console.log(`Processing stage: ${stageName} (key: ${stageKey}), count: ${count}`);
      
      const minWidth = 120;
      const maxWidth = 550;
      
      let widthPx;
      
      if (count === 0) {
        widthPx = minWidth;
      } else if (maxCount === minCount) {
        // All stages have same count
        widthPx = maxWidth / 2;
      } else {
        // Use logarithmic scale for better visual differentiation when there's huge variance
        const logCount = Math.log10(count + 1);
        const logMax = Math.log10(maxCount + 1);
        const logMin = Math.log10(minCount + 1);
        
        // Normalize to 0-1 range using log scale
        const normalizedValue = (logCount - logMin) / (logMax - logMin);
        
        // Apply to width range
        widthPx = minWidth + (normalizedValue * (maxWidth - minWidth));
        
        console.log(`  Log scale: ${logCount.toFixed(2)} / ${logMax.toFixed(2)} = ${normalizedValue.toFixed(2)} → ${widthPx.toFixed(2)}px`);
      }

      const percentage = totalLeads > 0 ? (count / totalLeads) * 100 : 0;

      return {
        stage: stageName,
        stageKey: stageKey,
        count,
        widthPx,
        percentage: percentage.toFixed(1),
        color
      };
    });
  }, [getFilteredLeadsByDate, settingsData?.stages, getStageColorFromSettings, getStageKeyForLead]);

  if (loading || settingsLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading dashboard...
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

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="dashboard-pie-tooltip">
          <p className="dashboard-pie-tooltip-title">{data.name}</p>
          <p className="dashboard-pie-tooltip-value">{data.value} leads ({data.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  // Show loading state if no data
  if (!leadsData || leadsData.length === 0) {
    return (
      <div className="dashboard-no-data">
        <div className="dashboard-no-data-title">No leads data available</div>
        <div className="dashboard-no-data-subtitle">
          Make sure your leads are properly loaded from the database
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      {/* Overview Header */}
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard Overview</h2>
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

      {/* Category Cards */}
      <div className="dashboard-category-grid">
        <div className="dashboard-category-card">
          <div className="dashboard-category-label">All Leads</div>
          <div className="dashboard-category-count dashboard-category-count-all">
            {categoryCounts.allLeads}
          </div>
        </div>

        <div className="dashboard-category-card">
          <div className="dashboard-category-label">Warm</div>
          <div className="dashboard-category-count dashboard-category-count-warm">
            {categoryCounts.warm}
          </div>
        </div>

        <div className="dashboard-category-card">
          <div className="dashboard-category-label">Hot</div>
          <div className="dashboard-category-count dashboard-category-count-hot">
            {categoryCounts.hot}
          </div>
        </div>

        <div className="dashboard-category-card">
          <div className="dashboard-category-label">Cold</div>
          <div className="dashboard-category-count dashboard-category-count-cold">
            {categoryCounts.cold}
          </div>
        </div>

        <div className="dashboard-category-card">
          <div className="dashboard-category-label">Enrolled</div>
          <div className="dashboard-category-count dashboard-category-count-enrolled">
            {categoryCounts.enrolled}
          </div>
        </div>
      </div>

      {/* Charts Section - Two Columns */}
      <div className="dashboard-charts-grid">
        {/* Source Performance Chart */}
        <div className="dashboard-chart-container">
          <h3 className="dashboard-chart-title">
            {getFieldLabel('source') || 'Source'} Performance
          </h3>
          
          {sourceData.length > 0 ? (
            <>
              <div className="dashboard-pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={100}
                      paddingAngle={1}
                      dataKey="value"
                      label={({ name, percentage }) => {
                        if (parseFloat(percentage) > 8) {
                          return `${name}`;
                        }
                        return '';
                      }}
                      labelLine={false}
                      style={{ fontSize: '12px', fontWeight: '500' }}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill} 
                          stroke="#ffffff" 
                          strokeWidth={2} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Source Legend */}
              <div className="dashboard-source-legend">
                {sourceData.map((source, index) => (
                  <div key={index} className="dashboard-source-legend-item">
                    <div 
                      className="dashboard-source-color-indicator"
                      style={{ backgroundColor: source.fill }}
                    ></div>
                    <div className="dashboard-source-name">{source.name}</div>
                    <div className="dashboard-source-stats">
                      <span>{source.value}</span> 
                      <span>{source.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="dashboard-chart-empty">
              <div>No source data available</div>
              {settingsData?.sources?.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  <div>
                    <strong>Available sources from settings:</strong>
                    <ul style={{ marginTop: '5px' }}>
                      {settingsData.sources.map(source => (
                        <li key={source.id}>{source.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stages Section */}
        <div className="dashboard-stages-container">
          <div className="dashboard-stages-header">
            <h3 className="dashboard-stages-title">
              {getFieldLabel('stage') || 'Stages'}
            </h3>
            <div className="dashboard-total-leads-badge" style={{paddingBottom:'15px'}}>
              Total Leads: {categoryCounts.allLeads}
            </div>
          </div>
          
          {getFilteredLeadsByDate.length > 0 ? (
            <div className="dashboard-stages-list">
              {stageData.map(({ stage, stageKey, count, widthPx, color }) => (
                <div key={stageKey || stage} className="dashboard-stage-item">
                  <div 
                    className="dashboard-stage-bar" 
                    style={{ 
                      backgroundColor: color,
                      width: `${widthPx}px`,
                      maxWidth: '550px',
                      minWidth: '120px'
                    }}
                  >
                    <span className="dashboard-stage-label">{stage}</span>
                  </div>
                  <span className="dashboard-stage-count">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-stages-empty">
              No stage data available
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
  );
};

export default OverviewDashboard;
