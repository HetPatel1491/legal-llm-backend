import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './AuthPage.css';

function SigninPage({ onBackToHome, onGoToSignup, onSigninSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

  const handleSignin = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://legal-llm-backend-production.up.railway.app/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save token
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to chat
        onSigninSuccess(data.user);
      } else {
        setError(data.detail || 'Sign in failed');
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
        onSigninSuccess(data.user);
      } else {
        setError(data.detail || 'Google sign in failed');
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
            <h1>⚖️ Welcome Back</h1>
            <p>Sign in to your Legal LLM account</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSignin} className="auth-form">
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
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="divider">or</div>

          <GoogleOAuthProvider clientId="48357027412-ognqs7gfu456nfj60b4c4a0176hfrh4f.apps.googleusercontent.com">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign in failed')}
              text="signin_with"
              width="100%"
            />
          </GoogleOAuthProvider>

          <p className="auth-footer">
            Don't have an account? 
            <button 
              onClick={onGoToSignup}
              style={{ background: 'none', border: 'none', color: '#000000', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' }}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SigninPage;