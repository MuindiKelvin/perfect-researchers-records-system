import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar'; // Import Sidebar component
import Login from './Login'; // Import Login component
import Register from './Register'; // Import Register component
import Dashboard from './Dashboard'; // Import Dashboard component
import ProjectForm from './ProjectForm'; // Import ProjectForm component
import Reports from './Reports'; // Import Reports component
import Profile from './Profile'; // Import Profile component
import EmployeeForm from './EmployeeForm'; // Import EmployeeForm component
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap styles

// ProtectedRoute component to guard routes
const ProtectedRoute = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication state
  const navigate = useNavigate(); // useNavigate hook to programmatically navigate

  // Handlers for login and logout
  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('/dashboard'); // Redirect to dashboard after login
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <div className="d-flex">
      {/* Render Sidebar only if user is authenticated */}
      {isAuthenticated && <Sidebar onLogout={handleLogout} />}

      {/* Main Content Area */}
      <div className={`flex-grow-1 p-4 ${!isAuthenticated ? 'w-100' : ''}`}>
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={<Login onLogin={handleLogin} />}
          />
          {/* Register Route */}
          <Route
            path="/register"
            element={<Register />}
          />
          {/* Dashboard Route - Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Projects Route - Protected */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ProjectForm />
              </ProtectedRoute>
            }
          />
          {/* Employees Route - Protected */}
          <Route
            path="/employees"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />
          {/* Reports Route - Protected */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Reports />
              </ProtectedRoute>
            }
          />
          {/* Profile Route - Protected */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* Default Redirect to Login */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
