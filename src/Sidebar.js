import React, { useState } from 'react';
import { Nav, Button, OverlayTrigger, Tooltip as BootstrapTooltip } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import logo from './logo/logo.png';

const menuItems = [
  { path: '/dashboard', name: 'Dashboard', icon: 'bi-speedometer2' }, // Updated icon for dashboard
  { path: '/projects', name: 'Projects', icon: 'bi-folder-fill' }, // Updated icon for projects
  { path: '/employees', name: 'Writers', icon: 'bi-person-lines-fill' }, // Updated icon for writers
  { path: '/invoices', name: 'Invoices', icon: 'bi-receipt-cutoff' }, // Updated icon for invoices
  { path: '/reports', name: 'Reports', icon: 'bi-graph-up' }, // Updated icon for reports
  { path: '/profile', name: 'Profile', icon: 'bi-person-circle' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [darkTheme, setDarkTheme] = useState(true); // Theme toggle state
  const [showToolsSubMenu, setShowToolsSubMenu] = useState(false); // Submenu state for tools

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
      window.location.reload();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleTheme = () => {
    setDarkTheme(!darkTheme);
  };

  const renderTooltip = (name) => (
    <BootstrapTooltip id={`tooltip-${name}`}>{name}</BootstrapTooltip>
  );

  return (
    <div
      className={`${darkTheme ? 'bg-dark text-white' : 'bg-light text-dark'} min-vh-100 ${expanded ? 'w-250' : 'w-75'}`}
      style={{
        transition: 'width 0.3s ease, background-color 0.3s ease',
        width: expanded ? '250px' : '75px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        borderRight: `1px solid ${darkTheme ? '#444' : '#ddd'}`,
      }}
    >
      <div className="d-flex flex-column h-100">
        {/* Header/Logo Section */}
        <div className={`p-3 border-bottom ${darkTheme ? 'border-secondary' : 'border-light'}`}>
          <div className="d-flex align-items-center">
            {expanded && (
              <div className="d-flex align-items-center">
                <img
                  src={logo}
                  alt="Perfect Researchers Logo"
                  className="me-2"
                  style={{ height: '30px', width: 'auto' }}
                />
                <h5 className="mb-0">Perfect Researchers</h5>
              </div>
            )}
            <Button
              variant="link"
              className={`ms-auto p-0 ${darkTheme ? 'text-white' : 'text-dark'}`}
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <i className={`bi ${expanded ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <Nav className="flex-column flex-grow-1 py-3">
          {menuItems.map((item) => (
            <OverlayTrigger
              key={item.path}
              placement="right"
              overlay={!expanded ? renderTooltip(item.name) : <BootstrapTooltip id="dummy" />}
              delay={{ show: 250, hide: 400 }}
            >
              <Nav.Link
                as={Link}
                to={item.path}
                className={`px-3 py-2 d-flex align-items-center
                  ${location.pathname === item.path ? 'bg-primary text-white' : darkTheme ? 'text-white-50' : 'text-dark'}
                  ${expanded ? '' : 'justify-content-center'}
                  hover-highlight`}
                style={{ cursor: 'pointer' }}
              >
                <i className={`${item.icon} ${expanded ? 'me-2' : ''}`} style={{ fontSize: '1.3rem' }}></i>
                {expanded && <span>{item.name}</span>}
              </Nav.Link>
            </OverlayTrigger>
          ))}

      </Nav>

        {/* User Info & Theme Toggle */}
        <div className={`p-3 border-top ${darkTheme ? 'border-secondary' : 'border-light'}`}>
          {expanded && (
            <div className="mb-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="bi bi-person-circle me-2" style={{ fontSize: '1.2rem' }}></i>
                <div>
                  <small className={`d-block ${darkTheme ? 'text-white-50' : 'text-muted'}`}>Logged in as</small>
                  <span>{auth.currentUser?.email}</span>
                </div>
              </div>
              <Button
                variant="link"
                className={`p-0 ${darkTheme ? 'text-white-50' : 'text-dark'}`}
                onClick={toggleTheme}
                aria-label={darkTheme ? "Switch to light theme" : "Switch to dark theme"}
              >
                <i className={`bi ${darkTheme ? 'bi-sun-fill' : 'bi-moon-fill'}`} style={{ fontSize: '1.2rem' }}></i>
              </Button>
            </div>
          )}
          <Button
            variant="outline-danger"
            onClick={handleLogout}
            className={`w-100 d-flex align-items-center justify-content-${expanded ? 'start' : 'center'}`}
          >
            <i className={`bi bi-box-arrow-right ${expanded ? 'me-2' : ''}`} style={{ fontSize: '1.2rem' }}></i>
            {expanded && 'Logout'}
          </Button>
        </div>

        {/* Copyright Footer */}
        {expanded && (
          <div className={`p-3 text-center ${darkTheme ? 'text-white-50' : 'text-muted'} border-top ${darkTheme ? 'border-secondary' : 'border-light'}`}>
            <small>
              © {new Date().getFullYear()} Kelvin Muindi
              <br />
              All rights reserved
            </small>
          </div>
        )}
      </div>

      <style>{`
        .w-250 {
          width: 250px;
        }
        .hover-highlight:hover {
          background-color: ${darkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        }
        .nav-link {
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;