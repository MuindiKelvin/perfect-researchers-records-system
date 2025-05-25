import React, { useState, useEffect } from 'react';
import {
  Button, Form, Container, Alert, Card, InputGroup, ProgressBar, Badge, Row, Col
} from 'react-bootstrap';
import {
  getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const [adminProfile, setAdminProfile] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    displayName: '',
  });
  const [notification, setNotification] = useState({ message: '', variant: '' });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) setDarkMode(JSON.parse(savedMode));
    if (user?.displayName) {
      setAdminProfile(prev => ({ ...prev, displayName: user.displayName }));
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  };

  const handleInputChange = (field, value) => {
    setAdminProfile(prev => ({ ...prev, [field]: value }));
    if (field === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length > 5) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    if (password.length > 8) strength += 20;
    return Math.min(strength, 100);
  };

  const togglePasswordVisibility = (type) => {
    setShowPassword(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handlePasswordChange = async () => {
    if (!adminProfile.currentPassword || !adminProfile.newPassword || !adminProfile.confirmPassword) {
      setNotification({ message: 'Please fill in all password fields.', variant: 'warning' });
      setTimeout(() => setNotification({}), 3000);
      return;
    }

    if (adminProfile.newPassword !== adminProfile.confirmPassword) {
      setNotification({ message: 'New password and confirm password do not match.', variant: 'danger' });
      setTimeout(() => setNotification({}), 3000);
      return;
    }

    if (passwordStrength < 60) {
      setNotification({ message: 'Please use a stronger password (at least 60% strength).', variant: 'warning' });
      setTimeout(() => setNotification({}), 3000);
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, adminProfile.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, adminProfile.newPassword);

      setNotification({ message: 'Password updated successfully!', variant: 'success' });
      setAdminProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      setNotification({ message: error.message, variant: 'danger' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification({}), 3000);
    }
  };

  const handleSaveProfile = () => {
    setNotification({ message: 'Profile settings saved (display name update not implemented).', variant: 'success' });
    setTimeout(() => setNotification({}), 3000);
  };

  return (
    <Container className={`py-5 ${darkMode ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2>Admin Profile</h2>
        </Col>
        <Col xs="auto">
          <Button variant={darkMode ? 'outline-light' : 'outline-dark'} onClick={toggleDarkMode}>
            <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-fill'} me-2`}></i>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </Col>
      </Row>

      {notification.message && (
        <Alert variant={notification.variant} onClose={() => setNotification({})} dismissible>
          {notification.message}
        </Alert>
      )}

      <Card className={`shadow ${darkMode ? 'bg-secondary text-white' : 'bg-white'} hover-card`}>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5>Edit Admin Profile</h5>
          <Badge bg="info" pill>{user?.email || 'Admin'}</Badge>
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formDisplayName">
              <Form.Label>Display Name</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-person-fill"></i></InputGroup.Text>
                <Form.Control
                  type="text"
                  value={adminProfile.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter display name"
                  disabled={loading}
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formCurrentPassword">
              <Form.Label>Current Password</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-lock-fill"></i></InputGroup.Text>
                <Form.Control
                  type={showPassword.current ? 'text' : 'password'}
                  value={adminProfile.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading}
                />
                <Button variant="outline-secondary" onClick={() => togglePasswordVisibility('current')}>
                  {showPassword.current ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formNewPassword">
              <Form.Label>New Password</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-lock-fill"></i></InputGroup.Text>
                <Form.Control
                  type={showPassword.new ? 'text' : 'password'}
                  value={adminProfile.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                />
                <Button variant="outline-secondary" onClick={() => togglePasswordVisibility('new')}>
                  {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </InputGroup>
              <ProgressBar
                now={passwordStrength}
                variant={passwordStrength >= 80 ? 'success' : passwordStrength >= 60 ? 'warning' : 'danger'}
                label={`${passwordStrength}%`}
                className="mt-2"
                style={{ height: '10px' }}
              />
              <Form.Text className={darkMode ? 'text-light' : 'text-muted'}>
                Strength: {passwordStrength >= 80 ? 'Strong' : passwordStrength >= 60 ? 'Moderate' : 'Weak'}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formConfirmPassword">
              <Form.Label>Confirm New Password</Form.Label>
              <InputGroup>
                <InputGroup.Text><i className="bi bi-lock-fill"></i></InputGroup.Text>
                <Form.Control
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={adminProfile.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                <Button variant="outline-secondary" onClick={() => togglePasswordVisibility('confirm')}>
                  {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Button variant="primary" onClick={handlePasswordChange} disabled={loading} className="me-2">
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat me-2" style={{ animation: 'spin 1s linear infinite' }}></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="bi bi-key-fill me-2"></i>
                  Update Password
                </>
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hover-card:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease-in-out;
        }
      `}</style>
    </Container>
  );
};

export default Profile;
