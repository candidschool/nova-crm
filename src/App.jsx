import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LeadStateProvider,{ useLeadState } from './components/LeadStateProvider';
import LeadsTable from './components/LeadsTable';
import WarmLeads from './components/WarmLeads';
import HotLeads from './components/HotLeads';
import ColdLeads from './components/ColdLeads';
import EnrolledLeads from './components/EnrolledLeads';
import Dashboard from './components/Dashboard'; 
import CounsellorPerformance from './components/CounsellorPerformance';
import Login from './components/Login';
import SettingsPage from './components/SettingsPage';
import SettingsDataProvider from './contexts/SettingsDataProvider';
import FollowUpTable from './components/FollowUpTable';
import { authService } from './services/authService';

// Wrapper component to handle navigation within Router context
function AppContent() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is already logged in on app start
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          console.log('User already logged in:', currentUser);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setIsLoggingOut(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('Auth state: SIGNED_OUT detected');
        setUser(null);
        setIsLoggingOut(false);
        // Navigate to root/login when signed out
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const handleLogin = (userData) => {
    console.log('handleLogin called with userData:', userData);
    setUser(userData);
    // Navigate to default page after login
    navigate('/all-leads', { replace: true });
  };

  const handleLogout = async () => {
    console.log('handleLogout called, logging out user');
    setIsLoggingOut(true);
    
    try {
      console.log('Starting logout process...');
      await authService.logout();
      console.log('AuthService logout completed');
      
      // Clear user state immediately
      setUser(null);
      
      // Navigate to root/login page immediately
      navigate('/', { replace: true });
      
      console.log('Logout complete, navigated to login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear the user state and navigate
      setUser(null);
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading spinner while checking authentication or logging out
  if (isLoading || isLoggingOut) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div>{isLoading ? 'Loading...' : 'Logging out...'}</div>
        {isLoggingOut && (
          <div style={{ fontSize: '14px', color: '#666' }}>
            Please wait while we securely log you out...
          </div>
        )}
      </div>
    );
  }

  console.log('App rendering, user:', user);

  return (
    <>
      {/* 🔍 DEBUG COMPONENT - Shows user info when logged in */}
      {/*<AccessDebug user={user} />*/}
      
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <SettingsDataProvider>
          {/* ← UPDATED: Pass user prop to LeadStateProvider for role-based filtering */}
          <LeadStateProvider user={user}>
            {/* Pass user data to components that need it */}
            <Routes>
              <Route 
                path="/dashboard" 
                element={<Dashboard onLogout={handleLogout} user={user} />} 
              />

              
              <Route path="/" element={<Navigate to="/all-leads" replace />} />
              <Route 
                path="/all-leads" 
                element={<LeadsTable onLogout={handleLogout} user={user} />} 
              />
              <Route 
                path="/warm" 
                element={<WarmLeads onLogout={handleLogout} user={user} />} 
              />
              <Route 
                path="/hot" 
                element={<HotLeads onLogout={handleLogout} user={user} />} 
              />
              <Route 
                path="/cold" 
                element={<ColdLeads onLogout={handleLogout} user={user} />} 
              />
              <Route 
                path="/enrolled" 
                element={<EnrolledLeads onLogout={handleLogout} user={user} />} 
              />

             
              {/* Only show counsellor performance to admins */}
              
                <Route 
                  path="/counsellor-performance" 
                  element={<CounsellorPerformance onLogout={handleLogout} user={user} />} 
                />
              
              <Route 
                path="/followup" 
                element={<FollowUpTable onLogout={handleLogout} user={user} />} 
              />
              
              
              
              {/* Only show settings to admins */}
              {user.role === 'admin' && (
                <Route 
                  path="/settings" 
                  element={<SettingsPage onLogout={handleLogout} user={user} />} 
                />
              )}
              {/* Redirect unauthorized users */}
              {user.role !== 'admin' && (
                <Route 
                  path="/settings" 
                  element={<Navigate to="/all-leads" replace />} 
                />
              )}

              {/* Catch all route - redirect to all-leads if user is logged in */}
              <Route 
                path="*" 
                element={<Navigate to="/all-leads" replace />} 
              />
                       
            </Routes>
          </LeadStateProvider>
        </SettingsDataProvider> 
      )}
    </>
  );
}

// Main App component with Router wrapper
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;