import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar'; // Import Sidebar component
import Login from './Login'; // Import Login component
import Register from './Register'; // Import Register component
import Dashboard from './Dashboard'; // Import Dashboard component
import ProjectForm from './ProjectForm'; // Import ProjectForm component
import NormalOrders from './NormalOrders'; // Import NormalOrders component
import Dissertations from './Dissertations'; // Import Dissertations component
import Reports from './Reports'; // Import Reports component
import Profile from './Profile'; // Import Profile component
import EmployeeForm from './EmployeeForm'; // Import EmployeeForm component
import Invoices from './Invoices'; // Import Invoices component
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap styles

// ProtectedRoute component to guard routes
const ProtectedRoute = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication state
  const [isMobile, setIsMobile] = useState(false); // Mobile device detection
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const navigate = useNavigate(); // useNavigate hook to programmatically navigate

  // Detect screen size and update mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768; // Bootstrap md breakpoint
      setIsMobile(mobile);
      // Auto-close sidebar on desktop
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers for login and logout
  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('/dashboard'); // Redirect to dashboard after login
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSidebarOpen(false); // Close sidebar on logout
    navigate('/login'); // Redirect to login after logout
  };

  // Toggle mobile sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking on main content (mobile only)
  const handleMainContentClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="d-flex position-relative vh-100 overflow-hidden">
      {/* Mobile Header with Hamburger Menu */}
      {isAuthenticated && isMobile && (
        <div className="position-fixed top-0 start-0 end-0 bg-primary text-white p-3 d-flex justify-content-between align-items-center" 
             style={{ zIndex: 1050, height: '60px' }}>
          <button
            className="btn btn-outline-light d-md-none"
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </span>
          </button>
          <h5 className="mb-0 text-truncate">Dashboard</h5>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isAuthenticated && isMobile && sidebarOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Responsive behavior */}
      {isAuthenticated && (
        <div className={`
          ${isMobile ? 'position-fixed top-0 start-0 h-100' : 'position-relative'}
          ${isMobile && !sidebarOpen ? 'translate-start-n100' : ''}
          ${isMobile ? 'shadow-lg' : ''}
        `}
        style={{ 
          zIndex: isMobile ? 1045 : 'auto',
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out',
          width: isMobile ? '280px' : 'auto'
        }}>
          <Sidebar 
            onLogout={handleLogout} 
            isMobile={isMobile}
            onNavigate={() => isMobile && setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className={`
          flex-grow-1 d-flex flex-column overflow-auto
          ${!isAuthenticated ? 'w-100' : ''}
          ${isAuthenticated && isMobile ? 'pt-5' : ''}
        `}
        onClick={handleMainContentClick}
        style={{
          minHeight: '100vh',
          paddingTop: isAuthenticated && isMobile ? '60px' : '0'
        }}
      >
        <div className="container-fluid p-3 p-md-4 flex-grow-1">
          <Routes>
            {/* Login Route */}
            <Route
              path="/login"
              element={
                <div className="row justify-content-center min-vh-100 align-items-center">
                  <div className="col-12 col-sm-8 col-md-6 col-lg-4">
                    <Login onLogin={handleLogin} />
                  </div>
                </div>
              }
            />
            {/* Register Route */}
            <Route
              path="/register"
              element={
                <div className="row justify-content-center min-vh-100 align-items-center">
                  <div className="col-12 col-sm-8 col-md-6 col-lg-4">
                    <Register />
                  </div>
                </div>
              }
            />
            {/* Dashboard Route - Protected */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <Dashboard />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Projects Route - Protected */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <ProjectForm />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Normal Orders Route - Protected */}
            <Route
              path="/projects/normal-orders"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <NormalOrders />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Dissertations Route - Protected */}
            <Route
              path="/projects/dissertations"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <Dissertations />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Employees Route - Protected */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <EmployeeForm />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Reports Route - Protected */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <Reports />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Invoices Route - Protected */}
            <Route
              path="/invoices"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row">
                    <div className="col-12">
                      <Invoices />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Profile Route - Protected */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <div className="row justify-content-center">
                    <div className="col-12 col-lg-8">
                      <Profile />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            {/* Default Redirect to Login */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;