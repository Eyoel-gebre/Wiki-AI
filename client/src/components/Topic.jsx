import React, { useState } from 'react';

const Topic = ({ topic, onSelect, activeTopic, activeSubtopic }) => {
  const [isHovered, setIsHovered] = useState(false);

  const activeSubtopicIndex = activeSubtopic ? parseInt(activeSubtopic.split('-')[1]) : null;

  const handleClick = (e) => {
    e.preventDefault();
    onSelect(topic);
  };

  return (
    <div
      className={`topic`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // onClick={handleClick}
    >
      <div className={`topic-header ${topic.title === activeTopic || (activeTopic === null && topic.topicIndex === 0) ? 'active' : ''}`}>
        <h3>{topic.title}</h3>
        {/* {topic.subtopics?.length > 0 && (
          <span className="expand-icon">{shouldExpand ? '−' : '+'}</span>
        )} */}
      </div>

      {topic.subtopics?.length > 0 && (
        <div className="topic-content">
          <div className="subtopics">
            {topic.subtopics.map((subtopic, index) => (
              <div 
                key={index} 
                className={`subtopic ${index === activeSubtopicIndex && topic.title === activeTopic ? 'active' : ''}`}
              >
                {subtopic.title}
              </div>
            ))}
          </div>
        </div>
      )}

      
      {/* Modified condition to help debug */}
      {/* {shouldExpand && topic.subtopics?.length > 0 && (
        <div className="topic-content">
          <div className="subtopics">
            {topic.subtopics.map((subtopic, index) => (
              <div 
                key={index} 
                className="subtopic"
              >
                {subtopic.title}
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Topic; 