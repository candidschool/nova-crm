import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { useSettingsData } from '../contexts/SettingsDataProvider';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Download
} from 'lucide-react';

const ImportLeadsModal = ({ isOpen, onClose, onComplete }) => {
  const fileInputRef = useRef(null);
  
  // Settings data
  const { 
    settingsData, 
    getStageKeyFromName,
    getStageScore,
    getStageCategory 
  } = useSettingsData();

  // States
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);

  // Constants
  const CHUNK_SIZE = 500;
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  // Validate file
  const validateFile = (file) => {
    if (!file) return 'Please select a file';
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 100MB';
    }
    
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['csv', 'xlsx', 'xls'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return 'Only CSV and Excel files are allowed';
    }
    
    return null;
  };

  // Parse CSV file
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('CSV parsing failed: ' + results.errors[0].message));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => reject(error)
      });
    });
  };

  // Parse Excel file
  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }
          
          // Convert to object format with headers
          const headers = jsonData[0];
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          resolve(rows);
        } catch (error) {
          reject(new Error('Excel parsing failed: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Get default stage
  const getDefaultStage = () => {
    if (settingsData.stages.length > 0) {
      return settingsData.stages[0].stage_key || settingsData.stages[0].name;
    }
    return 'new_lead';
  };

  // Process single row with fallbacks - UPDATED with Phone Splitting
  const processRow = (row, existingPhones) => {
    // Normalize headers (case insensitive)
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = key.toLowerCase().trim();
      normalizedRow[normalizedKey] = row[key];
    });

    // Extract data with fallbacks
    let parentsName = normalizedRow['parents name'] || normalizedRow['parent name'] || normalizedRow['parentsname'] || normalizedRow['father name'] || normalizedRow['mother name'] || '';
    let kidsName = normalizedRow['kids name'] || normalizedRow['kid name'] || normalizedRow['child name'] || normalizedRow['kidsname'] || normalizedRow['student name'] || '';
    let phone = normalizedRow['phone'] || normalizedRow['mobile'] || normalizedRow['number'] || normalizedRow['primary phone'] || normalizedRow['contact'] || '';
    let secondPhone = normalizedRow['second phone'] || normalizedRow['secondary phone'] || normalizedRow['alternate phone'] || normalizedRow['second mobile'] || normalizedRow['alternate mobile'] || normalizedRow['secondphone'] || normalizedRow['phone 2'] || normalizedRow['mobile 2'] || '';
    let email = normalizedRow['email'] || normalizedRow['email address'] || normalizedRow['mail'] || '';
    let location = normalizedRow['location'] || normalizedRow['address'] || normalizedRow['city'] || normalizedRow['area'] || '';
    let grade = normalizedRow['grade'] || normalizedRow['class'] || normalizedRow['standard'] || normalizedRow['std'] || '';
    let source = normalizedRow['source'] || normalizedRow['lead source'] || normalizedRow['referral source'] || '';
    let counsellor = normalizedRow['counsellor'] || normalizedRow['counselor'] || normalizedRow['assigned to'] || normalizedRow['advisor'] || '';
    let occupation = normalizedRow['occupation'] || normalizedRow['job'] || normalizedRow['profession'] || normalizedRow['work'] || '';
    let notes = normalizedRow['notes'] || normalizedRow['remarks'] || normalizedRow['comments'] || normalizedRow['description'] || '';
    let offer = normalizedRow['offer'] || normalizedRow['discount'] || normalizedRow['scholarship'] || '';
    let currentSchool = normalizedRow['current school'] || normalizedRow['school'] || normalizedRow['present school'] || '';

    // Apply fallbacks
    if (!parentsName || parentsName.toString().trim() === '') parentsName = 'NA';
    if (!kidsName || kidsName.toString().trim() === '') kidsName = 'NA';
    
    // Phone splitting logic - check if phone contains "/"
    if (phone && phone.toString().includes('/')) {
      const phoneParts = phone.toString().split('/');
      
      // First part becomes primary phone
      const primaryPhone = phoneParts[0].trim().replace(/\D/g, '');
      
      // Second part becomes secondary phone (if not already set from column)
      if (!secondPhone || secondPhone.toString().trim() === '') {
        const secondaryPhone = phoneParts[1] ? phoneParts[1].trim().replace(/\D/g, '') : '';
        if (secondaryPhone && secondaryPhone.length === 10) {
          secondPhone = secondaryPhone;
        }
      }
      
      // Set primary phone to first part
      phone = primaryPhone;
    }

    // Primary phone validation and fallback
    if (phone) {
      // Clean phone number
      phone = phone.toString().replace(/\D/g, '');
      if (phone.length !== 10) {
        phone = '1234567890';
      }
    } else {
      phone = '1234567890';
    }

    // Secondary phone validation (optional field)
    let processedSecondPhone = '';
    if (secondPhone && secondPhone.toString().trim() !== '') {
      processedSecondPhone = secondPhone.toString().replace(/\D/g, '');
      if (processedSecondPhone.length !== 10) {
        processedSecondPhone = '';
      } else {
        processedSecondPhone = `+91${processedSecondPhone}`;
      }
    }

    // Check for duplicate phone
    const fullPhone = `+91${phone}`;
    if (existingPhones.has(fullPhone)) {
      return { isDuplicate: true, phone: fullPhone };
    }

    // Source fallback
    if (!source || source.toString().trim() === '') {
      source = 'NA';
    } else {
      // Check if source exists in settings
      const sourceExists = settingsData.sources.some(s => 
        s.name.toLowerCase() === source.toString().toLowerCase()
      );
      if (!sourceExists) {
        source = 'NA';
      }
    }

    // Grade fallback
    if (!grade || grade.toString().trim() === '') {
      grade = 'NA';
    } else {
      // Check if grade exists in settings
      const gradeExists = settingsData.grades.some(g => 
        g.name.toLowerCase() === grade.toString().toLowerCase()
      );
      if (!gradeExists) {
        grade = 'NA';
      }
    }

    // Counsellor fallback
    if (!counsellor || counsellor.toString().trim() === '') {
      counsellor = 'Assign Counsellor';
    } else {
      // Check if counsellor exists in settings
      const counsellorExists = settingsData.counsellors.some(c => 
        c.name.toLowerCase() === counsellor.toString().toLowerCase()
      );
      if (!counsellorExists) {
        counsellor = 'Assign Counsellor';
      }
    }

    // Offer fallback
    if (!offer || offer.toString().trim() === '') {
      offer = 'Welcome Kit';
    }

    // Get default stage
    const defaultStageKey = getDefaultStage();
    const score = getStageScore(defaultStageKey);
    const category = getStageCategory(defaultStageKey);

    return {
      isDuplicate: false,
      data: {
        parents_name: parentsName.toString().trim(),
        kids_name: kidsName.toString().trim(),
        phone: fullPhone,
        second_phone: processedSecondPhone,
        email: email ? email.toString().trim() : '',
        location: location ? location.toString().trim() : '',
        grade: grade.toString().trim(),
        stage: defaultStageKey,
        score: score,
        category: category,
        source: source.toString().trim(),
        counsellor: counsellor.toString().trim(),
        occupation: occupation ? occupation.toString().trim() : '',
        notes: notes ? notes.toString().trim() : '',
        offer: offer.toString().trim(),
        current_school: currentSchool ? currentSchool.toString().trim() : '',
        updated_at: new Date().toISOString()
      }
    };
  };

  // Get existing phone numbers
  const getExistingPhones = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEADS)
        .select('phone');
      
      if (error) throw error;
      
      const phoneSet = new Set();
      data.forEach(lead => {
        if (lead.phone) {
          phoneSet.add(lead.phone);
        }
      });
      
      return phoneSet;
    } catch (error) {
      throw new Error('Failed to fetch existing phone numbers: ' + error.message);
    }
  };

  // Process file in chunks
  const processFile = async () => {
    try {
      setIsProcessing(true);
      setProgress({ current: 0, total: 0, stage: 'Parsing file...' });
      setErrors([]);

      // Parse file
      let parsedData;
      if (file.name.toLowerCase().endsWith('.csv')) {
        parsedData = await parseCSV(file);
      } else {
        parsedData = await parseExcel(file);
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error('File is empty or contains no valid data');
      }

      setProgress({ current: 0, total: parsedData.length, stage: 'Loading existing data...' });

      // Get existing phone numbers
      const existingPhones = await getExistingPhones();

      setProgress({ current: 0, total: parsedData.length, stage: 'Processing rows...' });

      // Process data in chunks
      const validRows = [];
      const duplicates = [];
      const processingErrors = [];

      for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
        const chunk = parsedData.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach((row, index) => {
          try {
            const processed = processRow(row, existingPhones);
            
            if (processed.isDuplicate) {
              duplicates.push({
                row: i + index + 1,
                phone: processed.phone,
                error: 'Duplicate phone number'
              });
            } else {
              validRows.push(processed.data);
              // Add to existing phones set to prevent duplicates within the file
              existingPhones.add(processed.data.phone);
            }
          } catch (error) {
            processingErrors.push({
              row: i + index + 1,
              error: error.message
            });
          }
        });

        setProgress({ 
          current: Math.min(i + CHUNK_SIZE, parsedData.length), 
          total: parsedData.length, 
          stage: 'Processing rows...' 
        });

        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Insert valid rows in chunks
      let inserted = 0;
      const insertErrors = [];

      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        
        try {
          const { data, error } = await supabase
            .from(TABLE_NAMES.LEADS)
            .insert(chunk)
            .select('id');

          if (error) throw error;

          inserted += chunk.length;
        } catch (error) {
          insertErrors.push({
            chunk: Math.floor(i / CHUNK_SIZE) + 1,
            error: error.message
          });
        }

        setProgress({ 
          current: i + chunk.length, 
          total: validRows.length, 
          stage: 'Inserting into database...' 
        });

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Set final results
      setResults({
        totalRows: parsedData.length,
        inserted: inserted,
        duplicates: duplicates.length,
        errors: processingErrors.length + insertErrors.length
      });

      setErrors([...processingErrors, ...insertErrors]);

    } catch (error) {
      setErrors([{ row: 0, error: error.message }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    const error = validateFile(selectedFile);
    if (error) {
      alert(error);
      return;
    }
    setFile(selectedFile);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // Handle import
  const handleImport = () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }
    processFile();
  };

  // Handle close
  const handleClose = () => {
    if (results) {
      onComplete();
    }
    onClose();
    // Reset state
    setFile(null);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0, stage: '' });
    setResults(null);
    setErrors([]);
  };

  // Download error report
  const downloadErrorReport = () => {
    if (errors.length === 0) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Row,Error\n"
      + errors.map(e => `${e.row},"${e.error}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "import_errors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="modal-overlay" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="modal-dialog" style={{ maxWidth: '600px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Import Leads</h5>
            <button type="button" className="close-modal-btn" onClick={handleClose}>×</button>
          </div>
          
          <div className="modal-body">
            {!isProcessing && !results && (
              <>
                {/* File Upload Area */}
                <div 
                  className={`import-upload-area ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragging ? '#f0f9ff' : '#f9fafb',
                    borderColor: isDragging ? '#3b82f6' : '#d1d5db',
                    marginBottom: '20px'
                  }}
                >
                  <Upload size={48} style={{ color: '#6b7280', marginBottom: '16px' }} />
                  <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                    {file ? file.name : 'Drop your file here or click to browse'}
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    CSV or Excel files only (max 100MB)
                  </p>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                />

                {/* File Info */}
                {file && (
                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #bfdbfe', 
                    borderRadius: '6px', 
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={20} style={{ color: '#3b82f6' }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: '500', color: '#1e40af' }}>{file.name}</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Info */}
                <div style={{ 
                  backgroundColor: '#fef3c7', 
                  border: '1px solid #fbbf24', 
                  borderRadius: '6px', 
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <AlertCircle size={20} style={{ color: '#d97706', marginTop: '2px' }} />
                    <div>
                      <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#92400e' }}>
                        Import Guidelines:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '16px', color: '#92400e', fontSize: '14px' }}>
                        <li>Required columns: Parents Name, Kids Name, Phone</li>
                        <li>Optional: Second Phone, Email, Location, Grade, Source, etc.</li>
                        <li>Phone can contain two numbers separated by "/" (e.g., 9876543210/9123456789)</li>
                        <li>Invalid data will use fallbacks (NA, 1234567890)</li>
                        <li>Duplicate phone numbers will be skipped</li>
                        <li>All leads will use the first stage from settings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: '#3b82f6', marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  {progress.stage}
                </p>
                {progress.total > 0 && (
                  <>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(progress.current / progress.total) * 100}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      {progress.current} of {progress.total} rows
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Results State */}
            {results && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <CheckCircle size={24} style={{ color: '#10b981' }} />
                  <h6 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                    Import Complete
                  </h6>
                </div>

                {/* Results Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #bfdbfe', 
                    borderRadius: '6px', 
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
                      {results.inserted}
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Successfully Imported</p>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#fef3c7', 
                    border: '1px solid #fbbf24', 
                    borderRadius: '6px', 
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#d97706' }}>
                      {results.duplicates}
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>Duplicates Skipped</p>
                  </div>
                </div>

                {/* Errors */}
                {results.errors > 0 && (
                  <div style={{ 
                    backgroundColor: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    borderRadius: '6px', 
                    padding: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#dc2626' }}>
                        {results.errors} rows had errors
                      </p>
                      <button
                        onClick={downloadErrorReport}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: '#dc2626',
                          backgroundColor: 'transparent',
                          border: '1px solid #dc2626',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={12} />
                        Download Report
                      </button>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                  Total rows processed: {results.totalRows}
                </p>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            {!isProcessing && !results && (
              <button 
                onClick={handleImport}
                disabled={!file}
                className="btn btn-primary"
                style={{
                  backgroundColor: file ? '#3b82f6' : '#9ca3af',
                  opacity: file ? 1 : 0.6,
                  cursor: file ? 'pointer' : 'not-allowed'
                }}
              >
                Import Leads
              </button>
            )}
            
            {results && (
              <button 
                onClick={handleClose}
                className="btn btn-primary"
                style={{ backgroundColor: '#10b981' }}
              >
                Done
              </button>
            )}
            
            {!isProcessing && (
              <button 
                onClick={handleClose}
                className="btn btn-secondary"
                style={{ marginLeft: '8px' }}
              >
                {results ? 'Close' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ImportLeadsModal;