import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Simple authentication - credentials from environment variables
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;

function authenticate(req) {
  // Check if environment variables are set
  if (!API_USERNAME || !API_PASSWORD) {
    return { success: false, error: 'Server configuration error: credentials not set' };
  }

  const { username, password } = req.body;
  
  if (!username || !password) {
    return { success: false, error: 'Username and password required' };
  }
  
  if (username !== API_USERNAME || password !== API_PASSWORD) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  return { success: true };
}

const triggerStage1API = async (leadData) => {
  try {
    if (!leadData.phone || !leadData.parentsName || !leadData.kidsName || !leadData.grade) {
      return { success: false, error: 'Missing required parameters' };
    }

    const cleanPhone = leadData.phone.replace(/^\+91/, '').replace(/\D/g, '');

    const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MGYyOGY2ZTBjYzg1MGMwMmMzNGJiOCIsIm5hbWUiOiJXRUJVWlogRGlnaXRhbCBQcml2YXRlIExpbWl0ZWQiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjgwZjI4ZjZlMGNjODUwYzAyYzM0YmIzIiwiYWN0aXZlUGxhbiI6IkZSRUVfRk9SRVZFUiIsImlhdCI6MTc0NTgyMzk5MH0.pJi8qbYf3joYbNm5zSs4gJKFlBFsCS6apvkBkw4Qdxs',
        campaignName: 'welcome-school',
        destination: cleanPhone,
        userName: leadData.parentsName,
        templateParams: [leadData.parentsName, leadData.kidsName, leadData.grade]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API call failed: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    return { success: false, error: error.message };
  }
};

function validateLeadData(data) {
  const errors = {};

  if (!data.parentsName?.trim()) errors.parentsName = 'Parent name is required';
  if (!data.kidsName?.trim()) errors.kidsName = 'Kid name is required';
  
  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required';
  } else {
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
  }

  if (data.secondPhone?.trim()) {
    const secondDigits = data.secondPhone.replace(/\D/g, '');
    if (secondDigits.length !== 10) {
      errors.secondPhone = 'Secondary phone must be exactly 10 digits';
    }
  }

  if (data.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  return errors;
}

function convertToDatabase(data) {
  const formatPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits ? `+91${digits}` : '';
  };

  return {
    parents_name: data.parentsName || '',
    kids_name: data.kidsName || '',
    phone: formatPhone(data.phone),
    second_phone: formatPhone(data.secondPhone),
    email: data.email || '',
    location: data.location || '',
    grade: data.grade || 'LKG',
    stage: data.stage || 'New Lead',
    score: 20,
    category: 'New',
    counsellor: 'Assign Counsellor',
    offer: data.offer || 'No offer',
    notes: data.notes || '',
    source: data.source || 'API',
    occupation: data.occupation || '',
    current_school: data.currentSchool || '',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CHECK AUTHENTICATION FIRST
  const authResult = authenticate(req);
  if (!authResult.success) {
    return res.status(401).json({
      success: false,
      error: authResult.error
    });
  }

  try {
    console.log('API Lead Creation Request:', req.body);

    const validationErrors = validateLeadData(req.body);
    
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    const dbData = convertToDatabase(req.body);

    const { data: newLead, error: insertError } = await supabase
      .from('Leads')
      .insert([dbData])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        details: insertError.message
      });
    }

    console.log('Lead created successfully:', newLead.id);

    const stage1Result = await triggerStage1API({
      phone: newLead.phone,
      parentsName: newLead.parents_name,
      kidsName: newLead.kids_name,
      grade: newLead.grade
    });

    try {
      const historyData = {
        record_id: newLead.id,
        action: 'Lead Created',
        details: `New lead created via API - ${newLead.parents_name} (${newLead.kids_name}) - ${newLead.phone}`,
        additional_info: {
          source: 'API',
          created_via: 'API Endpoint',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      await supabase.from('History').insert([historyData]);
    } catch (historyError) {
      console.log('History logging failed (non-critical):', historyError);
    }

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: {
        id: newLead.id,
        parentsName: newLead.parents_name,
        kidsName: newLead.kids_name,
        phone: newLead.phone,
        stage: newLead.stage,
        category: newLead.category,
        score: newLead.score,
        counsellor: newLead.counsellor,
        createdAt: newLead.created_at,
        stage1ApiCall: {
          success: stage1Result.success,
          message: stage1Result.success ? 
            'Welcome message sent successfully' : 
            `Welcome message failed: ${stage1Result.error}`
        }
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}