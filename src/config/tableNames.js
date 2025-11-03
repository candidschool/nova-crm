export const TABLE_NAMES = {
  // Main business data tables
  LEADS: 'nova_leads',                    // Core lead/customer data
  USERS: 'nova_users',                    // User authentication and profiles
  SETTINGS: 'nova_settings',              // Unified configuration (stages, sources, etc.)
  
  // Activity and tracking tables
  LOGS: 'nova_logs',                      // Activity logging and history
  FOLLOW_UPS: 'nova_follow_ups',          // Follow-up scheduling
  
  // Extended functionality tables
  LEAD_CUSTOM_FIELDS: 'nova_lead_custom_fields',  // Dynamic custom field data
  CUSTOM_FIELD_VALUES: 'nova_custom_field_values', // Custom field values storage
  
  // ✅ NEW: Performance tracking
  COUNSELLOR_STAGE_ACHIEVEMENTS: 'nova_counsellor_stage_achievements', // Cumulative stage achievements
  
  // Database views (read-only)
  LAST_ACTIVITY_BY_LEAD: 'nova_last_activity_by_lead'  // Performance view for activity queries
};

/**
 * TABLE PURPOSES - Documentation
 */
export const TABLE_PURPOSES = {
  [TABLE_NAMES.LEADS]: 'Stores all lead/customer information including contact details, stages, and counsellor assignments',
  [TABLE_NAMES.USERS]: 'User authentication, profiles, and role-based access control',
  [TABLE_NAMES.SETTINGS]: 'Centralized configuration for stages, sources, grades, counsellors, and form fields',
  [TABLE_NAMES.LOGS]: 'Activity tracking, history logging, and audit trail for all changes',
  [TABLE_NAMES.FOLLOW_UPS]: 'Scheduled follow-up management and tracking',
  [TABLE_NAMES.LEAD_CUSTOM_FIELDS]: 'Dynamic custom field extensions for leads',
  [TABLE_NAMES.CUSTOM_FIELD_VALUES]: 'Storage for custom field values per lead',
  [TABLE_NAMES.COUNSELLOR_STAGE_ACHIEVEMENTS]: 'Cumulative count of how many times each counsellor reached specific stages (never decreases)',
  [TABLE_NAMES.LAST_ACTIVITY_BY_LEAD]: 'Database view for optimized activity queries (read-only)'
};

/**
 * VALIDATION: Ensure all table names are strings
 */
const validateTableNames = () => {
  const errors = [];
  
  Object.entries(TABLE_NAMES).forEach(([key, value]) => {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key}: Table name must be a non-empty string`);
    }
  });
  
  if (errors.length > 0) {
    console.error('Table name validation errors:', errors);
    throw new Error(`Invalid table names configuration: ${errors.join(', ')}`);
  }
};

// Validate on import
validateTableNames();

/**
 * HELPER: Get all table names as array (useful for database setup scripts)
 */
export const getAllTableNames = () => {
  return Object.values(TABLE_NAMES);
};

/**
 * HELPER: Check if a table name exists in configuration
 */
export const isValidTableName = (tableName) => {
  return Object.values(TABLE_NAMES).includes(tableName);
};

/**
 * DEVELOPMENT HELPER: Log all configured table names
 */
export const logTableConfiguration = () => {
  console.log('=== TABLE NAMES CONFIGURATION ===');
  Object.entries(TABLE_NAMES).forEach(([key, value]) => {
    console.log(`${key}: "${value}" - ${TABLE_PURPOSES[value]}`);
  });
  console.log('=====================================');
};

// Default export for convenience
export default TABLE_NAMES;
