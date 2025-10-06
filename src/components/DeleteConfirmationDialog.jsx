import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

const DeleteConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedLeads,
  leadsData 
}) => {
  if (!isOpen) return null;

  const selectedCount = selectedLeads.length;
  const showIds = selectedCount <= 5 && selectedCount > 0;
  
  const getSelectedLeadDetails = () => {
    return selectedLeads.map(id => {
      const lead = leadsData.find(l => l.id === id);
      return lead ? { id: lead.id, name: lead.parentsName } : null;
    }).filter(Boolean);
  };

  const selectedLeadDetails = getSelectedLeadDetails();

  return (
    <div className="delete-dialog-overlay">
      <div className="delete-dialog">
        <div className="delete-dialog-header">
          <div className="delete-icon-container">
            <AlertTriangle size={24} className="alert-icon" />
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="delete-dialog-content">
          <h2>Confirm Deletion</h2>
          <p className="delete-message">
            Are you sure you want to delete {selectedCount === 1 ? 'this lead' : `these ${selectedCount} leads`}? 
            This action cannot be undone.
          </p>

          {showIds && selectedLeadDetails.length > 0 && (
            <div className="selected-leads-list">
              <h4>Selected Lead{selectedCount > 1 ? 's' : ''}:</h4>
              <div className="leads-list">
                {selectedLeadDetails.map(lead => (
                  <div key={lead.id} className="lead-item">
                    <span className="lead-id">ID: {lead.id}</span>
                    <span className="lead-name">{lead.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCount > 5 && (
            <div className="bulk-delete-notice">
              <p><strong>Bulk deletion:</strong> {selectedCount} leads will be deleted.</p>
            </div>
          )}
        </div>

        <div className="delete-dialog-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="delete-button" onClick={onConfirm}>
            <Trash2 size={16} />
            Delete {selectedCount === 1 ? 'Lead' : `${selectedCount} Leads`}
          </button>
        </div>
      </div>

      <style jsx>{`
        .delete-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          font-family: 'Inter', sans-serif;
        }

        .delete-dialog {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .delete-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .delete-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: #fef2f2;
          border-radius: 50%;
        }

        .alert-icon {
          color: #dc2626;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .delete-dialog-content {
          padding: 20px 24px;
        }

        .delete-dialog-content h2 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .delete-message {
          margin: 0 0 20px 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .selected-leads-list {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .selected-leads-list h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .leads-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .lead-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .lead-item:last-child {
          border-bottom: none;
        }

        .lead-id {
          font-size: 12px;
          font-weight: 600;
          color: #6366f1;
          background: #eef2ff;
          padding: 2px 6px;
          border-radius: 4px;
          min-width: 50px;
        }

        .lead-name {
          font-size: 13px;
          color: #374151;
          font-weight: 500;
        }

        .bulk-delete-notice {
          background: #fffbeb;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .bulk-delete-notice p {
          margin: 0;
          font-size: 13px;
          color: #92400e;
        }

        .delete-dialog-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 0 0 12px 12px;
        }

        .cancel-button, .delete-button {
          flex: 1;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .cancel-button {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .cancel-button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .delete-button {
          background: #dc2626;
          color: white;
          border: 1px solid #dc2626;
        }

        .delete-button:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }

        .delete-button:active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
};

export default DeleteConfirmationDialog;