import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import { useLeadState } from './LeadStateProvider';
import LeadSidebar from './LeadSidebar';
import LeftSidebar from './LeftSidebar';
import { ChevronLeft, ChevronRight, X, Clock, Link as LinkIcon, MapPin, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { settingsService } from '../services/settingsService';

const CalendarPage = ({ onLogout, user }) => {
  const { settingsData, getFieldLabel, getStageColor, getStageScore, getStageCategory } = useSettingsData();
  
  // ✅ UPDATED: Import permission functions from useLeadState
  const { 
    setSelectedLead, 
    updateCompleteLeadData,
    user: contextUser,
    canEditLead,
    canReassignLeads,
    canViewAllLeads
  } = useLeadState();

  // Get stages for sidebar
  const stages = settingsData.stages.map(stage => ({
    value: stage.stage_key || stage.name,
    label: stage.name,
    color: stage.color || '#B3D7FF',
    score: stage.score || 10,
    category: stage.category || 'New'
  }));

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Filter state
  const [eventType, setEventType] = useState('meeting');
  
  // ✅ UPDATED: Set initial selectedCounsellor based on user role
  const getInitialCounsellor = () => {
    if (!contextUser) return 'all';
    
    // Admin sees 'all' by default
    if (contextUser.role === 'admin') return 'all';
    
    // Jr. Counselor sees all leads
    if (contextUser.role === 'jr_counselor') return 'all';
    
    // Counselor and Outsider see only their own leads
    if (contextUser.role === 'user' || contextUser.role === 'outsider') {
      return contextUser.full_name || 'all';
    }
    
    return 'all';
  };
  
  const [selectedCounsellor, setSelectedCounsellor] = useState(getInitialCounsellor());
  
  // Data state
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedLeadState, setSelectedLeadState] = useState(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [sidebarFormData, setSidebarFormData] = useState({});

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearOptions.push(i);
  }

  // ✅ NEW: Update selectedCounsellor when user context changes
  useEffect(() => {
    const initialCounsellor = getInitialCounsellor();
    setSelectedCounsellor(initialCounsellor);
  }, [contextUser]);

  // ✅ FIXED: Fetch ALL leads using batching
  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING ALL LEADS FOR CALENDAR ===');
      
      let allLeadsData = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from(TABLE_NAMES.LEADS)
          .select('*')
          .order('id', { ascending: false })
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        allLeadsData = [...allLeadsData, ...data];
        
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          from += batchSize;
        }
      }

      console.log('✅ Total leads fetched:', allLeadsData.length);

      // ✅ UPDATED: Apply role-based filtering
      let filteredLeadsData = allLeadsData;
      
      if (contextUser) {
        // Admin and Jr. Counselor see all leads
        if (contextUser.role === 'admin' || contextUser.role === 'jr_counselor') {
          filteredLeadsData = allLeadsData;
        } 
        // Counselor and Outsider see only their own leads
        else if (contextUser.role === 'user' || contextUser.role === 'outsider') {
          filteredLeadsData = allLeadsData.filter(lead => 
            lead.counsellor === contextUser.full_name
          );
          console.log(`Filtered to ${filteredLeadsData.length} leads for ${contextUser.full_name}`);
        }
      }

      const leadIds = filteredLeadsData.map(lead => lead.id);
      const customFieldsByLead = await settingsService.getCustomFieldsForLeads(leadIds);

      const convertedLeads = filteredLeadsData.map(dbRecord => {
        let meetingDate = '', meetingTime = '', visitDate = '', visitTime = '';

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

        return {
          id: dbRecord.id,
          parentsName: dbRecord.parents_name,
          kidsName: dbRecord.kids_name,
          phone: dbRecord.phone,
          secondPhone: dbRecord.second_phone || '',
          location: dbRecord.location,
          grade: dbRecord.grade,
          stage: dbRecord.stage,
          score: dbRecord.score,
          category: dbRecord.category,
          counsellor: dbRecord.counsellor,
          offer: dbRecord.offer,
          notes: dbRecord.notes || '',
          email: dbRecord.email || '',
          occupation: dbRecord.occupation || '',
          source: dbRecord.source || settingsData.sources?.[0]?.name || 'Instagram',
          currentSchool: dbRecord.current_school || '',
          meetingDate,
          meetingTime,
          meetingLink: dbRecord.meet_link || '',
          visitDate,
          visitTime,
          visitLocation: dbRecord.visit_location || '',
          registrationFees: dbRecord.reg_fees || '',
          enrolled: dbRecord.enrolled || '',
          customFields: customFieldsByLead[dbRecord.id] || {},
          createdTime: new Date(dbRecord.created_at).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          }).replace(',', '')
        };
      });

      setAllLeads(convertedLeads);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [contextUser]);

  const getFilteredLeads = () => {
    return allLeads.filter(lead => {
      const hasEvent = eventType === 'meeting' 
        ? (lead.meetingDate && lead.meetingTime)
        : (lead.visitDate && lead.visitTime);
      
      if (!hasEvent) return false;
      
      // ✅ UPDATED: Filter by counsellor only if not "all"
      if (selectedCounsellor !== 'all' && lead.counsellor !== selectedCounsellor) return false;
      
      return true;
    });
  };

  const getEventsForDate = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const filteredLeads = getFilteredLeads();
    return filteredLeads.filter(lead => {
      const leadDate = eventType === 'meeting' ? lead.meetingDate : lead.visitDate;
      return leadDate === dateStr;
    });
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        month: currentMonth,
        year: currentYear
      });
    }

    const totalCells = days.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const handleDayClick = (dayObj) => {
    if (!dayObj.isCurrentMonth) return;
    
    const events = getEventsForDate(dayObj.year, dayObj.month, dayObj.day);
    if (events.length === 0) return;

    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    setSelectedDate(date);
    setSelectedDateEvents(events);
    setShowEventModal(true);
  };

  const handleEventClick = (event) => {
    setShowEventModal(false);
    setSelectedLeadState(event);
    setSidebarFormData({
      parentsName: event.parentsName || '',
      kidsName: event.kidsName || '',
      phone: event.phone || '',
      secondPhone: event.secondPhone || '',
      email: event.email || '',
      grade: event.grade || '',
      source: event.source || '',
      counsellor: event.counsellor || '',
      stage: event.stage || '',
      occupation: event.occupation || '',
      location: event.location || '',
      currentSchool: event.currentSchool || '',
      offer: event.offer || '',
      meetingDate: event.meetingDate || '',
      meetingTime: event.meetingTime || '',
      meetingLink: event.meetingLink || '',
      visitDate: event.visitDate || '',
      visitTime: event.visitTime || '',
      visitLocation: event.visitLocation || '',
      registrationFees: event.registrationFees || '',
      enrolled: event.enrolled || '',
      notes: event.notes || ''
    });
    setShowSidebar(true);
    setIsEditingMode(false);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setSelectedLeadState(null);
    setIsEditingMode(false);
  };

  const handleSidebarFieldChange = (fieldName, value) => {
    setSidebarFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleUpdateAllFields = async () => {
    if (!selectedLeadState) return;

    try {
      let meetDateTime = null;
      if (sidebarFormData.meetingDate && sidebarFormData.meetingTime) {
        meetDateTime = `${sidebarFormData.meetingDate}T${sidebarFormData.meetingTime}:00`;
      }

      let visitDateTime = null;
      if (sidebarFormData.visitDate && sidebarFormData.visitTime) {
        visitDateTime = `${sidebarFormData.visitDate}T${sidebarFormData.visitTime}:00`;
      }

      let formattedPhone = sidebarFormData.phone;
      if (formattedPhone && !formattedPhone.startsWith('+91')) {
        formattedPhone = formattedPhone.replace(/^\+91/, '');
        formattedPhone = `+91${formattedPhone}`;
      }

      let formattedSecondPhone = sidebarFormData.secondPhone;
      if (formattedSecondPhone && !formattedSecondPhone.startsWith('+91')) {
        formattedSecondPhone = formattedSecondPhone.replace(/^\+91/, '');
        formattedSecondPhone = `+91${formattedSecondPhone}`;
      }

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({
          parents_name: sidebarFormData.parentsName,
          kids_name: sidebarFormData.kidsName,
          phone: formattedPhone,
          second_phone: formattedSecondPhone,
          email: sidebarFormData.email,
          grade: sidebarFormData.grade,
          source: sidebarFormData.source,
          counsellor: sidebarFormData.counsellor,
          stage: sidebarFormData.stage,
          occupation: sidebarFormData.occupation,
          location: sidebarFormData.location,
          current_school: sidebarFormData.currentSchool,
          offer: sidebarFormData.offer,
          meet_datetime: meetDateTime,
          meet_link: sidebarFormData.meetingLink,
          visit_datetime: visitDateTime,
          visit_location: sidebarFormData.visitLocation,
          reg_fees: sidebarFormData.registrationFees,
          enrolled: sidebarFormData.enrolled,
          notes: sidebarFormData.notes,
          score: getStageScore(sidebarFormData.stage),
          category: getStageCategory(sidebarFormData.stage),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLeadState.id);

      if (error) throw error;

      setIsEditingMode(false);
      await fetchLeads();
      alert('Lead updated successfully!');
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead: ' + error.message);
    }
  };

  const handleSidebarStageChange = async (leadId, newStage) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({
          stage: newStage,
          score: getStageScore(newStage),
          category: getStageCategory(newStage),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      await fetchLeads();
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  // ✅ NEW: Helper function to check if user is admin
  const isAdmin = () => {
    return contextUser?.role === 'admin';
  };

  // ✅ NEW: Get counsellor display label for non-admin users
  const getCounsellorDisplayLabel = () => {
    if (!contextUser) return 'All Counsellors';
    
    if (contextUser.role === 'jr_counselor') {
      return 'All Counsellors';
    }
    
    if (contextUser.role === 'user' || contextUser.role === 'outsider') {
      return contextUser.full_name || 'My Events';
    }
    
    return 'All Counsellors';
  };

  if (loading) {
    return (
      <div className="leads-container">
        <LeftSidebar onLogout={onLogout} user={user} />
        <div className="leads-main-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Loader2 className="spinner" size={40} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leads-container">
      <LeftSidebar onLogout={onLogout} user={user} />

      <div className="calendar-main-content">
        <div className="calendar-header">
          <div className="calendar-header-left">
            <h1 className="calendar-title">Calendar View</h1>
          </div>
          
          <div className="calendar-header-right">
            <div className="calendar-filter-dropdown">
              <label className="calendar-filter-label">Event Type</label>
              <select 
                className="calendar-filter-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="meeting">Session Booked</option>
                <option value="visit">Visit Booked</option>
              </select>
            </div>

            {/* ✅ UPDATED: Counsellor filter - Only visible for Admin */}
            {isAdmin() ? (
              <div className="calendar-filter-dropdown">
                <label className="calendar-filter-label">Counsellor</label>
                <select 
                  className="calendar-filter-select"
                  value={selectedCounsellor}
                  onChange={(e) => setSelectedCounsellor(e.target.value)}
                >
                  <option value="all">All Counsellors</option>
                  {settingsData?.counsellors?.map(counsellor => (
                    <option key={counsellor.id} value={counsellor.name}>
                      {counsellor.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              // ✅ NEW: Display label for non-admin users
              <div className="calendar-filter-dropdown">
                <label className="calendar-filter-label">Counsellor</label>
                <div 
                  className="calendar-filter-select" 
                  style={{ 
                    backgroundColor: '#f3f4f6', 
                    color: '#6b7280',
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px'
                  }}
                >
                  {getCounsellorDisplayLabel()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="calendar-navigation">
          <div className="calendar-nav-controls">
            <button className="calendar-nav-button" onClick={handlePrevMonth}>
              <ChevronLeft size={20} />
            </button>
            <div className="calendar-current-month">
              {monthNames[currentMonth]} {currentYear}
            </div>
            <button className="calendar-nav-button" onClick={handleNextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="calendar-year-select-container">
            <select 
              className="calendar-year-select"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="calendar-container">
          <div className="calendar-grid">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}

            {calendarDays.map((dayObj, index) => {
              const events = getEventsForDate(dayObj.year, dayObj.month, dayObj.day);
              const hasEvents = events.length > 0;
              const isTodayDate = isToday(dayObj.year, dayObj.month, dayObj.day);

              return (
                <div
                  key={index}
                  className={`calendar-day-cell ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isTodayDate ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`}
                  onClick={() => handleDayClick(dayObj)}
                >
                  <div className="calendar-day-number">{dayObj.day}</div>
                  {hasEvents && (
                    <div className="calendar-events">
                      {events.length <= 3 ? (
                        events.map((event, idx) => (
                          <div key={idx} className={`calendar-event-item ${eventType}`}>
                            {event.parentsName} - {eventType === 'meeting' ? event.meetingTime : event.visitTime}
                          </div>
                        ))
                      ) : (
                        <div className={`calendar-event-count ${eventType}`}>
                          {events.length} {eventType === 'meeting' ? 'meetings' : 'visits'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showEventModal && (
          <div className="calendar-event-modal-overlay" onClick={() => setShowEventModal(false)}>
            <div className="calendar-event-modal" onClick={(e) => e.stopPropagation()}>
              <div className="calendar-event-modal-header">
                <div>
                  <h3 className="calendar-event-modal-title">
                    {eventType === 'meeting' ? 'Meetings' : 'Visits'} on {selectedDate?.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="calendar-event-modal-date">
                    {selectedDateEvents.length} {eventType === 'meeting' ? 'meeting(s)' : 'visit(s)'} scheduled
                  </div>
                </div>
                <button className="calendar-event-modal-close" onClick={() => setShowEventModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="calendar-event-modal-body">
                <div className="calendar-event-list">
                  {selectedDateEvents.map((event, index) => (
                    <div key={index} className="calendar-event-list-item" onClick={() => handleEventClick(event)}>
                      <div className="calendar-event-list-item-header">
                        <div className="calendar-event-list-item-name">{event.parentsName}</div>
                        <div className={`calendar-event-list-item-type ${eventType}`}>{eventType}</div>
                      </div>
                      <div className="calendar-event-list-item-details">
                        <div className="calendar-event-list-item-detail">
                          <Clock size={14} />
                          <span className="calendar-event-list-item-detail-label">Time:</span>
                          <span className="calendar-event-list-item-detail-value">
                            {eventType === 'meeting' ? event.meetingTime : event.visitTime}
                          </span>
                        </div>
                        {eventType === 'meeting' && event.meetingLink && (
                          <div className="calendar-event-list-item-detail">
                            <LinkIcon size={14} />
                            <span className="calendar-event-list-item-detail-label">Link:</span>
                            <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="calendar-event-list-item-link" onClick={(e) => e.stopPropagation()}>
                              {event.meetingLink}
                            </a>
                          </div>
                        )}
                        {eventType === 'visit' && event.visitLocation && (
                          <div className="calendar-event-list-item-detail">
                            <MapPin size={14} />
                            <span className="calendar-event-list-item-detail-label">Location:</span>
                            <span className="calendar-event-list-item-detail-value">{event.visitLocation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ UPDATED: Pass permission props to LeadSidebar */}
        <LeadSidebar
          key={selectedLeadState?.id}
          showSidebar={showSidebar}
          selectedLead={selectedLeadState}
          isEditingMode={isEditingMode}
          sidebarFormData={sidebarFormData}
          stages={stages}
          settingsData={settingsData}
          onClose={closeSidebar}
          onEditModeToggle={() => setIsEditingMode(!isEditingMode)}
          onFieldChange={handleSidebarFieldChange}
          onUpdateAllFields={handleUpdateAllFields}
          onStageChange={handleSidebarStageChange}
          onRefreshActivityData={() => {}}
          onRefreshSingleLead={fetchLeads}
          getStageColor={getStageColor}
          getCounsellorInitials={(name) => {
            if (!name) return 'NA';
            return name.trim().split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
          }}
          getScoreFromStage={(stage) => getStageScore(stage)}
          getCategoryFromStage={(stage) => getStageCategory(stage)}
          canEdit={selectedLeadState ? canEditLead(selectedLeadState) : false}
          canReassign={selectedLeadState ? canReassignLeads(selectedLeadState) : false}
          user={contextUser}
        />
      </div>
    </div>
  );
};


export default CalendarPage;
