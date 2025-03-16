import React from 'react';
import { Link } from 'react-router-dom';
import ModelSelector from './ModelSelector';
import TopicInput from './TopicInput';

function Header({ onTopicSubmit, loading, currentSubject, qaEnabled, setQaEnabled, expandEnabled, setExpandEnabled }) {
  const handleQaToggle = (e) => {
    const newValue = e.target.checked;
    setQaEnabled(newValue);
    localStorage.setItem('qaEnabled', newValue.toString());
  };

  const handleExpandToggle = (e) => {
    const newValue = e.target.checked;
    setExpandEnabled(newValue);
    localStorage.setItem('expandEnabled', newValue.toString());
  };

  return (
    <>
      <div className="app-header">
        <header>
          <div className="first-row">
            <Link to="/" className="title-container">
              <h1 className="app-title">
                Wiki AI
              </h1>
            </Link>
            <ModelSelector />
            <div className="qa-selector-container">
              <input 
                type="checkbox" 
                id="qa-toggle" 
                checked={qaEnabled} 
                onChange={handleQaToggle} 
              />
              <label htmlFor="qa-toggle">QA</label>
            </div>
            <div className="expand-selector-container">
              <input 
                type="checkbox" 
                id="expand-toggle" 
                checked={expandEnabled} 
                onChange={handleExpandToggle} 
              />
              <label htmlFor="expand-toggle">Expand</label>
            </div>
          </div>
        </header>
        <TopicInput onSubmit={onTopicSubmit} disabled={loading} initialValue={currentSubject} />
      </div>
    </>
  );
}

export default Header; 