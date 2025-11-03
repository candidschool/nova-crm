import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';

export const achievementsService = {
  /**
   * Record an achievement when a counsellor reaches a stage
   * Each achievement is a separate record with timestamp
   */
  async recordStageAchievement(counsellorName, counsellorUserId, stageKey, leadId) {
    try {
      // Only track these 3 stages
      const trackedStages = ['meetingBooked', 'meetingDone', 'admission'];
      if (!trackedStages.includes(stageKey)) {
        console.log(`Stage ${stageKey} not tracked for achievements`);
        return { success: true, skipped: true };
      }

      console.log(`📊 Recording achievement: ${counsellorName} → ${stageKey} (Lead: ${leadId})`);

      // Check if this exact achievement already exists (prevent duplicates)
      const { data: existing } = await supabase
        .from(TABLE_NAMES.COUNSELLOR_STAGE_ACHIEVEMENTS)
        .select('id')
        .eq('counsellor_user_id', counsellorUserId)
        .eq('stage_key', stageKey)
        .eq('lead_id', leadId)
        .single();

      if (existing) {
        console.log('Achievement already recorded, skipping duplicate');
        return { success: true, duplicate: true };
      }

      // Insert new achievement record
      const { error: insertError } = await supabase
        .from(TABLE_NAMES.COUNSELLOR_STAGE_ACHIEVEMENTS)
        .insert([{
          counsellor_user_id: counsellorUserId,
          counsellor_name: counsellorName,
          stage_key: stageKey,
          lead_id: leadId,
          achieved_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      console.log(`✅ Achievement recorded: ${counsellorName} ${stageKey} for lead ${leadId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error recording stage achievement:', error);
      return { success: false, error };
    }
  },

  /**
   * Get all achievements with optional date filtering
   */
  async getAllAchievements(fromDate = null, toDate = null) {
    try {
      console.log('📊 Fetching achievements...', { fromDate, toDate });

      let query = supabase
        .from(TABLE_NAMES.COUNSELLOR_STAGE_ACHIEVEMENTS)
        .select('*')
        .in('stage_key', ['meetingBooked', 'meetingDone', 'admission']);

      // Apply date filters if provided
      if (fromDate) {
        query = query.gte('achieved_at', fromDate);
      }
      if (toDate) {
        // Add 23:59:59 to include the entire end date
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('achieved_at', endDate.toISOString());
      }

      const { data: achievementsData, error: achievementsError } = await query;

      if (achievementsError) throw achievementsError;

      console.log('Raw achievements:', achievementsData?.length || 0, 'records');

      // Get all users to filter out admins
      const { data: usersData, error: usersError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id, full_name, role, is_active');

      if (usersError) throw usersError;

      // Create a map of user_id to user data
      const usersMap = {};
      usersData?.forEach(user => {
        usersMap[user.id] = user;
      });

      // Filter out admin users and inactive users
      const filteredData = achievementsData?.filter(achievement => {
        const user = usersMap[achievement.counsellor_user_id];
        return user && user.role !== 'admin' && user.is_active === true;
      }) || [];

      console.log('Filtered achievements (non-admin):', filteredData.length, 'records');

      return { data: filteredData, error: null };
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return { data: [], error };
    }
  },

  /**
   * Get achievements grouped by counsellor (for display)
   */
  async getAchievementsByTimeRange(fromDate = null, toDate = null) {
    try {
      const { data, error } = await this.getAllAchievements(fromDate, toDate);
      
      if (error) throw error;

      // Group by counsellor and stage, counting occurrences
      const counsellorMap = {};

      data.forEach(achievement => {
        const counsellorName = achievement.counsellor_name;
        
        if (!counsellorMap[counsellorName]) {
          counsellorMap[counsellorName] = {
            name: counsellorName,
            userId: achievement.counsellor_user_id,
            meetingBooked: 0,
            meetingDone: 0,
            admission: 0
          };
        }
        
        // Count each achievement
        counsellorMap[counsellorName][achievement.stage_key]++;
      });

      const result = Object.values(counsellorMap);
      console.log('Grouped counsellor data:', result);

      return { data: result, error: null };
    } catch (error) {
      console.error('Error getting achievements by time range:', error);
      return { data: [], error };
    }
  },

  /**
   * Get counsellor user_id from name
   */
  async getCounsellorUserId(counsellorName) {
    try {
      // First try to get from settings (counsellors)
      const { data: counsellorData, error: counsellorError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('value')
        .eq('type', 'counsellors')
        .eq('name', counsellorName)
        .single();

      if (!counsellorError && counsellorData?.value?.user_id) {
        return { userId: counsellorData.value.user_id, error: null };
      }

      // Fallback: try to get from users table by full_name
      const { data: userData, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id')
        .eq('full_name', counsellorName)
        .single();

      if (userError) throw userError;

      return { userId: userData.id, error: null };
    } catch (error) {
      console.error('Error getting counsellor user_id:', error);
      return { userId: null, error };
    }
  }
};
