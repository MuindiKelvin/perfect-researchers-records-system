import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, InputGroup, Alert } from 'react-bootstrap'; // Removed unused Row, Col imports
import { Link } from 'react-router-dom';
import logo from './logo/logo.png';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setNotification({
        open: true,
        message: 'Please fill in all fields.',
        severity: 'warning',
      });
      return;
    }

    if (password !== confirmPassword) {
      setNotification({
        open: true,
        message: 'Passwords do not match.',
        severity: 'warning',
      });
      return;
    }

    setLoading(true);
    const auth = getAuth();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setNotification({
        open: true,
        message: 'Registration successful! Redirecting to login...',
        severity: 'success',
      });
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleRegister();
    }
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container fluid className="d-flex align-items-center justify-content-center min-vh-100 register-background">
      <Card className="shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <img src={logo} alt="Perfect Researchers Logo" style={{ height: '70px', marginBottom: '1.5rem' }} />
            <h3 className="fw-bold">Create an Account</h3>
            <p className="text-muted">Join Perfect Researchers today</p>
          </div>

          {notification.open && (
            <Alert variant={notification.severity} onClose={closeNotification} dismissible className="mb-4">
              {notification.message}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Label>Email Address</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-envelope-fill"></i>
                </InputGroup.Text>
                <Form.Control
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                  autoFocus
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formPassword">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-lock-fill"></i>
                </InputGroup.Text>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={togglePasswordVisibility}
                  style={{ borderLeft: 'none' }}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                </Button>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formConfirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-lock-fill"></i>
                </InputGroup.Text>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  required
                />
              </InputGroup>
            </Form.Group>

            <Button
              variant="primary"
              size="lg"
              className="w-100 mb-3"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat me-2" style={{ animation: 'spin 1s linear infinite' }}></i>
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="bi bi-person-plus-fill me-2"></i>
                  Register
                </>
              )}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-primary text-decoration-none fw-medium">
                Already have an account? Sign in
              </Link>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <style jsx>{`
        .register-background {
          background: rgba(255, 255, 255, 0.95);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .card {
          border: none;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </Container>
  );
};

export default Register;