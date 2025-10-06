// src/services/apiService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  // Generic request method
  static async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    console.log(`Making API request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${config.method || 'GET'} ${url}`, error);
      throw error;
    }
  }

  // Test API connection
  static async testConnection() {
    try {
      const data = await this.makeRequest('/health');
      console.log('API connection test successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('API connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Test leads API endpoint
  static async testLeadsApi() {
    try {
      const data = await this.makeRequest('/api/leads/test');
      console.log('Leads API test successful:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Leads API test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get field options for API
  static async getFieldOptions() {
    try {
      console.log('Fetching field options...');
      const data = await this.makeRequest('/api/leads/options');
      console.log('Field options retrieved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching field options:', error);
      throw error;
    }
  }

  // Create lead via API (for testing)
  static async createLead(leadData) {
    try {
      console.log('Creating lead via API:', leadData);
      
      const data = await this.makeRequest('/api/leads/create', {
        method: 'POST',
        body: JSON.stringify(leadData)
      });
      
      console.log('Lead created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  // Validate lead data before sending
  static validateLeadData(leadData) {
    const errors = {};

    // Required fields
    if (!leadData.parentsName?.trim()) {
      errors.parentsName = 'Parent name is required';
    }

    if (!leadData.kidsName?.trim()) {
      errors.kidsName = 'Kid name is required';
    }

    if (!leadData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const digits = leadData.phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits';
      }
    }

    // Optional fields validation
    if (leadData.secondPhone?.trim()) {
      const secondDigits = leadData.secondPhone.replace(/\D/g, '');
      if (secondDigits.length !== 10) {
        errors.secondPhone = 'Secondary phone must be exactly 10 digits';
      }
    }

    if (leadData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Format phone number for API
  static formatPhoneForAPI(phone) {
    if (!phone) return '';
    // Remove all non-digits and limit to 10 digits
    return phone.replace(/\D/g, '').slice(0, 10);
  }

  // Format lead data for API
  static formatLeadDataForAPI(formData) {
    return {
      parentsName: formData.parentsName?.trim() || '',
      kidsName: formData.kidsName?.trim() || '',
      phone: this.formatPhoneForAPI(formData.phone),
      secondPhone: this.formatPhoneForAPI(formData.secondPhone),
      email: formData.email?.trim() || '',
      location: formData.location?.trim() || '',
      grade: formData.grade || '',
      source: formData.source || '',
      stage: formData.stage || '',
      counsellor: formData.counsellor || '',
      offer: formData.offer || '',
      occupation: formData.occupation?.trim() || '',
      notes: formData.notes?.trim() || '',
      checkDuplicate: formData.checkDuplicate !== false // Default to true
    };
  }

  // Get API status
  static async getApiStatus() {
    try {
      const healthCheck = await this.testConnection();
      const leadsCheck = await this.testLeadsApi();
      
      return {
        overall: healthCheck.success && leadsCheck.success,
        health: healthCheck,
        leadsApi: leadsCheck,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        overall: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Test complete API flow
  static async testCompleteFlow() {
    try {
      console.log('Testing complete API flow...');
      
      // Step 1: Test connection
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error('Connection test failed');
      }

      // Step 2: Get field options
      const optionsData = await this.getFieldOptions();
      if (!optionsData.success) {
        throw new Error('Failed to get field options');
      }

      // Step 3: Test lead creation with sample data
      const sampleLead = {
        parentsName: 'Test Parent',
        kidsName: 'Test Kid',
        phone: '9876543210',
        email: 'test@example.com',
        grade: optionsData.data.defaultValues.grade,
        source: optionsData.data.defaultValues.source,
        stage: optionsData.data.defaultValues.stage,
        counsellor: optionsData.data.defaultValues.counsellor,
        checkDuplicate: false // Skip duplicate check for test
      };

      const createResult = await this.createLead(sampleLead);
      if (!createResult.success) {
        throw new Error('Failed to create test lead');
      }

      console.log('Complete API flow test successful!');
      return {
        success: true,
        steps: {
          connection: connectionTest,
          options: optionsData,
          creation: createResult
        }
      };

    } catch (error) {
      console.error('Complete API flow test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ApiService;