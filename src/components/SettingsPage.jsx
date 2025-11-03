import React, { useState, useEffect } from 'react';
import novalogo from '../NovaLogo.png';
import { 
  Edit, 
  Plus, 
  Check, 
  X, 
  Upload,
  ArrowUpDown,
  Settings,
  Loader2,
  User,
  Mail,
  Lock,
  Shield
} from 'lucide-react';
import LeftSidebar from './LeftSidebar';
import { settingsService } from '../services/settingsService';
import { useSettingsData } from '../contexts/SettingsDataProvider';


const SettingsPage = ({ onLogout, user }) => {
  const { refreshSettingsData } = useSettingsData();
  // Database states
  const [settingsData, setSettingsData] = useState({
    stages: [],
    grades: [],
    counsellors: [],
    sources: [],
    form_fields: [],
    school: {}
  });

  const [showStageEditModal, setShowStageEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState({
    id: null,
    name: '',
    color: '',
    status: '',
    stage_key: ''
  });
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Display Preferences State
  const [leadsPerPage, setLeadsPerPage] = useState(50);
  const [savingDisplayPrefs, setSavingDisplayPrefs] = useState(false);

  // School Profile State
  const [schoolProfile, setSchoolProfile] = useState({
    schoolName: '',
    academicYearFrom: '',
    academicYearTo: ''
  });

  // Custom Fields Modal State
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [customFieldData, setCustomFieldData] = useState({
    fieldName: '',
    fieldType: 'text',
  });

  // Form Field Edit Modal States
  const [showFormFieldEditModal, setShowFormFieldEditModal] = useState(false);
  const [editingFormField, setEditingFormField] = useState({
    id: null,
    name: '',
    originalData: {}
  });

  // Grade Modal States
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeModalData, setGradeModalData] = useState({
    id: null,
    name: '',
    isEditing: false
  });

  // Source Modal States
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceModalData, setSourceModalData] = useState({
    id: null,
    name: '',
    isEditing: false
  });

  // ✅ UPDATED: Counsellor Modal States - Added role field
  const [showCounsellorModal, setShowCounsellorModal] = useState(false);
  const [counsellorFormData, setCounsellorFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' // Default to 'user' (Counselor)
  });

  const [editingCounsellor, setEditingCounsellor] = useState(null);
  const [counsellorSubmitting, setCounsellorSubmitting] = useState(false);

  // ✅ NEW: Role options (WITHOUT admin)
  const roleOptions = [
    { value: 'user', label: 'Counselor', description: 'Can manage own leads' },
    { value: 'jr_counselor', label: 'Jr. Counselor', description: 'View all leads, read-only' },
    { value: 'outsider', label: 'Outsider', description: 'View own leads only, read-only' }
  ];

  // ✅ NEW: Helper function to get role label and color
  const getRoleDisplay = (role) => {
    const roleInfo = {
      admin: { label: 'Admin', color: '#dc2626' },
      user: { label: 'Counselor', color: '#2563eb' },
      jr_counselor: { label: 'Jr. Counselor', color: '#16a34a' },
      outsider: { label: 'Outsider', color: '#9333ea' }
    };
    return roleInfo[role] || { label: 'Unknown', color: '#6b7280' };
  };

  // Field type options for custom fields
  const fieldTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'numeric', label: 'Numeric' }
  ];

  // Stage editing functions
  const handleEditStage = (stage) => {
    setEditingStage({
      id: stage.id,
      name: stage.name,
      color: stage.color || '#B3D7FF',
      status: stage.status || 'New',
      stage_key: stage.stage_key || ''
    });
    setShowStageEditModal(true);
  };

  const handleUpdateStage = async () => {
    try {
      await settingsService.updateStageWithLeads(editingStage.id, editingStage.name);
      await settingsService.updateItem(editingStage.id, editingStage.name, {
        color: editingStage.color,
        status: editingStage.status,
        score: 20,
        category: 'New'
      });
      
      await loadSettings();
      setShowStageEditModal(false);
      alert('Stage updated successfully!');
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Error updating stage: ' + error.message);
    }
  };

  const moveStageUp = async (stageId) => {
    try {
      await settingsService.moveStage(stageId, 'up');
      await loadSettings();
    } catch (error) {
      console.error('Error moving stage:', error);
      alert('Error moving stage: ' + error.message);
    }
  };

  const moveStageDown = async (stageId) => {
    try {
      await settingsService.moveStage(stageId, 'down');
      await loadSettings();
    } catch (error) {
      console.error('Error moving stage:', error);
      alert('Error moving stage: ' + error.message);
    }
  };

  // Form Field Edit Functions
  const openFormFieldEditModal = (field) => {
    setEditingFormField({
      id: field.id,
      name: field.name,
      originalData: { ...field }
    });
    setShowFormFieldEditModal(true);
  };

  const handleFormFieldUpdate = async () => {
    try {
      const field = editingFormField.originalData;
      await settingsService.updateItem(editingFormField.id, editingFormField.name, {
        field_type: field.field_type,
        is_default: field.is_default || false,
        is_custom: field.is_custom,
        field_key: field.field_key,
        dropdown_options: field.dropdown_options
      });
      
      await loadSettings();
      setShowFormFieldEditModal(false);
      alert('Field name updated successfully!');
    } catch (error) {
      console.error('Error updating field name:', error);
      alert('Error updating field name: ' + error.message);
    }
  };

  // Grade Modal Functions
  const openAddGradeModal = () => {
    setGradeModalData({
      id: null,
      name: '',
      isEditing: false
    });
    setShowGradeModal(true);
  };

  const openEditGradeModal = (grade) => {
    setGradeModalData({
      id: grade.id,
      name: grade.name,
      isEditing: true
    });
    setShowGradeModal(true);
  };

  const handleGradeSubmit = async () => {
    if (!gradeModalData.name.trim()) {
      alert('Grade name is required');
      return;
    }

    try {
      if (gradeModalData.isEditing) {
        await settingsService.updateGradeWithLeads(gradeModalData.id, gradeModalData.name);
        alert('Grade updated successfully!');
      } else {
        await settingsService.createItem('grades', gradeModalData.name);
        alert('Grade added successfully!');
      }
      
      await loadSettings();
      setShowGradeModal(false);
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Error saving grade: ' + error.message);
    }
  };

  const removeGrade = async (gradeId) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      try {
        await settingsService.deleteGradeWithLeads(gradeId);
        await loadSettings();
        alert('Grade deleted successfully!');
      } catch (error) {
        console.error('Error deleting grade:', error);
        alert('Error deleting grade: ' + error.message);
      }
    }
  };

  // Source Modal Functions
  const openAddSourceModal = () => {
    setSourceModalData({
      id: null,
      name: '',
      isEditing: false
    });
    setShowSourceModal(true);
  };

  const openEditSourceModal = (source) => {
    setSourceModalData({
      id: source.id,
      name: source.name,
      isEditing: true
    });
    setShowSourceModal(true);
  };

  const handleSourceSubmit = async () => {
    if (!sourceModalData.name.trim()) {
      alert('Source name is required');
      return;
    }

    try {
      if (sourceModalData.isEditing) {
        await settingsService.updateSourceWithLeads(sourceModalData.id, sourceModalData.name);
        alert('Source updated successfully!');
      } else {
        await settingsService.createItem('sources', sourceModalData.name);
        alert('Source added successfully!');
      }
      
      await loadSettings();
      setShowSourceModal(false);
    } catch (error) {
      console.error('Error saving source:', error);
      alert('Error saving source: ' + error.message);
    }
  };

  const removeSource = async (sourceId) => {
    if (window.confirm('Are you sure you want to delete this source?')) {
      try {
        await settingsService.deleteSourceWithLeads(sourceId);
        await loadSettings();
        alert('Source deleted successfully!');
      } catch (error) {
        console.error('Error deleting source:', error);
        alert('Error deleting source: ' + error.message);
      }
    }
  };

  // ✅ UPDATED: Counsellor Management Functions - Added role handling
  const openAddCounsellorModal = () => {
    setCounsellorFormData({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });
    setEditingCounsellor(null);
    setShowCounsellorModal(true);
  };

  const openEditCounsellorModal = async (counsellor) => {
    try {
      const counsellorWithUser = await settingsService.getCounsellorWithUser(counsellor.id);
      
      if (counsellorWithUser.users) {
        setCounsellorFormData({
          name: counsellorWithUser.users.full_name || counsellorWithUser.name,
          email: counsellorWithUser.users.email || '',
          password: '',
          role: counsellorWithUser.users.role || 'user'
        });
      } else {
        setCounsellorFormData({
          name: counsellor.name,
          email: '',
          password: '',
          role: 'user'
        });
      }
      
      setEditingCounsellor(counsellor);
      setShowCounsellorModal(true);
    } catch (error) {
      console.error('Error loading counsellor details:', error);
      alert('Error loading counsellor details: ' + error.message);
    }
  };

  const handleCounsellorSubmit = async () => {
    if (!counsellorFormData.name.trim() || !counsellorFormData.email.trim()) {
      alert('Name and Email are required');
      return;
    }

    if (!editingCounsellor && !counsellorFormData.password.trim()) {
      alert('Password is required for new counsellors');
      return;
    }

    if (!counsellorFormData.role) {
      alert('Role/Permission is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(counsellorFormData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setCounsellorSubmitting(true);

      if (editingCounsellor) {
        await settingsService.updateCounsellorWithUser(editingCounsellor.id, counsellorFormData);
        alert('Counsellor updated successfully!');
      } else {
        await settingsService.createCounsellorWithUser(counsellorFormData);
        alert('Counsellor created successfully!');
      }

      await loadSettings();
      setShowCounsellorModal(false);
      setCounsellorFormData({
        name: '',
        email: '',
        password: '',
        role: 'user'
      });
      setEditingCounsellor(null);

    } catch (error) {
      console.error('Error saving counsellor:', error);
      alert('Error saving counsellor: ' + error.message);
    } finally {
      setCounsellorSubmitting(false);
    }
  };

  const removeCounsellor = async (counsellorId) => {
    if (window.confirm('Are you sure you want to delete this counsellor? All leads assigned to this counsellor will be changed to "Not Assigned".')) {
      try {
        await settingsService.deleteCounsellorWithUser(counsellorId);
        await loadSettings();
        alert('Counsellor deleted successfully! All their assigned leads have been changed to "Not Assigned".');
      } catch (error) {
        console.error('Error deleting counsellor:', error);
        alert('Error deleting counsellor: ' + error.message);
      }
    }
  };

  // Load data from database
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAllSettings();
      setSettingsData(data);
      
      setSchoolProfile({
        schoolName: data.school.school_name || '',
        academicYearFrom: data.school.academic_year_from || '',
        academicYearTo: data.school.academic_year_to || ''
      });

      // Load display preferences
     const displayPrefs = await settingsService.getDisplayPreferences();
      setLeadsPerPage(displayPrefs.per_page || 50);
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Error loading settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSchoolProfileChange = (field, value) => {
    setSchoolProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await settingsService.updateSchoolSettings({
        school_name: schoolProfile.schoolName,
        academic_year_from: schoolProfile.academicYearFrom,
        academic_year_to: schoolProfile.academicYearTo
      });
      await loadSettings();
      alert('School profile saved successfully!');
    } catch (error) {
      console.error('Error saving school profile:', error);
      alert('Error saving school profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisplayPreferences = async () => {
  try {
    setSavingDisplayPrefs(true);
    await settingsService.updateDisplayPreferences(leadsPerPage);
    
    // Refresh local settings
    await loadSettings();
    
    // Refresh global context settings
    refreshSettingsData();
    
    alert('Display preferences saved successfully!');
  } catch (error) {
    console.error('Error saving display preferences:', error);
    alert('Error saving display preferences: ' + error.message);
  } finally {
    setSavingDisplayPrefs(false);
  }
};


  const addNewFormField = async () => {
    if (customFieldData.fieldName.trim()) {
      try {
        const customFieldsCount = await settingsService.getCustomFormFieldsCount();
        
        if (customFieldsCount >= 5) {
          alert('Maximum 5 additional custom fields allowed!');
          return;
        }
              
        const fieldTypeLabel = fieldTypeOptions.find(opt => opt.value === customFieldData.fieldType)?.label || 'Text';
        const fieldKey = 'custom_' + customFieldData.fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
        
        await settingsService.createItem('form_fields', customFieldData.fieldName, {
          field_type: fieldTypeLabel,
          is_default: false,
          is_custom: true,
          field_key: fieldKey
        });
              
        await loadSettings();
        setCustomFieldData({ fieldName: '', fieldType: 'text' });
        setShowCustomFieldModal(false);
        alert('Form field added successfully!');
      } catch (error) {
        console.error('Error adding form field:', error);
        alert('Error adding form field: ' + error.message);
      }
    }
  };

  const toggleStageStatus = async (stageId) => {
    try {
      await settingsService.toggleItemStatus(stageId);
      await loadSettings();
      alert('Stage status updated successfully!');
    } catch (error) {
      console.error('Error updating stage status:', error);
      alert('Error updating stage status: ' + error.message);
    }
  };

  const [showDropdownOptionsModal, setShowDropdownOptionsModal] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState(['']);
  const [editingFieldId, setEditingFieldId] = useState(null);

  const handleDropdownOptionsChange = (index, value) => {
    const newOptions = [...dropdownOptions];
    newOptions[index] = value;
    setDropdownOptions(newOptions);
  };

  const addDropdownOption = () => {
    setDropdownOptions([...dropdownOptions, '']);
  };

  const removeDropdownOption = (index) => {
    const newOptions = dropdownOptions.filter((_, i) => i !== index);
    setDropdownOptions(newOptions);
  };

  const openDropdownOptionsModal = (fieldId) => {
    const field = settingsData.form_fields.find(f => f.id === fieldId);
    setEditingFieldId(fieldId);
    const options = field.dropdown_options ? 
      (typeof field.dropdown_options === 'string' ? 
        field.dropdown_options.split(',').map(opt => opt.trim()) : 
        field.dropdown_options) : 
      [''];
    setDropdownOptions(options.length > 0 ? options : ['']);
    setShowDropdownOptionsModal(true);
  };

  const saveDropdownOptions = async () => {
    try {
      const field = settingsData.form_fields.find(f => f.id === editingFieldId);
      if (!field) {
        alert('Field not found');
        return;
      }

      const filteredOptions = dropdownOptions.filter(opt => opt.trim() !== '');
      if (filteredOptions.length === 0) {
        alert('Please add at least one option');
        return;
      }

      await settingsService.updateItem(editingFieldId, field.name, {
        field_type: field.field_type,
        is_default: field.is_default || false,
        is_custom: field.is_custom,
        field_key: field.field_key,
        dropdown_options: filteredOptions
      });

      await loadSettings();
      setShowDropdownOptionsModal(false);
      alert('Dropdown options updated successfully!');
    } catch (error) {
      console.error('Error updating dropdown options:', error);
      alert('Error updating dropdown options: ' + error.message);
    }
  };

  const removeCustomField = async (fieldId) => {
    const field = settingsData.form_fields.find(f => f.id === fieldId);
    
    if (!settingsService.isFieldDeletableByKey(field.field_key)) {
      alert('This field cannot be deleted as it is a system field.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        await settingsService.deleteItem(fieldId);
        await loadSettings();
        alert('Field deleted successfully!');
      } catch (error) {
        console.error('Error deleting field:', error);
        alert('Error deleting field: ' + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
        <LeftSidebar 
          activeNavItem="settings"
          onLogout={onLogout}
          user={user}
        />
        <div className="nova-main">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Loader2 className="spinner" size={40} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-crm" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LeftSidebar 
        activeNavItem="settings"
        onLogout={onLogout}
        user={user}
      />

      <div className="nova-main">
        <div className="settings-container">
          <div className="settings-header">
            <Settings size={24} />
            <h1>Settings</h1>
          </div>

          {/* School Profile Section */}
          <div className="settings-section">
            <h2>School Profile</h2>
            <div className="settings-section-content">
              <div className="settings-school-profile">
                <div className="settings-logo-section">
                  <div className="settings-logo-placeholder">
                    <img 
                      src={novalogo} 
                      alt="NOVA International School" 
                      className="logo-image"
                      style={{
                        width: '100%',
                        maxWidth: '140px',
                        height: 'auto',
                        marginBottom: '20px',
                        marginLeft:'20px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
                <div className="settings-profile-fields">
                  <div className="settings-field-group">
                    <label>School Name</label>
                    <input
                      type="text"
                      value={schoolProfile.schoolName}
                      onChange={(e) => handleSchoolProfileChange('schoolName', e.target.value)}
                      placeholder="Enter school name"
                    />
                  </div>
                  
                  <div className="settings-field-row">
                    <div className="settings-field-group">
                      <label>Academic Year</label>
                      <div className="settings-year-inputs">
                        <input
                          type="text"
                          value={schoolProfile.academicYearFrom}
                          onChange={(e) => handleSchoolProfileChange('academicYearFrom', e.target.value)}
                          placeholder="From"
                        />
                        <span>To</span>
                        <input
                          type="text"
                          value={schoolProfile.academicYearTo}
                          onChange={(e) => handleSchoolProfileChange('academicYearTo', e.target.value)}
                          placeholder="To"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="settings-footer">
                <button 
                  className="settings-update-btn" 
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Update School Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
           
          <div className='settings-two-column-row'>                    
            {/* Lead Form Fields Section */}
            <div className="settings-section">
              <h2>Lead Form Fields</h2>
              <div className="settings-section-content">
                <div className="settings-table-container">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>Field Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settingsData.form_fields.map((field) => {
                        const isSuperConstant = field.field_key ? 
                          settingsService.isSuperConstantFieldByKey(field.field_key) : 
                          settingsService.isSuperConstantField(field.name);
                        
                        const isConstant = field.field_key ? 
                          settingsService.isConstantFieldByKey(field.field_key) : 
                          settingsService.isConstantField(field.name);
                        
                        const isCustom = field.field_key ? 
                          settingsService.isCustomFieldByKey(field.field_key) : 
                          settingsService.isCustomField(field.name);
                        
                        return (
                          <tr key={field.id}>
                            <td>
                              <span>{field.name}</span>
                              {field.field_type === 'Dropdown' && field.dropdown_options && (
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                  Options: {field.dropdown_options.join(', ')}
                                </div>
                              )}
                              {field.field_key && (
                                <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                                  Key: {field.field_key}
                                </div>
                              )}
                            </td>
                            <td>
                              {field.field_type}
                              {field.field_type === 'Dropdown' && isCustom && (
                                <button
                                  className="settings-edit-dropdown-btn"
                                  onClick={() => openDropdownOptionsModal(field.id)}
                                  style={{ marginLeft: '8px', fontSize: '12px', padding: '2px 6px' }}
                                >
                                  Edit Options
                                </button>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {(isConstant || isCustom) && (
                                  <button 
                                    className="settings-edit-btn"
                                    onClick={() => openFormFieldEditModal(field)}
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}
                                
                                {isCustom && (
                                  <button
                                    className="settings-remove-btn"
                                    onClick={() => removeCustomField(field.id)}
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Add Custom Fields section */}
                  <div className="settings-add-custom-section">
                    <h3>Add Custom Fields</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button 
                        className="settings-add-btn"
                        onClick={() => setShowCustomFieldModal(true)}
                      >
                        <Plus size={16} />
                        Add Field
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Stages Section */}
            <div className="settings-section">
              <h2>Lead Stages</h2>
              <div className="settings-section-content">
                <div className="settings-table-container">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>Move</th>
                        <th>Stage Name</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settingsData.stages.map((stage, index) => (
                        <tr key={stage.id} style={{ opacity: stage.is_active ? 1 : 0.5 }}>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="settings-move-btn"
                                onClick={() => moveStageUp(stage.id)}
                                disabled={index === 0 || !stage.is_active}
                                style={{ opacity: (index === 0 || !stage.is_active) ? 0.3 : 1 }}
                              >
                                ↑
                              </button>
                              <button
                                className="settings-move-btn"
                                onClick={() => moveStageDown(stage.id)}
                                disabled={index === settingsData.stages.length - 1 || !stage.is_active}
                                style={{ opacity: (index === settingsData.stages.length - 1 || !stage.is_active) ? 0.3 : 1 }}
                              >
                                ↓
                              </button>
                            </div>
                          </td>
                          <td>
                            <div 
                              className="settings-stage-name-badge"
                              style={{ backgroundColor: stage.color }}
                            >
                              {stage.name}
                            </div>
                            {stage.stage_key && (
                              <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                                Key: {stage.stage_key}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="settings-stage-status">{stage.status || 'New'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className={`settings-toggle-btn ${stage.is_active ? 'active' : 'inactive'}`}
                                onClick={() => toggleStageStatus(stage.id)}
                              >
                                {stage.is_active ? 'ON' : 'OFF'}
                              </button>
                              <button 
                                className="settings-edit-btn"
                                onClick={() => handleEditStage(stage)}
                                disabled={!stage.is_active}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stage Edit Modal */}
              {showStageEditModal && (
                <>
                  <div className="settings-modal-overlay" onClick={() => setShowStageEditModal(false)}></div>
                  <div className="settings-modal">
                    <div className="settings-modal-header">
                      <h3>Edit Stage</h3>
                      <button 
                        className="settings-modal-close"
                        onClick={() => setShowStageEditModal(false)}
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="settings-modal-body">
                      <div className="settings-field-group">
                        <label>Stage Name</label>
                        <input
                          type="text"
                          value={editingStage.name}
                          onChange={(e) => setEditingStage(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="settings-field-group">
                        <label>Status</label>
                        <input
                          type="text"
                          value={editingStage.status}
                          onChange={(e) => setEditingStage(prev => ({ ...prev, status: e.target.value }))}
                        />
                      </div>
                      <div className="settings-field-group">
                        <label>Color</label>
                        <input
                          type="color"
                          value={editingStage.color}
                          onChange={(e) => setEditingStage(prev => ({ ...prev, color: e.target.value }))}
                        />
                      </div>
                      {editingStage.stage_key && (
                        <div className="settings-field-group">
                          <label>Stage Key (Read-only)</label>
                          <input
                            type="text"
                            value={editingStage.stage_key}
                            disabled
                            style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="settings-modal-footer">
                      <button 
                        className="settings-modal-submit"
                        onClick={handleUpdateStage}
                      >
                        Update Stage
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
        </div>

        {/* Display Preferences Section */}
        <div className="settings-section">
          <h2>Display Preferences</h2>
          <div className="settings-section-content">
            <div className="settings-display-prefs">
              <div className="settings-field-group">
                <label>Leads Per Page</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    value={leadsPerPage}
                    onChange={(e) => setLeadsPerPage(parseInt(e.target.value))}
                    className="settings-display-prefs-select"
                  >
                    <option value="50">50 leads</option>
                    <option value="100">100 leads</option>
                    <option value="250">250 leads</option>
                    <option value="1000">1000 leads</option>
                  </select>
                  <span style={{ 
                    fontSize: '13px', 
                    color: '#6b7280',
                    flex: 1
                  }}>
                    Choose how many leads to display per page
                  </span>
                </div>
              </div>
            </div>
            <div className="settings-footer">
              <button 
                className="settings-update-btn" 
                onClick={handleSaveDisplayPreferences}
                disabled={savingDisplayPrefs}
              >
                {savingDisplayPrefs ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save Display Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
           
        <div className='settings-two-column-row'>
            {/* Counsellors Section */}
            <div className="settings-section">
              <h2>Counsellors</h2>
              <div className="settings-section-content">
                <div className="settings-list-section">
                  <div className="settings-add-new-section">
                    <button 
                      className="settings-add-new-btn"
                      onClick={openAddCounsellorModal}
                    >
                      <Plus size={16} />
                      Add New
                    </button>
                  </div>
                  
                  <div className="settings-list-items">
                    {settingsData.counsellors.map((counsellor) => {
                      const roleDisplay = getRoleDisplay(counsellor.role);
                      return (
                        <div key={counsellor.id} className="settings-list-item">
                          <div className="settings-item-content">
                            <span className="settings-item-label">Counsellor Name</span>
                            <span className="settings-item-value">{counsellor.name}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                              {counsellor.user_id && (
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  <User size={12} style={{ display: 'inline-block', marginRight: '4px' }} />
                                  User Account Linked
                                </div>
                              )}
                              {/* ✅ NEW: Display role badge */}
                              {counsellor.role && (
                                <div style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: roleDisplay.color + '20',
                                  color: roleDisplay.color,
                                  width: 'fit-content'
                                }}>
                                  <Shield size={11} />
                                  {roleDisplay.label}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="settings-item-actions">
                            <span className="settings-item-label">Edit</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="settings-edit-btn"
                                onClick={() => openEditCounsellorModal(counsellor)}
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className="settings-remove-btn"
                                onClick={() => removeCounsellor(counsellor.id)}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Source Section */}
            <div className="settings-section">
              <h2>Lead Source</h2>
              <div className="settings-section-content">
                <div className="settings-list-section">
                  <div className="settings-add-new-section">
                    <button 
                      className="settings-add-new-btn"
                      onClick={openAddSourceModal}
                    >
                      <Plus size={16} />
                      Add New
                    </button>
                  </div>
                  
                  <div className="settings-list-items">
                    {settingsData.sources.map((source) => (
                      <div key={source.id} className="settings-list-item">
                        <div className="settings-item-content">
                          <span className="settings-item-label">Lead Source</span>
                          <span className="settings-item-value">{source.name}</span>
                        </div>
                        <div className="settings-item-actions">
                          <span className="settings-item-label">Edit</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="settings-edit-btn"
                              onClick={() => openEditSourceModal(source)}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="settings-remove-btn"
                              onClick={() => removeSource(source.id)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Grades Section */}
            <div className="settings-section">
              <h2>Grades</h2>
              <div className="settings-section-content">
                <div className="settings-list-section">
                  <div className="settings-add-new-section">
                    <button 
                      className="settings-add-new-btn"
                      onClick={openAddGradeModal}
                    >
                      <Plus size={16} />
                      Add New
                    </button>
                  </div>
                  
                  <div className="settings-list-items">
                    {settingsData.grades.map((grade) => (
                      <div key={grade.id} className="settings-list-item">
                        <div className="settings-item-content">
                          <span className="settings-item-label">Grade</span>
                          <span className="settings-item-value">{grade.name}</span>
                        </div>
                        <div className="settings-item-actions">
                          <span className="settings-item-label">Edit</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="settings-edit-btn"
                              onClick={() => openEditGradeModal(grade)}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="settings-remove-btn"
                              onClick={() => removeGrade(grade.id)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Field Edit Modal */}
          {showFormFieldEditModal && (
            <>
              <div className="settings-modal-overlay" onClick={() => setShowFormFieldEditModal(false)}></div>
              <div className="settings-modal">
                <div className="settings-modal-header">
                  <h3>Edit Field Name</h3>
                  <button 
                    className="settings-modal-close"
                    onClick={() => setShowFormFieldEditModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="settings-modal-body">
                  <div className="settings-field-group">
                    <label>Field Name</label>
                    <input
                      type="text"
                      value={editingFormField.name}
                      onChange={(e) => setEditingFormField(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter field name"
                    />
                  </div>
                </div>
                <div className="settings-modal-footer">
                  <button 
                    className="settings-modal-submit"
                    onClick={handleFormFieldUpdate}
                  >
                    Update Field
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Grade Modal */}
          {showGradeModal && (
            <>
              <div className="settings-modal-overlay" onClick={() => setShowGradeModal(false)}></div>
              <div className="settings-modal">
                <div className="settings-modal-header">
                  <h3>{gradeModalData.isEditing ? 'Edit Grade' : 'Add New Grade'}</h3>
                  <button 
                    className="settings-modal-close"
                    onClick={() => setShowGradeModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="settings-modal-body">
                  <div className="settings-field-group">
                    <label>Grade Name</label>
                    <input
                      type="text"
                      value={gradeModalData.name}
                      onChange={(e) => setGradeModalData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter grade name"
                    />
                  </div>
                </div>
                <div className="settings-modal-footer">
                  <button 
                    className="settings-modal-submit"
                    onClick={handleGradeSubmit}
                  >
                    {gradeModalData.isEditing ? 'Update Grade' : 'Add Grade'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Source Modal */}
          {showSourceModal && (
            <>
              <div className="settings-modal-overlay" onClick={() => setShowSourceModal(false)}></div>
              <div className="settings-modal">
                <div className="settings-modal-header">
                  <h3>{sourceModalData.isEditing ? 'Edit Source' : 'Add New Source'}</h3>
                  <button 
                    className="settings-modal-close"
                    onClick={() => setShowSourceModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="settings-modal-body">
                  <div className="settings-field-group">
                    <label>Source Name</label>
                    <input
                      type="text"
                      value={sourceModalData.name}
                      onChange={(e) => setSourceModalData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter source name"
                    />
                  </div>
                </div>
                <div className="settings-modal-footer">
                  <button 
                    className="settings-modal-submit"
                    onClick={handleSourceSubmit}
                  >
                    {sourceModalData.isEditing ? 'Update Source' : 'Add Source'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ✅ UPDATED: Counsellor Modal - Added role dropdown (WITHOUT ADMIN) */}
          {showCounsellorModal && (
            <>
              <div className="settings-modal-overlay" onClick={() => setShowCounsellorModal(false)}></div>
              <div className="settings-modal" style={{ maxWidth: '500px' }}>
                <div className="settings-modal-header">
                  <h3>{editingCounsellor ? 'Edit Counsellor' : 'Add New Counsellor'}</h3>
                  <button 
                    className="settings-modal-close"
                    onClick={() => setShowCounsellorModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="settings-modal-body">
                  <div className="settings-field-group">
                    <label>
                      <User size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={counsellorFormData.name}
                      onChange={(e) => setCounsellorFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  
                  <div className="settings-field-group">
                    <label>
                      <Mail size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={counsellorFormData.email}
                      onChange={(e) => setCounsellorFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="settings-field-group">
                    <label>
                      <Lock size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                      Password {editingCounsellor ? '(leave empty to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={counsellorFormData.password}
                      onChange={(e) => setCounsellorFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={editingCounsellor ? "Enter new password" : "Enter password"}
                      required={!editingCounsellor}
                    />
                  </div>

                  {/* ✅ NEW: Role/Permission dropdown WITHOUT ADMIN */}
                  <div className="settings-field-group">
                    <label>
                      <Shield size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                      Role / Permission *
                    </label>
                    <select
                      value={counsellorFormData.role}
                      onChange={(e) => setCounsellorFormData(prev => ({ ...prev, role: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280', 
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px'
                    }}>
                      {roleOptions.find(opt => opt.value === counsellorFormData.role)?.description}
                    </div>
                  </div>
                </div>
                <div className="settings-modal-footer">
                  <button 
                    className="settings-modal-submit"
                    onClick={handleCounsellorSubmit}
                    disabled={counsellorSubmitting}
                  >
                    {counsellorSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {editingCounsellor ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingCounsellor ? 'Update Counsellor' : 'Create Counsellor'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Custom Field Modal */}
          {showCustomFieldModal && (
            <>
              <div className="settings-modal-overlay" onClick={() => setShowCustomFieldModal(false)}></div>
              <div className="settings-modal">
                <div className="settings-modal-header">
                  <h3>Add Custom Field</h3>
                  <button 
                    className="settings-modal-close"
                    onClick={() => setShowCustomFieldModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="settings-modal-body">
                  <div className="settings-field-group">
                    <label>Field Name</label>
                    <input
                      type="text"
                      value={customFieldData.fieldName}
                      onChange={(e) => setCustomFieldData(prev => ({ ...prev, fieldName: e.target.value }))}
                      placeholder="Enter field name"
                    />
                  </div>
                  
                  <div className="settings-field-group">
                    <label>Field Type</label>
                    <select
                      value={customFieldData.fieldType}
                      onChange={(e) => setCustomFieldData(prev => ({ ...prev, fieldType: e.target.value }))}
                    >
                      {fieldTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="settings-modal-footer">
                  <button 
                    className="settings-modal-submit"
                    onClick={addNewFormField}
                  >
                    Add Field
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Dropdown Options Modal */}
          {showDropdownOptionsModal && (
            <>
              <div className="settings-modal-overlay" onClick={() => setShowDropdownOptionsModal(false)}></div>
              <div className="settings-modal">
                <div className="settings-modal-header">
                  <h3>Edit Dropdown Options</h3>
                  <button 
                    className="settings-modal-close"
                    onClick={() => setShowDropdownOptionsModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="settings-modal-body">
                  {dropdownOptions.map((option, index) => (
                    <div key={index} className="settings-field-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleDropdownOptionsChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        style={{ flex: 1 }}
                      />
                      {dropdownOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDropdownOption(index)}
                          className="settings-remove-btn"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDropdownOption}
                    className="settings-add-btn"
                    style={{ marginTop: '12px' }}
                  >
                    <Plus size={16} />
                    Add Option
                  </button>
                </div>
                <div className="settings-modal-footer">
                  <button 
                    className="settings-modal-submit"
                    onClick={saveDropdownOptions}
                  >
                    Save Options
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
