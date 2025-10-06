import { supabase } from '../lib/supabase';
import { TABLE_NAMES } from '../config/tableNames';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const settingsService = {
  // Get all settings
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
        }
        
        grouped[item.type].push(itemData);
      } else {
        console.warn(`Unexpected item type: ${item.type}`, item);
      }
    });
    
    return grouped;
  },

  async createCounsellorWithUser(counsellorData) {
    const { name, email, password } = counsellorData;
    
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
          role: 'user',
          is_active: true
        }])
        .select()
        .single();

      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw userError;
      }

      const maxOrder = await this.getMaxSortOrder('counsellors');
      
      const { data: counsellorData, error: counsellorError } = await supabase
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
        counsellor: counsellorData,
        user: userData,
        auth: authData.user
      };

    } catch (error) {
      console.error('Error creating counsellor with user:', error);
      throw error;
    }
  },

  async updateCounsellorWithUser(counsellorId, updateData) {
    const { name, email, password } = updateData;
    
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
        email: email
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

    if (counsellor.value && counsellor.value.user_id) {
      const { data: user, error: userError } = await supabase
        .from(TABLE_NAMES.USERS)
        .select('id, email, full_name, role, is_active')
        .eq('id', counsellor.value.user_id)
        .single();

      if (!userError && user) {
        counsellor.users = user;
        counsellor.user_id = user.id;
      }
    }

    return counsellor;
  },

  async updateSourceWithLeads(sourceId, newName) {
    try {
      const { data: source, error: sourceError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('name')
        .eq('id', sourceId)
        .single();

      if (sourceError) throw sourceError;

      const oldSourceName = source.name;

      const { error: updateError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update({ name: newName })
        .eq('id', sourceId);

      if (updateError) throw updateError;

      if (oldSourceName !== newName) {
        console.log(`Updating leads from source "${oldSourceName}" to "${newName}"`);
        const { error: leadsUpdateError } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({ source: newName })
          .eq('source', oldSourceName);

        if (leadsUpdateError) {
          console.error('Error updating leads with new source name:', leadsUpdateError);
          throw leadsUpdateError;
        }

        console.log(`Successfully updated leads from "${oldSourceName}" to "${newName}"`);
      }

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
        .select('name')
        .eq('id', sourceId)
        .single();

      if (sourceError) throw sourceError;

      const sourceName = source.name;

      console.log(`Updating leads with source "${sourceName}" to "NA"`);
      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ source: 'NA' })
        .eq('source', sourceName);

      if (leadsUpdateError) {
        console.error('Error updating leads:', leadsUpdateError);
        throw leadsUpdateError;
      }

      const { error: deleteError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .delete()
        .eq('id', sourceId);

      if (deleteError) throw deleteError;

      console.log(`Successfully updated ${sourceName}'s leads to "NA" and deleted source`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting source with leads:', error);
      throw error;
    }
  },

  async updateGradeWithLeads(gradeId, newName) {
    try {
      const { data: grade, error: gradeError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('name')
        .eq('id', gradeId)
        .single();

      if (gradeError) throw gradeError;

      const oldGradeName = grade.name;

      const { error: updateError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .update({ name: newName })
        .eq('id', gradeId);

      if (updateError) throw updateError;

      if (oldGradeName !== newName) {
        console.log(`Updating leads from grade "${oldGradeName}" to "${newName}"`);
        const { error: leadsUpdateError } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({ grade: newName })
          .eq('grade', oldGradeName);

        if (leadsUpdateError) {
          console.error('Error updating leads with new grade name:', leadsUpdateError);
          throw leadsUpdateError;
        }

        console.log(`Successfully updated leads from "${oldGradeName}" to "${newName}"`);
      }

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
        .select('name')
        .eq('id', gradeId)
        .single();

      if (gradeError) throw gradeError;

      const gradeName = grade.name;

      console.log(`Updating leads with grade "${gradeName}" to "NA"`);
      const { error: leadsUpdateError } = await supabase
        .from(TABLE_NAMES.LEADS)
        .update({ grade: 'NA' })
        .eq('grade', gradeName);

      if (leadsUpdateError) {
        console.error('Error updating leads:', leadsUpdateError);
        throw leadsUpdateError;
      }

      const { error: deleteError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .delete()
        .eq('id', gradeId);

      if (deleteError) throw deleteError;

      console.log(`Successfully updated ${gradeName}'s leads to "NA" and deleted grade`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting grade with leads:', error);
      throw error;
    }
  },

  async updateStageWithLeads(stageId, newName) {
    try {
      const { data: stage, error: stageError } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('name')
        .eq('id', stageId)
        .single();

      if (stageError) throw stageError;

      const oldStageName = stage.name;

      if (oldStageName !== newName) {
        console.log(`Updating leads from stage "${oldStageName}" to "${newName}"`);
        const { error: leadsUpdateError } = await supabase
          .from(TABLE_NAMES.LEADS)
          .update({ stage: newName })
          .eq('stage', oldStageName);

        if (leadsUpdateError) {
          console.error('Error updating leads with new stage name:', leadsUpdateError);
          throw leadsUpdateError;
        }

        console.log(`Successfully updated leads from "${oldStageName}" to "${newName}"`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating stage with leads:', error);
      throw error;
    }
  },

  // ✅ EXISTING: Single lead custom fields fetch
  async getCustomFieldsForLead(leadId) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
        .select('*')
        .eq('lead_id', leadId);
        
      if (error) throw error;
      
      const customFieldsMap = {};
      data?.forEach(field => {
        customFieldsMap[field.field_key] = field.field_value;
      });
      
      return customFieldsMap;
    } catch (error) {
      console.error('Error fetching custom fields for lead:', error);
      throw error;
    }
  },

  // ✅ NEW: Bulk fetch custom fields for multiple leads in ONE query
  async getCustomFieldsForLeads(leadIds) {
    if (!leadIds || leadIds.length === 0) {
      return {};
    }

    try {
      console.log(`Bulk fetching custom fields for ${leadIds.length} leads...`);
      
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
        .select('*')
        .in('lead_id', leadIds);

      if (error) throw error;

      console.log(`Received ${data.length} custom field records`);

      // Group custom fields by lead_id
      const customFieldsByLead = {};
      
      data.forEach(record => {
        const leadId = record.lead_id;
        if (!customFieldsByLead[leadId]) {
          customFieldsByLead[leadId] = {};
        }
        customFieldsByLead[leadId][record.field_key] = record.field_value;
      });

      // Ensure all lead IDs are in the map (even if they have no custom fields)
      leadIds.forEach(leadId => {
        if (!customFieldsByLead[leadId]) {
          customFieldsByLead[leadId] = {};
        }
      });

      console.log(`Organized custom fields for ${Object.keys(customFieldsByLead).length} leads`);
      return customFieldsByLead;
      
    } catch (error) {
      console.error('Error bulk fetching custom fields:', error);
      return {};
    }
  },

  async saveCustomFieldsForLead(leadId, customFieldsData) {
    try {
      console.log('Saving custom fields for lead:', leadId, customFieldsData);
      
      const { data: existingFields, error: fetchError } = await supabase
        .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
        .select('field_key')
        .eq('lead_id', leadId);

      if (fetchError) throw fetchError;

      const existingFieldKeys = existingFields?.map(f => f.field_key) || [];
      const newFieldKeys = Object.keys(customFieldsData);

      const upsertPromises = [];
      
      for (const [fieldKey, fieldValue] of Object.entries(customFieldsData)) {
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          upsertPromises.push(
            supabase
              .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
              .upsert({
                lead_id: leadId,
                field_key: fieldKey,
                field_value: fieldValue,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'lead_id,field_key'
              })
          );
        }
      }

      const fieldsToDelete = existingFieldKeys.filter(key => 
        !newFieldKeys.includes(key) || 
        !customFieldsData[key] || 
        customFieldsData[key] === ''
      );

      if (fieldsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
          .delete()
          .eq('lead_id', leadId)
          .in('field_key', fieldsToDelete);

        if (deleteError) throw deleteError;
      }

      if (upsertPromises.length > 0) {
        const results = await Promise.all(upsertPromises);
        
        for (const result of results) {
          if (result.error) throw result.error;
        }
      }

      console.log('Custom fields saved successfully');
      return { success: true };

    } catch (error) {
      console.error('Error saving custom fields:', error);
      
      if (error.message && error.message.includes('Maximum 5 custom fields allowed')) {
        throw new Error('Maximum 5 custom fields allowed per lead');
      }
      
      throw error;
    }
  },

  async getActiveCustomFieldDefinitions() {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('type', 'form_fields')
        .eq('is_active', true);
        
      if (error) throw error;

      const customFields = data?.filter(field => {
        return this.isCustomFieldByKey(field.field_key) || 
               this.isCustomField(field.name);
      }) || [];

      return customFields;
    } catch (error) {
      console.error('Error fetching custom field definitions:', error);
      throw error;
    }
  },

  async deleteAllCustomFieldsForLead(leadId) {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
        .delete()
        .eq('lead_id', leadId);
        
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting custom fields for lead:', error);
      throw error;
    }
  },

  async getCustomFieldsCountForLead(leadId) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.LEAD_CUSTOM_FIELDS)
        .select('id')
        .eq('lead_id', leadId);
        
      if (error) throw error;
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error counting custom fields for lead:', error);
      throw error;
    }
  },

  async fixCustomFieldKeys() {
    try {
      const { data: customFields, error } = await supabase
        .from(TABLE_NAMES.SETTINGS)
        .select('*')
        .eq('type', 'form_fields')
        .eq('is_custom', true);
        
      if (error) throw error;
      
      const fixPromises = customFields
        .filter(field => !field.field_key)
        .map(field => {
          const fieldKey = 'custom_field_' + field.id;
          
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