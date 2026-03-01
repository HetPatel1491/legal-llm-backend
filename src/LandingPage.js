import React from 'react';
import './LandingPage.css';

function LandingPage({ onSignIn, onSignUp, onGuest }) {
  return (
    <div className="landing-container">
      {/* Background gradient */}
      <div className="landing-background"></div>

      {/* Content */}
      <div className="landing-content">
        {/* Header */}
        <div className="landing-header">
          <h1>⚖️ Legal AI</h1>
          <p>Your AI Legal Assistant</p>
          <p className="subtitle">Get instant answers to your legal questions</p>
        </div>

        {/* Buttons */}
        <div className="landing-buttons">
          <button className="btn btn-primary" onClick={onSignIn}>
            Sign In
          </button>
          
          <button className="btn btn-secondary" onClick={onSignUp}>
            Sign Up
          </button>
          
          <button className="btn btn-guest" onClick={onGuest}>
            Continue as Guest
          </button>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p>Help people understand law. Free legal assistance for everyone.</p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;