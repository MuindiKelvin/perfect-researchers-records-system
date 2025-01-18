import React, { useState } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Link } from 'react-router-dom';
import logo from './logo/logo.png';
import Login from './Login';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect and reload to ensure a fresh session
      navigate('/login');
      window.location.reload(); // Optional: Reload the page for a clean state
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: 'bi-house-door-fill' },
    { path: '/projects', name: 'Projects', icon: 'bi-file-text-fill' },
    { path: '/employees', name: 'Employees', icon: 'bi-people-fill' },
    { path: '/reports', name: 'Reports', icon: 'bi-bar-chart-fill' },
    { path: '/profile', name: 'Profile', icon: 'bi-person-circle' },
  ];

  return (
    <div 
      className={`bg-dark text-white min-vh-100 ${expanded ? 'w-250' : 'w-75'}`}
      style={{
        transition: 'width 0.3s ease',
        width: expanded ? '250px' : '75px',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div className="d-flex flex-column h-100">
        {/* Header/Logo Section */}
        <div className="p-3 border-bottom border-secondary">
          <div className="d-flex align-items-center">
            {expanded && (
              <div className="d-flex align-items-center">
                <img 
                  src={logo} 
                  alt="Perfect Researchers Logo" 
                  className="me-2" 
                  style={{ height: '30px', width: 'auto' }} 
                />
                <h5 className="mb-0 text-white">Perfect Researchers</h5>
              </div>
            )}
            <Button 
              variant="link" 
              className="ms-auto text-white p-0"
              onClick={() => setExpanded(!expanded)}
            >
              <i className={`bi ${expanded ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <Nav className="flex-column flex-grow-1 py-3">
          {menuItems.map((item) => (
            <Nav.Link
              as={Link}
              to={item.path}
              key={item.path}
              className={`px-3 py-2 d-flex align-items-center
                ${location.pathname === item.path ? 'bg-primary text-white' : 'text-white-50'}
                ${expanded ? '' : 'justify-content-center'}
                hover-highlight
              `}
              style={{ cursor: 'pointer' }}
            >
              <i className={`${item.icon} ${expanded ? 'me-2' : ''}`} style={{ fontSize: '1.1rem' }}></i>
              {expanded && <span>{item.name}</span>}
            </Nav.Link>
          ))}
        </Nav>

        {/* User Info & Logout Section */}
        <div className="p-3 border-top border-secondary">
          {expanded && (
            <div className="mb-3 d-flex align-items-center">
              <i className="bi bi-person-circle me-2" style={{ fontSize: '1.2rem' }}></i>
              <div>
                <small className="d-block text-white-50">Logged in as</small>
                <span className="text-white">{auth.currentUser?.email}</span>
              </div>
            </div>
          )}
          <Button
            variant="outline-danger"
            onClick={handleLogout}
            className={`w-100 d-flex align-items-center justify-content-${expanded ? 'start' : 'center'}`}
          >
            <i className={`bi bi-box-arrow-right ${expanded ? 'me-2' : ''}`}></i>
            {expanded && 'Logout'}
          </Button>
        </div>
      </div>

      <style>{`
        .w-250 {
          width: 250px;
        }
        
        .hover-highlight:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .nav-link {
          transition: background-color 0.2s ease;
        }
        
        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
