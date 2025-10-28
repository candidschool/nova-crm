import React, { useState, useEffect, useMemo } from 'react';
import { TABLE_NAMES } from '../config/tableNames';
import { supabase } from '../lib/supabase';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import { 
  logLeadCreated
} from '../utils/historyLogger';
import Stage1ActionButton from './Stage1ActionButton'; // ← Import Stage1 API component
import Stage11ActionButton from './Stage11ActionButton'; // ← Import Stage11 API component

const AddLeadForm = ({ isOpen, onClose, onSubmit, existingLeads = [] }) => {
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

  const [formData, setFormData] = useState({
    id: 0,
    parentsName: '',
    kidsName: '',
    location: '',
    phone: '',
    secondPhone: '',
    email: '',
    grade: '',
    notes: '',
    stage: '',
    category: 'New',
    offer: 'No offer',
    counsellor: 'Assign Counsellor',
    score: 20,
    source: '',
    occupation: '',
    currentSchool: '',
    createdTime: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [newlyCreatedLead, setNewlyCreatedLead] = useState(null); // ← For Stage1 API
  const [newlyCreatedLeadForPass00, setNewlyCreatedLeadForPass00] = useState(null); // ← NEW: For Stage11 API

  // ← Track API completion states
  const [stage1Complete, setStage1Complete] = useState(false);
  const [stage11Complete, setStage11Complete] = useState(false);

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

  const stages = useMemo(() => 
    settingsData.stages.map(stage => ({
      value: stage.stage_key || stage.name,
      label: stage.name,
      color: stage.color || '#B3D7FF'
    })), [settingsData.stages]
  );

  const offers = useMemo(() => {
    const offerField = settingsData.formFields.find(field => 
      field.field_key === 'offer' || field.name === 'Offer'
    );
    return offerField?.dropdown_options?.length > 0 
      ? ['No offer', ...offerField.dropdown_options]
      : ['No offer', '30000 Scholarship', '10000 Discount', 'Welcome Kit', 'Accessible Kit'];
  }, [settingsData.formFields]);

  const sources = useMemo(() => 
    settingsData.sources.length > 0 
      ? settingsData.sources.map(source => source.name)
      : ['Instagram', 'Facebook', 'Google Ads', 'Referral', 'Walk-in', 'Phone Call', 'Email', 'Website', 'Other'],
    [settingsData.sources]
  );

  const grades = useMemo(() => 
    settingsData.grades.length > 0 
      ? settingsData.grades.map(grade => grade.name)
      : ['LKG', 'UKG', 'Grade I', 'Grade II', 'Grade III', 'Grade IV', 'Grade V', 'Grade VI', 'Grade VII', 'Grade VIII', 'Grade IX', 'Grade X'],
    [settingsData.grades]
  );

  const counsellors = useMemo(() => 
    settingsData.counsellors.length > 0 
      ? ['Assign Counsellor', ...settingsData.counsellors.map(c => c.name)]
      : ['Assign Counsellor', 'Sachin', 'Rohit', 'Mukhesh'],
    [settingsData.counsellors]
  );

  useEffect(() => {
    if (isOpen && !settingsLoading) {
      document.body.classList.add('modal-open');
      
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);
      
      const defaultStageKey = stages[0]?.value || '';
      const defaultData = {
        id: 0,
        parentsName: '',
        kidsName: '',
        location: '',
        phone: '',
        secondPhone: '',
        email: '',
        grade: settingsData.grades[0]?.name || 'LKG',
        notes: '',
        stage: defaultStageKey,
        category: 'New',
        offer: 'No offer',
        counsellor: 'Assign Counsellor',
        score: 20,
        source: settingsData.sources[0]?.name || 'Instagram',
        occupation: '',
        currentSchool: '',
        createdTime: ''
      };
      
      setFormData(defaultData);
      setErrors({});
      setNewlyCreatedLead(null);
      setNewlyCreatedLeadForPass00(null); // ← NEW: Reset
      setStage1Complete(false); // ← NEW: Reset
      setStage11Complete(false); // ← NEW: Reset
      
      return () => {
        document.body.classList.remove('modal-open');
        window.removeEventListener('resize', setViewportHeight);
        window.removeEventListener('orientationchange', setViewportHeight);
      };
    } else if (!isOpen) {
      document.body.classList.remove('modal-open');
    }
  }, [isOpen, settingsLoading, settingsData.grades, settingsData.sources, stages]);

  const convertFormToDatabase = (formData) => {
    const stageKey = getStageKeyForLead(formData.stage);
    
    const dbData = {
      parents_name: formData.parentsName,
      kids_name: formData.kidsName,
      phone: `+91${formData.phone}`,
      second_phone: formData.secondPhone ? `+91${formData.secondPhone}` : '',
      email: formData.email || '',
      location: formData.location || '',
      grade: formData.grade || '',
      stage: stageKey,
      score: formData.score,
      category: formData.category,
      counsellor: formData.counsellor,
      offer: formData.offer,
      notes: formData.notes || '',
      source: formData.source,
      occupation: formData.occupation || '',
      current_school: formData.currentSchool || '',
      updated_at: new Date().toISOString()
    };
    return dbData;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let updatedFormData = { ...formData, [name]: value };

    if (name === 'stage') {
      const stageKey = getStageKeyForLead(value);
      updatedFormData.score = getStageScore(stageKey);
      updatedFormData.category = getStageCategory(stageKey);
    }

    if (name === 'phone' || name === 'secondPhone') {
      const digits = value.replace(/\D/g, '');
      const limitedDigits = digits.slice(0, 10);
      updatedFormData[name] = limitedDigits;
    }

    setFormData(updatedFormData);
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.parentsName.trim()) {
      newErrors.parentsName = `${getFieldLabel('parentsName')} is required`;
    }

    if (!formData.kidsName.trim()) {
      newErrors.kidsName = `${getFieldLabel('kidsName')} is required`;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = `${getFieldLabel('phone')} is required`;
    } else if (formData.phone.length !== 10) {
      newErrors.phone = `${getFieldLabel('phone')} must be exactly 10 digits`;
    }

    if (formData.secondPhone && formData.secondPhone.length !== 10) {
      newErrors.secondPhone = `${getFieldLabel('secondPhone')} must be exactly 10 digits`;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.counsellor || formData.counsellor === 'Assign Counsellor') {
      newErrors.counsellor = `Please select a ${getFieldLabel('counsellor').toLowerCase()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    document.body.classList.remove('modal-open');
    setNewlyCreatedLead(null);
    setNewlyCreatedLeadForPass00(null); // ← NEW: Reset
    onClose();
  };

  // ← NEW: Handle Stage1 API completion
  const handleStage1ApiComplete = (success, error) => {
    console.log('🟢 Stage1 API call completed:', { success, error });
    if (!success && error) {
      console.warn('⚠️ Stage1 API call failed:', error);
    }
    setStage1Complete(true);
    setNewlyCreatedLead(null);
  };

  // ← NEW: Handle Stage11 API completion (pass00)
  const handleStage11ApiComplete = (success, error) => {
    console.log('🟢 Stage11 API call (pass00) completed:', { success, error });
    if (!success && error) {
      console.warn('⚠️ Stage11 API call failed:', error);
    }
    setStage11Complete(true);
    setNewlyCreatedLeadForPass00(null);
  };

  // ← NEW: Check if both API calls are complete
  useEffect(() => {
    if (stage1Complete && stage11Complete) {
      console.log('✅ ALL API CALLS COMPLETED - Closing form');
      
      setLoading(false);
      alert('✅ New lead added successfully!');
      
      onSubmit();
      document.body.classList.remove('modal-open');
      onClose();

      // Reset form
      const defaultStageKey = stages[0]?.value || '';
      setFormData({
        id: 0,
        parentsName: '',
        kidsName: '',
        location: '',
        phone: '',
        secondPhone: '',
        email: '',
        grade: settingsData.grades[0]?.name || 'LKG',
        notes: '',
        stage: defaultStageKey,
        category: 'New',
        counsellor: 'Assign Counsellor',
        score: 20,
        source: settingsData.sources[0]?.name || 'Instagram',
        occupation: '',
        currentSchool: '', 
        createdTime: ''
      });

      // Reset completion states
      setStage1Complete(false);
      setStage11Complete(false);
    }
  }, [stage1Complete, stage11Complete]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const dbData = convertFormToDatabase(formData);

      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .insert([dbData])
        .select();

      if (error) {
        throw error;
      }

      const newLeadId = data[0].id;

      const stageDisplayName = getStageDisplayName(formData.stage);
      const logFormData = {
        ...formData,
        stage: stageDisplayName
      };
      await logLeadCreated(newLeadId, logFormData);

      console.log('✅ New lead created:', data);

      // ← Prepare data for BOTH API calls
      const leadDataForApi = {
        phone: `+91${formData.phone}`,
        parentsName: formData.parentsName,
        kidsName: formData.kidsName,
        grade: formData.grade
      };

      console.log('🚀 Triggering BOTH API calls with lead data:', leadDataForApi);
      
      // ← Trigger Stage1 API (welcome messages to customer)
      setNewlyCreatedLead(leadDataForApi);
      
      // ← NEW: Trigger Stage11 API (pass00 to fixed number)
      setNewlyCreatedLeadForPass00(leadDataForApi);

    } catch (error) {
      console.error('❌ Database error:', error);
      alert('❌ Error saving lead: ' + error.message);
      setLoading(false);
    }
  };

  if (!isOpen || settingsLoading) return null;

  return (
    <>
      {/* ← Stage1 API Call Component (welcome messages to customer) */}
      {newlyCreatedLead && (
        <Stage1ActionButton
          leadData={newlyCreatedLead}
          onComplete={handleStage1ApiComplete}
          getFieldLabel={getFieldLabel}
        />
      )}

      {/* ← NEW: Stage11 API Call Component (pass00 to fixed number) */}
      {newlyCreatedLeadForPass00 && (
        <Stage11ActionButton
          leadData={newlyCreatedLeadForPass00}
          onComplete={handleStage11ApiComplete}
          getFieldLabel={getFieldLabel}
        />
      )}

      {/* Modal Overlay */}
      <div className="modal-overlay" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add New Lead</h5>
            <button type="button" className="close-modal-btn" onClick={handleClose}>×</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('parentsName')} *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.parentsName ? 'is-invalid' : ''}`}
                    name="parentsName"
                    value={formData.parentsName}
                    onChange={handleInputChange}
                    placeholder={`Enter ${getFieldLabel('parentsName').toLowerCase()}`}
                    disabled={loading}
                  />
                  {errors.parentsName && <div className="invalid-feedback">{errors.parentsName}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('kidsName')} *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.kidsName ? 'is-invalid' : ''}`}
                    name="kidsName"
                    value={formData.kidsName}
                    onChange={handleInputChange}
                    placeholder={`Enter ${getFieldLabel('kidsName').toLowerCase()}`}
                    disabled={loading}
                  />
                  {errors.kidsName && <div className="invalid-feedback">{errors.kidsName}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('location')} </label>
                  <input
                    type="text"
                    className={`form-control ${errors.location ? 'is-invalid' : ''}`}
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder={`Enter ${getFieldLabel('location').toLowerCase()}`}
                    disabled={loading}
                  />
                  {errors.location && <div className="invalid-feedback">{errors.location}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('currentSchool')}</label>
                  <input
                    type="text"
                    className={`form-control ${errors.currentSchool ? 'is-invalid' : ''}`}
                    name="currentSchool"
                    value={formData.currentSchool}
                    onChange={handleInputChange}
                    placeholder={`Enter ${getFieldLabel('currentSchool').toLowerCase()}`}
                    disabled={loading}
                  />
                  {errors.currentSchool && <div className="invalid-feedback">{errors.currentSchool}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('phone')} *</label>
                  <div className="input-group">
                    <span className="input-group-text">+91</span>
                    <input
                      type="text"
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter 10-digit number"
                      maxLength="10"
                      disabled={loading}
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('secondPhone')}</label>
                  <div className="input-group">
                    <span className="input-group-text">+91</span>
                    <input
                      type="text"
                      className={`form-control ${errors.secondPhone ? 'is-invalid' : ''}`}
                      name="secondPhone"
                      value={formData.secondPhone}
                      onChange={handleInputChange}
                      placeholder={`Enter 10-digit ${getFieldLabel('secondPhone').toLowerCase()} (optional)`}
                      maxLength="10"
                      disabled={loading}
                    />
                    {errors.secondPhone && <div className="invalid-feedback">{errors.secondPhone}</div>}
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('email')} </label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={`Enter ${getFieldLabel('email').toLowerCase()}`}
                    disabled={loading}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('source')}</label>
                  <select
                    className="form-select"
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    {sources.map(source => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('grade')} *</label>
                  <select
                    className={`form-select ${errors.grade ? 'is-invalid' : ''}`}
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    {grades.map(grade => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                  {errors.grade && <div className="invalid-feedback">{errors.grade}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('stage')}</label>
                  <select
                    className="form-select"
                    name="stage"
                    value={formData.stage}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    {stages.map(stage => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">{getFieldLabel('counsellor')} *</label>
                  <select
                    className={`form-select ${errors.counsellor ? 'is-invalid' : ''}`}
                    name="counsellor"
                    value={formData.counsellor}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    {counsellors.map(counsellor => (
                      <option 
                        key={counsellor} 
                        value={counsellor}
                        style={{ 
                          color: counsellor === 'Assign Counsellor' ? '#999' : 'inherit',
                          fontStyle: counsellor === 'Assign Counsellor' ? 'italic' : 'normal'
                        }}
                      >
                        {counsellor === 'Assign Counsellor' ? '-- Select a Counsellor --' : counsellor}
                      </option>
                    ))}
                  </select>
                  {errors.counsellor && <div className="invalid-feedback">{errors.counsellor}</div>}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="submit" 
                className="btn btn-primary lead-add"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span>⏳ Adding & Sending Messages...</span>
                  </>
                ) : (
                  <span>Add Lead</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddLeadForm;
