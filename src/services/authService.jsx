import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';

const authService = {
  // Login with email and password
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      // Use Supabase Auth for authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Invalid credentials')
      }

      console.log('Auth successful, user ID:', authData.user.id);
      console.log('Fetching user data from custom users table...');

      // Get user data from your custom users table
      const { data: userData, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id, email, full_name, role, is_active, phone, profile_image_url, created_at')
        .eq('auth_id', authData.user.id)
        .eq('is_active', true)
        .single()

      if (userError || !userData) {
        console.error('User data error:', userError);
        // If user exists in auth but not in users table, log them out
        await supabase.auth.signOut()
        throw new Error('User account not properly configured')
      }

      console.log('User data fetched:', userData);

      // Update last login
      await supabase
        .from(TABLE_NAMES.USERS)
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', authData.user.id)

      return {
        ...userData,
        auth_id: authData.user.id,
        session: authData.session
      }

    } catch (error) {
      console.error('Login error:', error);
      throw error
    }
  },

  // Logout
  async logout() {
    try {
      console.log('Logging out user...');
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error);
        throw error
      }
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      throw error
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.log('No authenticated user found');
        return null
      }

      console.log('Found authenticated user, fetching profile...');

      // Get user data from custom table
      const { data: userData, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id, email, full_name, role, is_active, phone, profile_image_url, created_at, last_login')
        .eq('auth_id', user.id)
        .eq('is_active', true)
        .single()

      if (userError || !userData) {
        console.error('User profile error:', userError);
        return null
      }

      console.log('Current user data:', userData);

      return {
        ...userData,
        auth_id: user.id
      }

    } catch (error) {
      console.error('Get current user error:', error);
      return null
    }
  },

  // Register new user (for admin use)
  async register(email, password, userData) {
    try {
      console.log('Registering new user:', email);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      })

      if (authError) {
        console.error('Registration auth error:', authError);
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('User creation failed')
      }

      console.log('Auth user created, creating profile...');

      // Create user record in custom table
      const { data: newUser, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .insert([{
          auth_id: authData.user.id,
          email: email,
          full_name: userData.full_name,
          role: userData.role || 'user',
          phone: userData.phone || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (userError) {
        console.error('User profile creation error:', userError);
        // If user creation fails, try to delete the auth user
        try {
          await supabase.auth.admin.deleteUser(authData.user.id)
        } catch (deleteError) {
          console.error('Failed to cleanup auth user:', deleteError);
        }
        throw new Error('Failed to create user profile')
      }

      console.log('User registered successfully:', newUser);
      return newUser

    } catch (error) {
      console.error('Registration error:', error);
      throw error
    }
  },

  // Reset password - SECURE VERSION with email validation and DEBUG logging
  async resetPassword(email) {
    try {
      console.log('🔐 SECURE PASSWORD RESET - Processing request for:', email);
      
      // 🔒 SECURITY: First check if email exists in our users table
      console.log('🔍 Step 1: Checking if email exists in users table...');
      const { data: userData, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id, email, is_active, auth_id')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single()

      console.log('📊 Database query result:', { userData, userError });

      // 🔒 SECURITY: Always return the same success message 
      // Don't reveal whether email exists or not
      const successMessage = 'If this email address exists in our system, you will receive a password reset link shortly.';

      if (userError || !userData) {
        console.log('❌ Email not found in database or account inactive:', email);
        console.log('🛡️ SECURITY: NOT sending reset email - returning generic message');
        // Don't throw error - return success message to prevent email enumeration
        return { message: successMessage }
      }

      console.log('✅ Valid email found in database:', userData.email);
      console.log('🔍 Step 2: Sending reset email via Supabase Auth...');

      // Only send reset email if user exists and is active
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (resetError) {
        console.error('❌ Supabase password reset error:', resetError);
        console.log('🛡️ SECURITY: Reset failed but returning generic message');
        // Log the actual error but still return generic message
        return { message: successMessage }
      }

      console.log('✅ Password reset email sent successfully to existing user');
      return { message: successMessage }

    } catch (error) {
      console.error('💥 Reset password error:', error);
      console.log('🛡️ SECURITY: Error occurred but returning generic message');
      // Even on error, return generic success message for security
      return { message: 'If this email address exists in our system, you will receive a password reset link shortly.' }
    }
  },

  // Update password
  async updatePassword(newPassword) {
    try {
      console.log('Updating user password...');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        console.error('Password update error:', error);
        throw error
      }

      console.log('Password updated successfully');
      return { message: 'Password updated successfully' }

    } catch (error) {
      console.error('Update password error:', error);
      throw error
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      console.log('Updating user profile:', userId);
      
      const { data, error } = await supabase
        .from(TABLE_NAMES.USERS)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error);
        throw error
      }

      console.log('Profile updated successfully:', data);
      return data

    } catch (error) {
      console.error('Update profile error:', error);
      throw error
    }
  },

  // Check authentication status and listen for changes
  onAuthStateChange(callback) {
    console.log('Setting up auth state listener...');
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      callback(event, session);
    })
  },

  // Get session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Get session error:', error);
        return null
      }

      return session

    } catch (error) {
      console.error('Get session error:', error);
      return null
    }
  },

  // Refresh session
  async refreshSession() {
    try {
      console.log('Refreshing session...');
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error);
        throw error
      }

      console.log('Session refreshed');
      return data

    } catch (error) {
      console.error('Refresh session error:', error);
      throw error
    }
  }
}

// Export the authService
export { authService }