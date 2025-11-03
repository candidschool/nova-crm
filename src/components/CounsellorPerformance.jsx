import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import { achievementsService } from '../services/achievementsService';
import { 
  BarChart3,
  Loader2,
  TrendingUp,
  Award
} from 'lucide-react';
import LeftSidebar from './LeftSidebar';

// Import your custom icons
import meetingsDoneIcon from '../assets/icons/meetings-done.png';
import visitsDoneIcon from '../assets/icons/visits-done.png';
import registeredIcon from '../assets/icons/registered.png';

const CounsellorPerformance = ({ onLogout, user }) => {
  const { 
    settingsData, 
    getFieldLabel,
    getStageKeyFromName,
    loading: settingsLoading 
  } = useSettingsData();

  const [counsellorData, setCounsellorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: '',
    isActive: false
  });
  const [selectedMetric, setSelectedMetric] = useState('meetingBooked');
  
  const [isMobile, setIsMobile] = useState(false);
  const [currentBarIndex, setCurrentBarIndex] = useState(0);

  const stages = useMemo(() => {
    return settingsData.stages.map(stage => ({
      value: stage.stage_key || stage.name,
      label: stage.name,
      color: stage.color || '#B3D7FF',
      score: stage.score || 10,
      category: stage.status || 'New'
    }));
  }, [settingsData.stages]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // The 3 tracked stages
  const performanceStages = [
    { key: 'meetingBooked', name: 'Session Booked', icon: meetingsDoneIcon },
    { key: 'meetingDone', name: 'Session Catered', icon: visitsDoneIcon },
    { key: 'admission', name: 'Admission Done', icon: registeredIcon }
  ];

  // Fetch achievements data with date filtering
  const fetchAchievements = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING COUNSELLOR ACHIEVEMENTS ===');
      console.log('Date range:', dateRange);
      
      // Apply date filter if active
      const fromDate = dateRange.isActive && dateRange.fromDate ? dateRange.fromDate : null;
      const toDate = dateRange.isActive && dateRange.toDate ? dateRange.toDate : null;
      
      const { data, error } = await achievementsService.getAchievementsByTimeRange(fromDate, toDate);
      
      if (error) throw error;
      
      console.log('✅ Achievements fetched:', data);
      
      // Calculate percentages
      const dataWithPercentages = data.map(counsellor => {
        const visitPercent = counsellor.meetingBooked > 0 
          ? ((counsellor.meetingDone / counsellor.meetingBooked) * 100).toFixed(0)
          : 0;
        
        const admissionPercent = counsellor.meetingDone > 0
          ? ((counsellor.admission / counsellor.meetingDone) * 100).toFixed(0)
          : 0;
        
        return {
          ...counsellor,
          visitPercent: parseFloat(visitPercent),
          admissionPercent: parseFloat(admissionPercent)
        };
      });
      
      // Sort by admission percent (highest first)
      const sorted = dataWithPercentages.sort((a, b) => b.admissionPercent - a.admissionPercent);
      
      setCounsellorData(sorted);
      
    } catch (error) {
      console.error('❌ Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [dateRange.isActive, dateRange.fromDate, dateRange.toDate]);

  // Get current date for max date validation
  const currentDate = new Date().toISOString().split('T')[0];

  // Get top performers
  const topVisitPerformer = useMemo(() => {
    if (counsellorData.length === 0) return null;
    return [...counsellorData].sort((a, b) => b.visitPercent - a.visitPercent)[0];
  }, [counsellorData]);

  const topAdmissionPerformer = useMemo(() => {
    if (counsellorData.length === 0) return null;
    return [...counsellorData].sort((a, b) => b.admissionPercent - a.admissionPercent)[0];
  }, [counsellorData]);

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    const fullData = counsellorData.map(counsellor => ({
      name: counsellor.name.split(' ')[0],
      value: counsellor[selectedMetric] || 0,
      fullName: counsellor.name,
      metric: selectedMetric
    }));
    
    if (isMobile && fullData.length > 0) {
      return [fullData[currentBarIndex] || fullData[0]];
    }
    
    return fullData;
  }, [counsellorData, selectedMetric, isMobile, currentBarIndex]);

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

  useEffect(() => {
    if (currentBarIndex >= counsellorData.length && counsellorData.length > 0) {
      setCurrentBarIndex(0);
    }
  }, [counsellorData.length, currentBarIndex]);

  const getStageCount = (stageName) => {
    return 0; // Not used in this view
  };

  const getStageDisplayName = (stageKey) => {
    const stage = performanceStages.find(s => s.key === stageKey);
    return stage ? stage.name : stageKey;
  };

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

  const handleClear = () => {
    setDateRange({ fromDate: '', toDate: '', isActive: false });
  };

  const getCounsellorInitials = (fullName) => {
    if (!fullName) return 'NA';
    const words = fullName.trim().split(' ');
    const firstTwoWords = words.slice(0, 2);
    return firstTwoWords.map(word => word.charAt(0).toUpperCase()).join('');
  };

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

  if (counsellorData.length === 0) {
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
          <div className="dashboard-overview">
            <div className="dashboard-header">
              <h2 className="dashboard-title">
                {getFieldLabel('counsellor')} Performance
              </h2>
            </div>

            {/* Date Filter */}
            <div className="dashboard-date-filter">
              <span className="dashboard-date-filter-label">Select Date Range</span>
              
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
                Apply Filter
              </button>

              {dateRange.isActive && (
                <button onClick={handleClear} className="dashboard-clear-btn">
                  Clear Filter
                </button>
              )}
            </div>

            <div className="dashboard-no-data">
              <div className="dashboard-no-data-title">No counsellor data available</div>
              <div className="dashboard-no-data-subtitle">
                {dateRange.isActive 
                  ? 'No achievements found for the selected date range'
                  : 'Counsellor achievements will appear here once leads reach tracked stages'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="dashboard-overview">
          <div className="dashboard-header">
            <h2 className="dashboard-title">
              {getFieldLabel('counsellor')} Performance
            </h2>
          </div>

          {/* Date Filter Section */}
          <div className="dashboard-date-filter">
            <span className="dashboard-date-filter-label">Select Date Range</span>
            
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
              Apply Filter
            </button>

            {dateRange.isActive && (
              <button onClick={handleClear} className="dashboard-clear-btn">
                Clear Filter
              </button>
            )}
          </div>

          {dateRange.isActive && (
            <div className="dashboard-date-info">
              Showing data from {new Date(dateRange.fromDate).toLocaleDateString()} to {new Date(dateRange.toDate).toLocaleDateString()}
            </div>
          )}

          {/* Performance Insights */}
          <div className="counsellor-insights-section">
            <h3 className="counsellor-insights-title">Performance Insights</h3>
            
            <div className="counsellor-cards-grid">
              {counsellorData.map((counsellor, index) => (
                <div key={index} className="counsellor-card">
                  <div className="counsellor-card-header">
                    <h4 className="counsellor-name">{counsellor.name}</h4>
                  </div>
                  
                  <div className="counsellor-metrics">
                    {performanceStages.map((stage) => (
                      <div key={stage.key} className="counsellor-metric">
                        <div className="counsellor-metric-icon">
                          <img 
                            src={stage.icon} 
                            alt={stage.name} 
                            style={{ width: '16px', height: '16px' }}
                          />
                        </div>
                        <span className="counsellor-metric-label">{stage.name}</span>
                        <span className="counsellor-metric-value">{counsellor[stage.key] || 0}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="counsellor-percentages">
                    <div className="counsellor-percent-row">
                      <span className="counsellor-percent-label">Visit %</span>
                      <span className="counsellor-percent-value">{counsellor.visitPercent}%</span>
                    </div>
                    <div className="counsellor-percent-row">
                      <span className="counsellor-percent-label">Admission %</span>
                      <span className="counsellor-percent-value">{counsellor.admissionPercent}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="counsellor-charts-section">
            {/* Success Rate Chart */}
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
                  {performanceStages.map(stage => (
                    <option key={stage.key} value={stage.key}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {barChartData.length > 0 ? (
                <>
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
                          interval={0}
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
                    Currently viewing: {getStageDisplayName(selectedMetric)}
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

            {/* Top Performers Section - TWO CARDS */}
            <div className="counsellor-top-performers-container">
              {/* Visit % Leader */}
              <div className="counsellor-top-performer">
                <h3 className="counsellor-top-performer-title">
                  <TrendingUp size={18} style={{ marginRight: '6px' }} />
                  Best Visit %
                </h3>
                
                {topVisitPerformer ? (
                  <div className="counsellor-top-performer-content">
                    <div className="counsellor-top-performer-info">
                      <div className="counsellor-top-performer-avatar">
                        {getCounsellorInitials(topVisitPerformer.name)}
                      </div>
                      <div className="counsellor-top-performer-name">
                        {topVisitPerformer.name}
                      </div>
                    </div>
                    
                    <div className="counsellor-top-performer-percent">
                      {topVisitPerformer.visitPercent}%
                    </div>
                    
                    <div className="counsellor-top-performer-formula">
                      ({topVisitPerformer.meetingDone}/{topVisitPerformer.meetingBooked})
                    </div>
                  </div>
                ) : (
                  <div className="counsellor-top-performer-empty">
                    No data available
                  </div>
                )}
              </div>

              {/* Admission % Leader */}
              <div className="counsellor-top-performer">
                <h3 className="counsellor-top-performer-title">
                  <Award size={18} style={{ marginRight: '6px' }} />
                  Best Admission %
                </h3>
                
                {topAdmissionPerformer ? (
                  <div className="counsellor-top-performer-content">
                    <div className="counsellor-top-performer-info">
                      <div className="counsellor-top-performer-avatar">
                        {getCounsellorInitials(topAdmissionPerformer.name)}
                      </div>
                      <div className="counsellor-top-performer-name">
                        {topAdmissionPerformer.name}
                      </div>
                    </div>
                    
                    <div className="counsellor-top-performer-percent">
                      {topAdmissionPerformer.admissionPercent}%
                    </div>
                    
                    <div className="counsellor-top-performer-formula">
                      ({topAdmissionPerformer.admission}/{topAdmissionPerformer.meetingDone})
                    </div>
                  </div>
                ) : (
                  <div className="counsellor-top-performer-empty">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
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

        .counsellor-percentages {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .counsellor-percent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .counsellor-percent-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .counsellor-percent-value {
          font-size: 16px;
          font-weight: 700;
          color: #10b981;
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

        .counsellor-top-performers-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .counsellor-top-performer {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .counsellor-top-performer-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #1f2937;
          display: flex;
          align-items: center;
        }

        .counsellor-top-performer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .counsellor-top-performer-info {
          margin-bottom: 12px;
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
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .counsellor-top-performer-percent {
          font-size: 32px;
          font-weight: 700;
          color: #10b981;
          margin-bottom: 4px;
        }

        .counsellor-top-performer-formula {
          font-size: 12px;
          color: #6b7280;
        }

        .counsellor-top-performer-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100px;
          color: #6b7280;
          font-size: 14px;
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

        .dashboard-date-filter {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
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
          margin-bottom: 16px;
          padding: 12px;
          background: #f0f9ff;
          border-radius: 6px;
          border: 1px solid #bae6fd;
        }

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
        }
      `}</style>
    </div>
  );
};

export default CounsellorPerformance;
