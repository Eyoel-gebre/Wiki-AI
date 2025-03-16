import React from 'react';
import Topic from './Topic';

function TableOfContents({ 
  loading, 
  title, 
  topics, 
  onStudyClick,
  studyMode,
  activeTopic,
  activeSubtopic,
  mobileToc
}) {
  if (!title && topics.length === 0) {
    return null;
  }

  const handleTopicSelect = (topic) => {
    // Extract the original topic data from the formatted topic
    const originalTopicIndex = topic.topicIndex;
    const originalTopic = topics[originalTopicIndex];
    onStudyClick(originalTopic, originalTopicIndex);
  };
  return (
    <div className={`toc-container ${studyMode ? 'sidebar' : ''} ${mobileToc ? 'mobile-toc' : ''}`}>
      <div className="table-of-contents">
        {/* <h2>{title}</h2> */}
        {topics.length > 0 && (
          <h3 className="toc-title">Contents</h3>
        )}
        <div className="topics-list">
          {topics.map((topic, topicIndex) => {
            const formattedTopic = {
              topicIndex: topicIndex,
              title: `${topic.title}`,
              subtopics: topic.subtopics?.map((subtopic, subIndex) => ({
                title: `${subtopic}`,
                content: subtopic
              }))
            };

            return (
              <Topic
                key={topicIndex}
                topic={formattedTopic}
                onSelect={handleTopicSelect}
                activeTopic={activeTopic}
                activeSubtopic={activeSubtopic}
              />
            );
          })}
        </div>
        {loading && topics.length > 0 && <div className="loading-dots" style={{fontSize: '.85rem', marginTop: '.5rem', fontWeight: '400'}}>Loading contents</div>}
      </div>
    </div>
  );
}

export default TableOfContents; 