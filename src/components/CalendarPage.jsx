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
  const { setSelectedLead, updateCompleteLeadData } = useLeadState();

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
  const [selectedCounsellor, setSelectedCounsellor] = useState('all');
  
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

      const leadIds = allLeadsData.map(lead => lead.id);
      const customFieldsByLead = await settingsService.getCustomFieldsForLeads(leadIds);

      const convertedLeads = allLeadsData.map(dbRecord => {
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
  }, []);

  const getFilteredLeads = () => {
    return allLeads.filter(lead => {
      const hasEvent = eventType === 'meeting' 
        ? (lead.meetingDate && lead.meetingTime)
        : (lead.visitDate && lead.visitTime);
      
      if (!hasEvent) return false;
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
      days.push({ day, isCurrentMonth: true, month: currentMonth, year: currentYear });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear
      });
    }

    return days;
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

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

  const handleDayClick = (dayObj) => {
    if (!dayObj.isCurrentMonth) return;
    const events = getEventsForDate(dayObj.year, dayObj.month, dayObj.day);
    if (events.length === 0) return;
    if (events.length === 1) {
      openSidebar(events[0]);
    } else {
      setSelectedDate(new Date(dayObj.year, dayObj.month, dayObj.day));
      setSelectedDateEvents(events);
      setShowEventModal(true);
    }
  };

  const handleEventClick = (lead) => {
    setShowEventModal(false);
    openSidebar(lead);
  };

  const openSidebar = (lead) => {
    setSelectedLeadState(lead);
    setSelectedLead(lead);
    setSidebarFormData({
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
    });
    setShowSidebar(true);
    setIsEditingMode(false);
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setSelectedLeadState(null);
    setIsEditingMode(false);
  };

  const handleSidebarFieldChange = (field, value) => {
    setSidebarFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateAllFields = async () => {
    try {
      let formattedPhone = sidebarFormData.phone;
      if (formattedPhone && !formattedPhone.startsWith('+91')) {
        formattedPhone = `+91${formattedPhone.replace(/^\+91/, '')}`;
      }

      const updateData = {
        parents_name: sidebarFormData.parentsName,
        kids_name: sidebarFormData.kidsName,
        grade: sidebarFormData.grade,
        source: sidebarFormData.source,
        phone: formattedPhone,
        second_phone: sidebarFormData.secondPhone,
        stage: sidebarFormData.stage,
        score: getStageScore(sidebarFormData.stage),
        category: getStageCategory(sidebarFormData.stage),
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

      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update(updateData)
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
      alert('Stage updated successfully!');
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Error updating stage: ' + error.message);
    }
  };

  const getStageCount = (stageName) => {
    const stage = settingsData.stages.find(s => s.name === stageName);
    const stageKey = stage?.stage_key || stageName;
    return allLeads.filter(lead => lead.stage === stageKey || lead.stage === stageName).length;
  };

  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <div className="calendar-page">
        <LeftSidebar 
          activeNavItem="calendarpage"
          activeSubmenuItem=""
          stages={stages}
          getStageCount={getStageCount}
          stagesTitle="Calendar"
          stagesIcon={CalendarIcon}
          onLogout={onLogout}
          user={user}
        />
        <div className="calendar-loading">
          <Loader2 size={24} className="animate-spin" />
          <span style={{ marginLeft: '12px' }}>Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <LeftSidebar 
        activeNavItem="calendarpage"
        activeSubmenuItem=""
        stages={stages}
        getStageCount={getStageCount}
        stagesTitle="Calendar"
        stagesIcon={CalendarIcon}
        onLogout={onLogout}
        user={user}
      />

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
                <option value="meeting">Meetings</option>
                <option value="visit">Visits</option>
              </select>
            </div>

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
        />
      </div>
    </div>
  );
};


export default CalendarPage;
