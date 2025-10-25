import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const settingsService = {
  // ✅ UPDATED: Get all settings with role information for counsellors
  async getAllSettings() {
    const { data, error } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('*')
      .order('sort_order');
      
    if (error) throw error;
    
    // Group by type
    const grouped = {
      stages: [],
      grades: [],
      counsellors: [],
      sources: [],
      form_fields: [],
      school: {}
    };
    
    // ✅ NEW: Collect user IDs from counsellors to fetch roles
    const userIds = [];
    data?.forEach(item => {
      if (item.type === 'counsellors' && item.value && item.value.user_id) {
        userIds.push(item.value.user_id);
      }
    });
    
    // ✅ NEW: Fetch user data with roles if there are counsellors
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id, role')
        .in('id', userIds);
      
      if (!usersError && usersData) {
        usersData.forEach(user => {
          usersMap[user.id] = user.role;
        });
      }
    }
    
    data?.forEach(item => {
      if (item.type === 'school') {
        grouped.school = item.value || {};
      } else if (grouped[item.type]) {
        const itemData = {
          id: item.id,
          name: item.name,
          field_key: item.field_key,
          stage_key: item.stage_key,
          is_active: item.is_active, 
          sort_order: item.sort_order,
          ...(item.value || {})
        };
        
        if (item.type === 'counsellors' && item.value && item.value.user_id) {
          itemData.user_id = item.value.user_id;
          // ✅ NEW: Add role from usersMap
          itemData.role = usersMap[item.value.user_id] || 'user';
        }
        
        grouped[item.type].push(itemData);
      } else {
        console.warn(`Unexpected item type: ${item.type}`, item);
      }
    });
    
    return grouped;
  },

  // ✅ UPDATED: Create counsellor with user account and role
  async createCounsellorWithUser(counsellorData) {
    const { name, email, password, role = 'user' } = counsellorData;
    
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }

      const { data: userData, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .insert([{
          auth_id: authData.user.id,
          email: email,
          full_name: name,
          role: role, // ✅ NEW: Use role from counsellorData
          is_active: true
        }])
        .select()
        .single();

      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw userError;
      }

      const maxOrder = await this.getMaxSortOrder('counsellors');
      
      const { data: counsellorDataResult, error: counsellorError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .insert([{
          type: 'counsellors',
          name: name,
          value: {
            user_id: userData.id,
            email: email
          },
          sort_order: maxOrder + 1,
          is_active: true
        }])
        .select()
        .single();

      if (counsellorError) {
        await supabase.from(TABLE_NAMES.USERS).delete().eq('id', userData.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw counsellorError;
      }

      return {
        counsellor: counsellorDataResult,
        user: userData,
        auth: authData.user
      };

    } catch (error) {
      console.error('Error creating counsellor with user:', error);
      throw error;
    }
  },

  // ✅ UPDATED: Update counsellor with user account and role
  async updateCounsellorWithUser(counsellorId, updateData) {
    const { name, email, password, role = 'user' } = updateData;
    
    try {
      const { data: counsellor, error: counsellorError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', counsellorId)
        .single();

      if (counsellorError) throw counsellorError;

      if (!counsellor.value || !counsellor.value.user_id) {
        throw new Error('Counsellor is not linked to a user account');
      }

      const userId = counsellor.value.user_id;
      const oldCounsellorName = counsellor.name;

      const { data: user, error: userFetchError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (userFetchError) throw userFetchError;

      const userUpdates = {
        full_name: name,
        email: email,
        role: role // ✅ NEW: Update role
      };

      const { error: userUpdateError } = await supabase
        .from(TABLE_NAMES.USERS)
        .update(userUpdates)
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;

      if (email !== user.email) {
        const { error: authEmailError } = await supabaseAdmin.auth.admin.updateUserById(
          user.auth_id,
          { email: email }
        );
        
        if (authEmailError) throw authEmailError;
      }

      if (password && password.trim() !== '') {
        const { error: authPasswordError } = await supabaseAdmin.auth.admin.updateUserById(
          user.auth_id,
          { password: password }
        );
        
        if (authPasswordError) throw authPasswordError;
      }

      const { error: counsellorUpdateError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update({ 
          name: name,
          value: {
            ...counsellor.value,
            email: email
          }
        })
        .eq('id', counsellorId);

      if (counsellorUpdateError) throw counsellorUpdateError;

      if (oldCounsellorName !== name) {
        console.log(`Updating leads from counsellor "${oldCounsellorName}" to "${name}"`);
        const { error: leadsUpdateError } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({ counsellor: name })
          .eq('counsellor', oldCounsellorName);

        if (leadsUpdateError) {
          console.error('Error updating leads with new counsellor name:', leadsUpdateError);
          throw leadsUpdateError;
        }

        console.log(`Successfully updated leads from "${oldCounsellorName}" to "${name}"`);
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating counsellor with user:', error);
      throw error;
    }
  },

  async deleteCounsellorWithUser(counsellorId) {
    try {
      const { data: counsellor, error: counsellorError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', counsellorId)
        .single();

      if (counsellorError) throw counsellorError;

      const counsellorName = counsellor.name;

      console.log(`Updating leads with counsellor "${counsellorName}" to "Not Assigned"`);
      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ counsellor: 'Not Assigned' })
        .eq('counsellor', counsellorName);

      if (leadsUpdateError) {
        console.error('Error updating leads:', leadsUpdateError);
        throw leadsUpdateError;
      }

      if (!counsellor.value || !counsellor.value.user_id) {
        return await this.deleteItem(counsellorId);
      }

      const userId = counsellor.value.user_id;

      const { data: user, error: userFetchError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (userFetchError) {
        console.warn('User not found, proceeding with counsellor deletion');
        return await this.deleteItem(counsellorId);
      }

      const { error: settingsDeleteError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .delete()
        .eq('id', counsellorId);

      if (settingsDeleteError) throw settingsDeleteError;

      const { error: userDeleteError } = await supabase
        .from(TABLE_NAMES.USERS)
        .delete()
        .eq('id', user.id);

      if (userDeleteError) throw userDeleteError;

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
      
      if (authDeleteError) {
        console.warn('Failed to delete auth user:', authDeleteError);
      }

      console.log(`Successfully updated ${counsellorName}'s leads to "Not Assigned" and deleted counsellor`);
      return { success: true };

    } catch (error) {
      console.error('Error deleting counsellor with user:', error);
      throw error;
    }
  },

  async getCounsellorWithUser(counsellorId) {
    const { data: counsellor, error } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('*')
      .eq('id', counsellorId)
      .eq('type', 'counsellors')
      .single();
      
    if (error) throw error;
    
    if (!counsellor.value || !counsellor.value.user_id) {
      return { ...counsellor, users: null };
    }
    
    const { data: user, error: userError } = await supabase
      .from(TABLE_NAMES.USERS)
      .select('*')
      .eq('id', counsellor.value.user_id)
      .single();
      
    if (userError) {
      return { ...counsellor, users: null };
    }
    
    return { ...counsellor, users: user };
  },

  // Grade management with leads synchronization
  async updateGradeWithLeads(gradeId, newGradeName) {
    try {
      const { data: grade, error: gradeError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', gradeId)
        .single();

      if (gradeError) throw gradeError;

      const oldGradeName = grade.name;

      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ grade: newGradeName })
        .eq('grade', oldGradeName);

      if (leadsUpdateError) throw leadsUpdateError;

      const { error: gradeUpdateError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update({ name: newGradeName })
        .eq('id', gradeId);

      if (gradeUpdateError) throw gradeUpdateError;

      return { success: true };
    } catch (error) {
      console.error('Error updating grade with leads:', error);
      throw error;
    }
  },

  async deleteGradeWithLeads(gradeId) {
    try {
      const { data: grade, error: gradeError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', gradeId)
        .single();

      if (gradeError) throw gradeError;

      const gradeName = grade.name;

      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ grade: '' })
        .eq('grade', gradeName);

      if (leadsUpdateError) throw leadsUpdateError;

      return await this.deleteItem(gradeId);
    } catch (error) {
      console.error('Error deleting grade with leads:', error);
      throw error;
    }
  },

  // Source management with leads synchronization
  async updateSourceWithLeads(sourceId, newSourceName) {
    try {
      const { data: source, error: sourceError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', sourceId)
        .single();

      if (sourceError) throw sourceError;

      const oldSourceName = source.name;

      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ source: newSourceName })
        .eq('source', oldSourceName);

      if (leadsUpdateError) throw leadsUpdateError;

      const { error: sourceUpdateError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update({ name: newSourceName })
        .eq('id', sourceId);

      if (sourceUpdateError) throw sourceUpdateError;

      return { success: true };
    } catch (error) {
      console.error('Error updating source with leads:', error);
      throw error;
    }
  },

  async deleteSourceWithLeads(sourceId) {
    try {
      const { data: source, error: sourceError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', sourceId)
        .single();

      if (sourceError) throw sourceError;

      const sourceName = source.name;

      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ source: '' })
        .eq('source', sourceName);

      if (leadsUpdateError) throw leadsUpdateError;

      return await this.deleteItem(sourceId);
    } catch (error) {
      console.error('Error deleting source with leads:', error);
      throw error;
    }
  },

  // Stage management with leads synchronization
  async updateStageWithLeads(stageId, newStageName) {
    try {
      const { data: stage, error: stageError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', stageId)
        .single();

      if (stageError) throw stageError;

      const oldStageName = stage.name;
      const stageKey = stage.stage_key;

      if (!stageKey) {
        console.warn('Stage has no stage_key, skipping leads update');
        return { success: true };
      }

      console.log(`Updating leads from stage "${oldStageName}" (key: ${stageKey}) to "${newStageName}"`);

      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ stage: stageKey })
        .eq('stage', oldStageName);

      if (leadsUpdateError) {
        console.error('Error updating leads with stage key:', leadsUpdateError);
      }

      const { error: leadsUpdateError2 } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ stage: stageKey })
        .eq('stage', stageKey);

      if (leadsUpdateError2) {
        console.error('Error ensuring leads have stage key:', leadsUpdateError2);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating stage with leads:', error);
      throw error;
    }
  },

  // Custom field management
  async getCustomFieldsForLeads(leadIds) {
    if (!leadIds || leadIds.length === 0) return {};
    
    try {
      const { data: customFieldsData, error } = await supabase
        .from(TABLE_NAMES.CUSTOM_FIELD_VALUES)
        .select('*')
        .in('lead_id', leadIds);

      if (error) throw error;

      const customFieldsMap = {};
      
      leadIds.forEach(leadId => {
        customFieldsMap[leadId] = {};
      });

      customFieldsData?.forEach(fieldValue => {
        if (!customFieldsMap[fieldValue.lead_id]) {
          customFieldsMap[fieldValue.lead_id] = {};
        }
        customFieldsMap[fieldValue.lead_id][fieldValue.field_key] = fieldValue.value;
      });

      return customFieldsMap;
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      return {};
    }
  },

  async saveCustomFieldValue(leadId, fieldKey, value) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from(TABLE_NAMES.CUSTOM_FIELD_VALUES)
        .select('id')
        .eq('lead_id', leadId)
        .eq('field_key', fieldKey)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        const { error } = await supabase
          .from(TABLE_NAMES.CUSTOM_FIELD_VALUES)
          .update({ value: value })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLE_NAMES.CUSTOM_FIELD_VALUES)
          .insert([{
            lead_id: leadId,
            field_key: fieldKey,
            value: value
          }]);
        
        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving custom field value:', error);
      throw error;
    }
  },

  async ensureCustomFieldKeysExist() {
    try {
      const { data: customFields, error } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('type', 'form_fields')
        .eq('is_active', true);

      if (error) throw error;

      const fieldsNeedingKeys = customFields.filter(field => 
        this.isCustomFieldByKey(field.field_key) && !field.field_key
      );

      const fixPromises = fieldsNeedingKeys
        .map(field => {
          const fieldKey = 'custom_' + field.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
          
          return supabase
            .from(TABLE_NAMES.SETTINGS)
            .update({ 
              field_key: fieldKey,
              value: { 
                ...(field.value || {}),
                field_key: fieldKey 
              }
            })
            .eq('id', field.id);
        });
        
      if (fixPromises.length > 0) {
        await Promise.all(fixPromises);
        console.log(`Fixed ${fixPromises.length} custom fields with missing field_key`);
      }
      
      return { success: true, fixedCount: fixPromises.length };
    } catch (error) {
      console.error('Error fixing custom field keys:', error);
      throw error;
    }
  },

  getStageByKey(stages, stageKey) {
    return stages.find(stage => stage.stage_key === stageKey);
  },

  getStageByName(stages, stageName) {
    return stages.find(stage => stage.name === stageName);
  },

  createStageNameToKeyMapping(stages) {
    const mapping = {};
    stages.forEach(stage => {
      if (stage.stage_key) {
        mapping[stage.name] = stage.stage_key;
      }
    });
    return mapping;
  },

  createStageKeyToDataMapping(stages) {
    const mapping = {};
    stages.forEach(stage => {
      if (stage.stage_key) {
        mapping[stage.stage_key] = stage;
      }
    });
    return mapping;
  },

  async toggleItemStatus(id) {
    const { data: current, error: fetchError } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('is_active')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    const { error } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .update({ is_active: !current.is_active })
      .eq('id', id);
      
    if (error) throw error;
  },

  async getCustomFormFieldsCount() {
    const { data, error } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('id, name, field_key')
      .eq('type', 'form_fields')
      .eq('is_active', true);
      
    if (error) throw error;
    
    const customFields = data?.filter(field => 
      this.isCustomFieldByKey(field.field_key)
    ) || [];
    
    return customFields.length;
  },

  isSuperConstantField(fieldName) {
    const superConstantFields = ['Parents Name', 'Kids Name', 'Phone', 'Email'];
    return superConstantFields.includes(fieldName);
  },

  isSuperConstantFieldByKey(fieldKey) {
    const superConstantKeys = ['parentsName', 'kidsName', 'phone', 'email'];
    return superConstantKeys.includes(fieldKey);
  },

  isConstantField(fieldName) {
    const exactConstantFields = [
      'Location', 'Occupation', 'Current School', 'Offer', 'Notes',
      'Meeting Date', 'Meeting Time', 'Meeting Link', 'Visit Date',
      'Visit Time', 'Visit Location', 'Registration Fees', 'Enrolled',
      'Second Phone'
    ];
    return exactConstantFields.includes(fieldName);
  },

  isConstantFieldByKey(fieldKey) {
    const constantKeys = [
      'location', 'occupation', 'currentSchool', 'offer', 'notes',
      'meetingDate', 'meetingTime', 'meetingLink', 'visitDate',
      'visitTime', 'visitLocation', 'registrationFees', 'enrolled',
      'secondPhone'
    ];
    return constantKeys.includes(fieldKey);
  },

  isCustomField(fieldName) {
    return !this.isSuperConstantField(fieldName) && !this.isConstantField(fieldName);
  },

  isCustomFieldByKey(fieldKey) {
    if (!fieldKey) return true;
    return !this.isSuperConstantFieldByKey(fieldKey) && !this.isConstantFieldByKey(fieldKey);
  },

  isFieldDeletable(fieldName) {
    return this.isCustomField(fieldName);
  },

  isFieldDeletableByKey(fieldKey) {
    return this.isCustomFieldByKey(fieldKey);
  },

  isFieldNameEditable(fieldName) {
    return this.isConstantField(fieldName) || this.isCustomField(fieldName);
  },

  isFieldNameEditableByKey(fieldKey) {
    return this.isConstantFieldByKey(fieldKey) || this.isCustomFieldByKey(fieldKey);
  },

  canToggleFieldStatus(fieldName) {
    return this.isCustomField(fieldName);
  },

  canToggleFieldStatusByKey(fieldKey) {
    return this.isCustomFieldByKey(fieldKey);
  },

  canChangeMandatoryStatus(fieldName) {
    return this.isSuperConstantField(fieldName);
  },

  canChangeMandatoryStatusByKey(fieldKey) {
    return this.isSuperConstantFieldByKey(fieldKey);
  },

  canEditDropdownOptions(fieldName) {
    return this.isCustomField(fieldName);
  },

  canEditDropdownOptionsByKey(fieldKey) {
    return this.isCustomFieldByKey(fieldKey);
  },

  async createItem(type, name, additionalData = {}) {
    const maxOrder = await this.getMaxSortOrder(type);
    
    const insertData = {
      type,
      name,
      value: Object.keys(additionalData).length > 0 ? additionalData : null,
      sort_order: maxOrder + 1,
      is_active: true
    };

    if (type === 'form_fields' && additionalData.is_custom) {
      insertData.field_key = additionalData.field_key || null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .insert([insertData])
      .select();
      
    if (error) throw error;
    return data[0];
  },

  async updateItem(id, name, additionalData = {}) {
    try {
      const { data: currentItem, error: fetchError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const updateData = { name };
      
      if (currentItem.type === 'form_fields' && currentItem.field_key) {
        additionalData.field_key = currentItem.field_key;
      }
      
      if (Object.keys(additionalData).length > 0) {
        updateData.value = additionalData;
      }
      
      const { error } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  async deleteItem(id) {
    const { error } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  async moveStage(stageId, direction) {
    const { data: allStages } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('id, sort_order')
      .eq('type', 'stages')
      .eq('is_active', true)
      .order('sort_order');

    const currentIndex = allStages.findIndex(stage => stage.id === stageId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < allStages.length) {
      const currentStage = allStages[currentIndex];
      const swapStage = allStages[newIndex];

      await supabase.from(TABLE_NAMES.SETTINGS).update({ sort_order: swapStage.sort_order }).eq('id', currentStage.id);
      await supabase.from(TABLE_NAMES.SETTINGS).update({ sort_order: currentStage.sort_order }).eq('id', swapStage.id);
    }
  },

  async updateSchoolSettings(schoolData) {
    const { data: existing } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('id')
      .eq('type', 'school')
      .eq('name', 'profile')
      .limit(1);
    
    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update({ value: schoolData })
        .eq('id', existing[0].id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .insert([{
          type: 'school',
          name: 'profile',
          value: schoolData
        }]);
      if (error) throw error;
    }
  },

  async getMaxSortOrder(type) {
    const { data } = await supabase
      .from(TABLE_NAMES.SETTINGS)
      .select('sort_order')
      .eq('type', type)
      .order('sort_order', { ascending: false })
      .limit(1);
      
    return data?.[0]?.sort_order || 0;
  }
};
