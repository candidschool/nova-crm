// src/components/AccessDebug.jsx
import React from 'react';

const AccessDebug = ({ user }) => {
  const isAdmin = user?.role === 'admin';
  
  // Don't show debug if no user
  if (!user) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: isAdmin ? '#fee2e2' : '#dbeafe',
      border: `2px solid ${isAdmin ? '#dc2626' : '#2563eb'}`,
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        🔍 Access Debug
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Email:</strong> {user?.email || 'Not logged in'}
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Role:</strong> {user?.role || 'No role'}
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>User ID:</strong> {user?.id || 'No ID'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Auth ID:</strong> {user?.auth_id?.substring(0, 8) + '...' || 'No auth ID'}
      </div>
      
      <div style={{ 
        background: isAdmin ? '#dc2626' : '#2563eb',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        {isAdmin ? '🚀 ADMIN ACCESS' : '👤 USER ACCESS'}
      </div>
      
      <div style={{ marginTop: '8px', fontSize: '11px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Expected Access:</div>
        {isAdmin ? (
          <div style={{ color: '#16a34a' }}>
            ✅ Can see all leads<br/>
            ✅ Can access counsellor performance<br/>
            ✅ Can manage all data
          </div>
        ) : (
          <div style={{ color: '#dc2626' }}>
            ❌ Can only see own leads<br/>
            ❌ Cannot access counsellor performance<br/>
            ❌ Limited data access
          </div>
        )}
      </div>
      
      {/* Quick test button */}
      <button 
        onClick={() => {
          console.log('🧪 User Debug Info:', user);
          console.log('🔑 Is Admin:', isAdmin);
          console.log('📊 Full user object:', JSON.stringify(user, null, 2));
          console.log('🎯 Can access counsellor performance:', user?.role === 'admin');
        }}
        style={{
          marginTop: '8px',
          width: '100%',
          padding: '4px 8px',
          fontSize: '10px',
          backgroundColor: '#374151',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Log User Info to Console
      </button>
    </div>
  );
};

export default AccessDebug;