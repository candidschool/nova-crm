import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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

// ← FIXED PHONE NUMBER for pass00 campaign
const FIXED_PHONE_NUMBER = '+918147038260'; // ← CHANGE THIS TO YOUR ACTUAL PHONE NUMBER

function authenticate(req) {
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

// Email transporter setup
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Send email notification
const sendEmailNotification = async (leadData) => {
  try {
    const transporter = createEmailTransporter();
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .field { margin: 10px 0; padding: 10px; background-color: white; border-left: 3px solid #4CAF50; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; margin-left: 10px; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 New Lead Created</h2>
          </div>
          <div class="content">
            <p>A new lead has been added to the system via API.</p>
            
            <div class="field">
              <span class="label">Parent Name:</span>
              <span class="value">${leadData.parents_name}</span>
            </div>
            
            <div class="field">
              <span class="label">Kid Name:</span>
              <span class="value">${leadData.kids_name}</span>
            </div>
            
            <div class="field">
              <span class="label">Phone:</span>
              <span class="value">${leadData.phone}</span>
            </div>
            
            ${leadData.second_phone ? `
            <div class="field">
              <span class="label">Secondary Phone:</span>
              <span class="value">${leadData.second_phone}</span>
            </div>
            ` : ''}
            
            ${leadData.email ? `
            <div class="field">
              <span class="label">Email:</span>
              <span class="value">${leadData.email}</span>
            </div>
            ` : ''}
            
            <div class="field">
              <span class="label">Grade:</span>
              <span class="value">${leadData.grade}</span>
            </div>
            
            ${leadData.location ? `
            <div class="field">
              <span class="label">Location:</span>
              <span class="value">${leadData.location}</span>
            </div>
            ` : ''}
            
            ${leadData.occupation ? `
            <div class="field">
              <span class="label">Occupation:</span>
              <span class="value">${leadData.occupation}</span>
            </div>
            ` : ''}
            
            ${leadData.current_school ? `
            <div class="field">
              <span class="label">Current School:</span>
              <span class="value">${leadData.current_school}</span>
            </div>
            ` : ''}
            
            <div class="field">
              <span class="label">Source:</span>
              <span class="value">${leadData.source}</span>
            </div>
            
            <div class="field">
              <span class="label">Stage:</span>
              <span class="value">${leadData.stage}</span>
            </div>
            
            <div class="field">
              <span class="label">Counsellor:</span>
              <span class="value">${leadData.counsellor}</span>
            </div>
            
            <div class="field">
              <span class="label">Offer:</span>
              <span class="value">${leadData.offer}</span>
            </div>
            
            ${leadData.notes ? `
            <div class="field">
              <span class="label">Notes:</span>
              <span class="value">${leadData.notes}</span>
            </div>
            ` : ''}
            
            <div class="field">
              <span class="label">Created At:</span>
              <span class="value">${new Date(leadData.created_at).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short'
              })}</span>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Nova International School CRM</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const recipients = [
      process.env.NOTIFICATION_EMAIL_1,
      process.env.NOTIFICATION_EMAIL_2
    ].filter(Boolean);

    if (recipients.length === 0) {
      return { success: false, error: 'No notification emails configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: recipients.join(', '),
      subject: `New Lead: ${leadData.parents_name} (${leadData.kids_name})`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    
    return { success: true, recipients: recipients.length };

  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
};

// ← ORIGINAL: Welcome message to customer (Stage 1)
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
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2Q0MyIsIm5hbWUiOiJOb3ZhIEludGVybmF0aW9uYWwgU2Nob29sIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2QzZCIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTQ1Njg4NjR9.-nntqrB_61dj0Pw66AEL_YwN6VvljWf5CtPf2fiALMw',
        campaignName: 'welcome',
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

// ← NEW: pass00 campaign to fixed number (Stage 11)
const triggerPass00API = async (leadData) => {
  try {
    console.log('🟡 Triggering pass00 API to fixed number:', FIXED_PHONE_NUMBER);
    
    if (!leadData.parentsName || !leadData.kidsName || !leadData.phone) {
      return { success: false, error: 'Missing required parameters for pass00' };
    }

    const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2Q0MyIsIm5hbWUiOiJOb3ZhIEludGVybmF0aW9uYWwgU2Nob29sIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY4OTQ5OGEwNGFiMGYxMGMwZGZjM2QzZCIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3NTQ1Njg4NjR9.-nntqrB_61dj0Pw66AEL_YwN6VvljWf5CtPf2fiALMw',
        campaignName: 'pass00',
        destination: FIXED_PHONE_NUMBER.replace(/^\+91/, '').replace(/\D/g, ''), // Clean phone
        userName: 'Admin', // Generic username for fixed recipient
        templateParams: [
          leadData.parentsName,
          leadData.kidsName,
          leadData.phone
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 pass00 API failed:', errorText);
      return { success: false, error: `pass00 API call failed: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log('🟢 pass00 API Success:', result);
    return { success: true, data: result };

  } catch (error) {
    console.error('🔴 pass00 API error:', error);
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
      .from('nova_leads')
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

    // ← STEP 1: Send welcome message to customer
    const stage1Result = await triggerStage1API({
      phone: newLead.phone,
      parentsName: newLead.parents_name,
      kidsName: newLead.kids_name,
      grade: newLead.grade
    });

    // ← STEP 2: Send pass00 notification to fixed number
    const pass00Result = await triggerPass00API({
      phone: newLead.phone,
      parentsName: newLead.parents_name,
      kidsName: newLead.kids_name
    });

    // Send email notifications
    const emailResult = await sendEmailNotification(newLead);
    
    if (emailResult.success) {
      console.log(`Email notifications sent to ${emailResult.recipients} recipients`);
    } else {
      console.log('Email notification failed (non-critical):', emailResult.error);
    }

    // Log to history
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
        },
        pass00ApiCall: {
          success: pass00Result.success,
          message: pass00Result.success ?
            'pass00 notification sent successfully' :
            `pass00 notification failed: ${pass00Result.error}`
        },
        emailNotification: {
          success: emailResult.success,
          message: emailResult.success ?
            `Email sent to ${emailResult.recipients} recipients` :
            `Email failed: ${emailResult.error}`
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
