import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExportLeadsDialog = ({ 
  isOpen, 
  onClose, 
  selectedLeads,
  leadsData 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const selectedCount = selectedLeads.length;
  
  const getSelectedLeadDetails = () => {
    return selectedLeads.map(id => {
      const lead = leadsData.find(l => l.id === id);
      return lead;
    }).filter(Boolean);
  };

  const handleExport = () => {
    setIsExporting(true);
    
    try {
      const selectedLeadsData = getSelectedLeadDetails();

      // Prepare data for Excel
      const exportData = selectedLeadsData.map(lead => ({
        'Parent Name': lead.parentsName || '',
        'Kids Name': lead.kidsName || '',
        'Grade': lead.grade || '',
        'Current School': lead.currentSchool || '',
        'Phone Number': lead.phone || '',
        'Second Phone': lead.secondPhone || '',
        'Email': lead.email || '',
        'Source': lead.source || '',
        'Location': lead.location || '',
        'Occupation': lead.occupation || '',
        'Status': lead.category || ''
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Export');

      // Set column widths
      const columnWidths = [
        { wch: 20 }, // Parent Name
        { wch: 20 }, // Kids Name
        { wch: 15 }, // Grade
        { wch: 25 }, // Current School
        { wch: 18 }, // Phone Number
        { wch: 18 }, // Second Phone
        { wch: 25 }, // Email
        { wch: 15 }, // Source
        { wch: 20 }, // Location
        { wch: 20 }, // Occupation
        { wch: 12 }  // Status
      ];
      worksheet['!cols'] = columnWidths;

      // Make header row bold
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true }
          };
        }
      }

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `leads_export_${date}.xlsx`;

      // Write and download file
      XLSX.writeFile(workbook, filename);

      // Show success state
      setExportSuccess(true);
      setTimeout(() => {
        setIsExporting(false);
        setExportSuccess(false);
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error exporting leads:', error);
      alert('Error exporting leads: ' + error.message);
      setIsExporting(false);
    }
  };

  const showIds = selectedCount <= 5 && selectedCount > 0;
  const selectedLeadDetails = getSelectedLeadDetails();

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        <div className="export-dialog-header">
          <div className="export-icon-container">
            {exportSuccess ? (
              <CheckCircle size={24} className="success-icon" />
            ) : (
              <FileSpreadsheet size={24} className="file-icon" />
            )}
          </div>
          <button className="close-button" onClick={onClose} disabled={isExporting}>
            <X size={20} />
          </button>
        </div>

        <div className="export-dialog-content">
          {exportSuccess ? (
            <>
              <h2>Export Successful!</h2>
              <p className="export-message">
                Your leads have been exported successfully.
              </p>
            </>
          ) : (
            <>
              <h2>Export Leads to Excel</h2>
              <p className="export-message">
                Export {selectedCount === 1 ? 'this lead' : `${selectedCount} leads`} to an Excel file with the following columns:
              </p>

              <div className="export-columns-info">
                <div className="columns-list">
                  <span className="column-badge">Parent Name</span>
                  <span className="column-badge">Kids Name</span>
                  <span className="column-badge">Grade</span>
                  <span className="column-badge">Current School</span>
                  <span className="column-badge">Phone Number</span>
                  <span className="column-badge">Second Phone</span>
                  <span className="column-badge">Email</span>
                  <span className="column-badge">Source</span>
                  <span className="column-badge">Location</span>
                  <span className="column-badge">Occupation</span>
                  <span className="column-badge">Status</span>
                </div>
              </div>

              {showIds && selectedLeadDetails.length > 0 && (
                <div className="selected-leads-list">
                  <h4>Selected Lead{selectedCount > 1 ? 's' : ''}:</h4>
                  <div className="leads-list">
                    {selectedLeadDetails.map(lead => (
                      <div key={lead.id} className="lead-item">
                        <span className="lead-id">ID: {lead.id}</span>
                        <span className="lead-name">{lead.parentsName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCount > 5 && (
                <div className="bulk-export-notice">
                  <p><strong>Bulk export:</strong> {selectedCount} leads will be exported.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="export-dialog-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button 
            className="export-button" 
            onClick={handleExport}
            disabled={isExporting || exportSuccess}
          >
            {isExporting ? (
              <>
                <div className="spinner" />
                Exporting...
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle size={16} />
                Exported
              </>
            ) : (
              <>
                <Download size={16} />
                Export to Excel
              </>
            )}
          </button>
        </div>
      </div>

      
    </div>
  );
};

export default ExportLeadsDialog;
