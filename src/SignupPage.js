import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './AuthPage.css';

function SignupPage({ onBackToHome, onGoToSignin, onSignupSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://legal-llm-backend-production.up.railway.app/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save token
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to chat
        onSignupSuccess(data.user);
      } else {
        setError(data.detail || 'Signup failed');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://legal-llm-backend-production.up.railway.app/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential,
          email: credentialResponse.credential,
          name: 'Google User'
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onSignupSuccess(data.user);
      } else {
        setError(data.detail || 'Google sign up failed');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button className="back-btn" onClick={onBackToHome}>← Back</button>
        
        <div className="auth-form-container">
          <div className="auth-header">
            <h1>⚖️ Create Account</h1>
            <p>Join Legal LLM to save conversations</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="divider">or</div>

          <GoogleOAuthProvider clientId="48357027412-ognqs7gfu456nfj60b4c4a0176hfrh4f.apps.googleusercontent.com">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign up failed')}
              text="signup_with"
              width="100%"
            />
          </GoogleOAuthProvider>

          <p className="auth-footer">
            Already have an account? 
            <button 
              onClick={onGoToSignin}
              style={{ background: 'none', border: 'none', color: '#000000', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;