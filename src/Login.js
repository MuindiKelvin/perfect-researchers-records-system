import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, InputGroup, Alert, Row, Col, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import logo from './logo/logo.png';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const navigate = useNavigate();

  // Pre-fill email if "Remember Me" was previously checked
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setNotification({
        open: true,
        message: 'Please fill in all fields.',
        severity: 'warning',
      });
      return;
    }

    setLoading(true);
    const auth = getAuth();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setNotification({
        open: true,
        message: 'Login successful! Redirecting...',
        severity: 'success',
      });

      onLogin();

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setTimeout(() => navigate('/dashboard'), 1500);
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
      handleLogin();
    }
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotEmail) {
      setNotification({
        open: true,
        message: 'Please enter your email address.',
        severity: 'warning',
      });
      return;
    }

    setLoading(true);
    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setNotification({
        open: true,
        message: 'Password reset email sent! Check your inbox.',
        severity: 'success',
      });
      setShowForgotModal(false);
      setForgotEmail('');
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

  const handleForgotModalClose = () => {
    setShowForgotModal(false);
    setForgotEmail('');
  };

  return (
    <Container fluid className="d-flex align-items-center justify-content-center min-vh-100 login-background">
      <Card className="shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <img src={logo} alt="Perfect Researchers Logo" style={{ height: '70px', marginBottom: '1.5rem' }} />
            <h3 className="fw-bold">Welcome Back</h3>
            <p className="text-muted">Sign in to continue</p>
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

            <Row className="mb-3 align-items-center">
              <Col xs={6}>
                <Form.Group controlId="formRememberMe">
                  <Form.Check
                    type="checkbox"
                    label="Remember Me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                </Form.Group>
              </Col>
              <Col xs={6} className="text-end">
                <Button
                  variant="link"
                  className="p-0 text-primary fw-medium"
                  onClick={() => setShowForgotModal(true)}
                >
                  Forgot Password?
                </Button>
              </Col>
            </Row>

            <Button
              variant="primary"
              size="lg"
              className="w-100 mb-3"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat me-2" style={{ animation: 'spin 1s linear infinite' }}></i>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Sign In
                </>
              )}
            </Button>

            <div className="text-center">
              <Link to="/register" className="text-primary text-decoration-none fw-medium">
                Don't have an account? Sign up
              </Link>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Forgot Password Modal */}
      <Modal show={showForgotModal} onHide={handleForgotModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formForgotEmail">
              <Form.Label>Email Address</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-envelope-fill"></i>
                </InputGroup.Text>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyPress={(event) => event.key === 'Enter' && handleForgotPasswordSubmit()}
                  required
                  autoFocus
                />
              </InputGroup>
              <Form.Text className="text-muted">
                We’ll send you a link to reset your password.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleForgotModalClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleForgotPasswordSubmit} disabled={loading}>
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat me-2" style={{ animation: 'spin 1s linear infinite' }}></i>
                Sending...
              </>
            ) : (
              <>
                <i className="bi bi-send-fill me-2"></i>
                Send Reset Link
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .login-background {
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

export default Login;