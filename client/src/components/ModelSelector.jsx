import React, { useState, useEffect } from 'react';
import { PROVIDERS, setModel } from '../services/llmService';

function ModelSelector() {
  // Initialize state with value from localStorage or default
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('selectedModel') || 'groq|llama-3.3-70b-versatile';
  });

  // Set the model on initial load
  useEffect(() => {
    const [provider, model] = selectedModel.split('|');
    setModel(provider, model);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedModel(value);
    localStorage.setItem('selectedModel', value);
    
    const [provider, model] = value.split('|');
    setModel(provider, model);
  };

  return (
    <div className="model-selector-container">
      <select 
        className="model-selector"
        onChange={handleChange}
        value={selectedModel}
      >
      {Object.entries(PROVIDERS).map(([providerId, provider]) => (
        <optgroup key={providerId} label={provider.name}>
          {Object.entries(provider.models).map(([modelId, modelName]) => (
            <option 
              key={`${providerId}|${modelId}`} 
              value={`${providerId}|${modelId}`}
            >
              {modelName}
            </option>
          ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export default ModelSelector; 