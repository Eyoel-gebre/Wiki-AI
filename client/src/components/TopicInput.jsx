import React, { useState, useEffect } from 'react';

function TopicInput({ onSubmit, disabled, initialValue = '' }) {
  const [topic, setTopic] = useState(initialValue);

  // Update topic when initialValue changes
  useEffect(() => {
    setTopic(initialValue);
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="topic-input">
      <div className="topic-input-container">
        <input
          className="topic-input-field"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g., 'History of France')"
          // disabled={disabled}
        />
        <button className="topic-input-button" type="submit" disabled={disabled || !topic.trim()}>
          <i className="fas fa-search"></i>
        </button>
      </div>
    </form>
  );
}

export default TopicInput; 