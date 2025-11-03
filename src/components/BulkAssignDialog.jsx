import React, { useState } from 'react';
import { X, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';


const BulkAssignDialog = ({ 
  isOpen, 
  onClose, 
  selectedLeads,
  leadsData,
  counsellors,
  onAssignComplete
}) => {
  const [selectedCounsellor, setSelectedCounsellor] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  if (!isOpen) return null;

  const selectedCount = selectedLeads.length;
  const showIds = selectedCount <= 5 && selectedCount > 0;
  
  const getSelectedLeadDetails = () => {
    return selectedLeads.map(id => {
      const lead = leadsData.find(l => l.id === id);
      return lead ? { id: lead.id, name: lead.parentsName, currentCounsellor: lead.counsellor } : null;
    }).filter(Boolean);
  };

  const selectedLeadDetails = getSelectedLeadDetails();

  const handleAssign = async () => {
    if (!selectedCounsellor) {
      alert('Please select a counsellor');
      return;
    }

    setIsAssigning(true);
    
    try {
      // Update all selected leads with the new counsellor
      const { error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ 
          counsellor: selectedCounsellor,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedLeads);

      if (error) throw error;

      // Show success state
      setAssignSuccess(true);
      setTimeout(() => {
        setIsAssigning(false);
        setAssignSuccess(false);
        setSelectedCounsellor('');
        onAssignComplete();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error assigning leads:', error);
      alert('Error assigning leads: ' + error.message);
      setIsAssigning(false);
    }
  };

  return (
    <div className="bulk-assign-overlay">
      <div className="bulk-assign-dialog">
        <div className="bulk-assign-header">
          <div className={`bulk-assign-icon ${assignSuccess ? 'success' : ''}`}>
            {assignSuccess ? (
              <CheckCircle size={24} />
            ) : (
              <Users size={24} />
            )}
          </div>
          <button className="bulk-assign-close" onClick={onClose} disabled={isAssigning}>
            <X size={20} />
          </button>
        </div>

        <div className="bulk-assign-content">
          {assignSuccess ? (
            <>
              <h2>Assignment Successful!</h2>
              <p className="bulk-assign-message">
                {selectedCount} lead{selectedCount > 1 ? 's have' : ' has'} been assigned to {selectedCounsellor}.
              </p>
            </>
          ) : (
            <>
              <h2>Bulk Assign Leads</h2>
              <p className="bulk-assign-message">
                Bulk assign {selectedCount === 1 ? 'this lead' : `${selectedCount} leads`} to a counsellor.
              </p>

              {/* Counsellor Selection Dropdown */}
              <div className="bulk-assign-select-container">
                <label className="bulk-assign-label">
                  Select Counsellor
                </label>
                <select
                  value={selectedCounsellor}
                  onChange={(e) => setSelectedCounsellor(e.target.value)}
                  className="bulk-assign-select"
                >
                  <option value="">-- Select Counsellor --</option>
                  {counsellors.map(counsellor => (
                    <option key={counsellor.id} value={counsellor.name}>
                      {counsellor.name}
                    </option>
                  ))}
                </select>
              </div>

              {showIds && selectedLeadDetails.length > 0 && (
                <div className="bulk-assign-leads-list">
                  <h4>Selected Lead{selectedCount > 1 ? 's' : ''}:</h4>
                  <div className="bulk-assign-leads-scroll">
                    {selectedLeadDetails.map(lead => (
                      <div key={lead.id} className="bulk-assign-lead-item">
                        <span className="bulk-assign-lead-id">ID: {lead.id}</span>
                        <span className="bulk-assign-lead-name">{lead.name}</span>
                        <span className="bulk-assign-lead-current">
                          (Currently: {lead.currentCounsellor})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCount > 5 && (
                <div className="bulk-assign-notice">
                  <p>
                    <strong>Bulk assignment:</strong> {selectedCount} leads will be assigned.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bulk-assign-actions">
          <button 
            className="bulk-assign-cancel"
            onClick={onClose}
            disabled={isAssigning}
          >
            Cancel
          </button>
          <button 
            className="bulk-assign-submit"
            onClick={handleAssign}
            disabled={isAssigning || assignSuccess || !selectedCounsellor}
          >
            {isAssigning ? (
              <>
                <div className="bulk-assign-spinner" />
                Assigning...
              </>
            ) : assignSuccess ? (
              <>
                <CheckCircle size={16} />
                Assigned
              </>
            ) : (
              <>
                <Users size={16} />
                Bulk Assign {selectedCount === 1 ? 'Lead' : `${selectedCount} Leads`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAssignDialog;
