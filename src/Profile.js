import React, { useState } from 'react';
import { Button, Form, Container, Alert, Card } from 'react-bootstrap';

const Profile = () => {
  const [adminProfile, setAdminProfile] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notification, setNotification] = useState({
    message: '',
    variant: '', // 'success' or 'danger'
  });

  const handlePasswordChange = () => {
    // Check if new password and confirm password match
    if (adminProfile.newPassword !== adminProfile.confirmPassword) {
      setNotification({
        message: 'New password and confirm password do not match.',
        variant: 'danger',
      });
      // Automatically hide the notification after 3 seconds
      setTimeout(() => setNotification({}), 3000);
      return;
    }

    // Handle the password update logic here (e.g., make an API call or update in Firebase)
    console.log('Password Updated:', adminProfile);

    // Simulate successful password change
    setNotification({
      message: 'Password updated successfully!',
      variant: 'success',
    });

    // Automatically hide the notification after 3 seconds
    setTimeout(() => setNotification({}), 3000);

    // Clear the form fields after updating
    setAdminProfile({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '', // Clear confirm password too
    });
  };

  return (
    <Container>
      <h2 className="my-4">Admin Profile</h2>

      {/* Display notification if there is one */}
      {notification.message && (
        <Alert variant={notification.variant} onClose={() => setNotification({})} dismissible>
          {notification.message}
        </Alert>
      )}

      {/* Profile Form inside a Card */}
      <Card>
        <Card.Header>
          <h5>Edit Admin Profile</h5>
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={adminProfile.currentPassword}
                onChange={(e) => setAdminProfile({
                  ...adminProfile,
                  currentPassword: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={adminProfile.newPassword}
                onChange={(e) => setAdminProfile({
                  ...adminProfile,
                  newPassword: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={adminProfile.confirmPassword}
                onChange={(e) => setAdminProfile({
                  ...adminProfile,
                  confirmPassword: e.target.value
                })}
              />
            </Form.Group>

            {/* Button to update password */}
            <Button variant="primary" onClick={handlePasswordChange}>
              Update Password
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Profile;
