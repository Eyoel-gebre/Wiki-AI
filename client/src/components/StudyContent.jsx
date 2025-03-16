import React, { useState, useEffect } from 'react';
import { getAnswerToQuestion, expandSentence } from '../services/llmService';

// Helper function to parse content into structured data
function parseContent(text) {
  if (!text) return [];
  
  // Split content into paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map(paragraph => {
    // Check if this is a header
    const headerMatch = paragraph.match(/^(#{1,3}) (.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      return {
        type: 'header',
        level,
        content,
        sentences: [{ text: content }]
      };
    }
    
    // Process regular paragraph
    let processedText = paragraph
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italics
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists (simplified)
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      // Convert bracketed text to links
      .replace(/\[(.*?)\]/g, '<link>$1</link>');
    
    // Split into sentences
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = [];
    let match;
    
    while ((match = sentenceRegex.exec(processedText)) !== null) {
      sentences.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // If no sentences were found (e.g., just a phrase without punctuation)
    if (sentences.length === 0 && processedText.trim()) {
      sentences.push({
        text: processedText,
        start: 0,
        end: processedText.length
      });
    }
    
    return {
      type: 'paragraph',
      content: processedText,
      sentences
    };
  });
}

// Component to render a sentence with proper formatting
const Sentence = ({ text, onClick, expandEnabled, sentenceId }) => {
  // Process inline formatting
  const parts = [];
  let currentIndex = 0;
  
  // Handle bold text
  const boldRegex = /<strong>(.*?)<\/strong>/g;
  let boldMatch;
  
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    if (boldMatch.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, boldMatch.index)
      });
    }
    
    parts.push({
      type: 'bold',
      content: boldMatch[1]
    });
    
    currentIndex = boldMatch.index + boldMatch[0].length;
  }
  
  // Handle italic text
  const italicRegex = /<em>(.*?)<\/em>/g;
  let italicMatch;
  
  while ((italicMatch = italicRegex.exec(text)) !== null) {
    if (italicMatch.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, italicMatch.index)
      });
    }
    
    parts.push({
      type: 'italic',
      content: italicMatch[1]
    });
    
    currentIndex = italicMatch.index + italicMatch[0].length;
  }
  
  // Handle links
  const linkRegex = /<link>(.*?)<\/link>/g;
  let linkMatch;
  
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    if (linkMatch.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, linkMatch.index)
      });
    }
    
    parts.push({
      type: 'link',
      content: linkMatch[1]
    });
    
    currentIndex = linkMatch.index + linkMatch[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(currentIndex)
    });
  }
  
  // If no special formatting was found, just use the whole text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text
    });
  }
  
  return (
    <span 
      className={expandEnabled ? 'sentence' : ''} 
      onClick={expandEnabled ? onClick : undefined} 
      id={sentenceId}
      data-tooltip={expandEnabled ? "Click to expand" : ""}
    >
      {parts.map((part, index) => {
        switch (part.type) {
          case 'bold':
            return <strong key={index}>{part.content}</strong>;
          case 'italic':
            return <em key={index}>{part.content}</em>;
          case 'link':
            return <a key={index} href={`/${part.content}`}>{part.content}</a>;
          default:
            return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
};

// Component to render a paragraph with its sentences
const Paragraph = ({ paragraph, onSentenceClick, expandEnabled, paragraphId }) => {
  if (paragraph.type === 'header') {
    const HeaderTag = `h${paragraph.level}`;
    return <HeaderTag>{paragraph.content}</HeaderTag>;
  }
  
  if (paragraph.type === 'paragraph') {
    return (
      <p>
        {paragraph.sentences.map((sentence, index) => (
          <Sentence 
            key={index}
            text={sentence.text}
            onClick={() => onSentenceClick(sentence.text, `${paragraphId}-${index}`)}
            expandEnabled={expandEnabled}
            sentenceId={`${paragraphId}-${index}`}
          />
        ))}
      </p>
    );
  }
  
  return null;
};

function StudyContent({ 
  loading, 
  subtopics, 
  setStudySubtopics, 
  onExit, 
  currentTopic, 
  qaEnabled, 
  expandEnabled, 
  totalTopics,
  activeSubtopic 
}) {
  // State to track which paragraph is being hovered
  const [hoveredParagraph, setHoveredParagraph] = useState(null);
  // State to track input values for each paragraph
  const [inputValues, setInputValues] = useState({});
  // State for answers and loading state
  const [answers, setAnswers] = useState({});
  const [answerLoading, setAnswerLoading] = useState({});
  
  // Reset answers and inputs when topic changes
  useEffect(() => {
    setAnswers({});
    setInputValues({});
    setAnswerLoading({});
    setHoveredParagraph(null);
  }, [currentTopic]);
  
  const handleParagraphMouseEnter = (id) => {
    setHoveredParagraph(id);
  };
  
  const handleParagraphMouseLeave = () => {
    setHoveredParagraph(null);
  };
  
  const handleInputChange = (id, value) => {
    setInputValues(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  const handleSentenceClick = async (sentenceText, sentenceId) => {
    try {
      // Parse the sentence ID to get indices
      var [subtopicIndex, paragraphIndex, sentenceIndex] = sentenceId.split('-').map(Number);
      
      // Get the expansion stream
      const stream = await expandSentence(sentenceText);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      // Initialize expanded text with the original sentence
      let expandedText = sentenceText;
      
      // Process the stream
      let count = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode and append the new chunk
        const chunk = decoder.decode(value);
        expandedText += chunk;
        
        // Update the content in the subtopics
        setStudySubtopics(prev => {
          const newSubtopics = [...prev];
          const paragraphs = newSubtopics[subtopicIndex].content.split('\n\n');
          // Replace the sentence in the paragraph
          const sentences = paragraphs[paragraphIndex].split('.');
          if (count == 0) {
            sentenceIndex++;
            sentences.splice(sentenceIndex, 0, ' ' + chunk);
          } else if (chunk.includes(".")) {
            const chunks = chunk.split(".");
            sentences[sentenceIndex] += chunks[0];
            sentenceIndex++;
            sentences.splice(sentenceIndex + 1, 0, chunks[1]);
          } else {
            sentences[sentenceIndex] += chunk;
          }
          
          // Rebuild the paragraph
          paragraphs[paragraphIndex] = sentences.join('.');
          
          // Update the subtopic content
          newSubtopics[subtopicIndex] = {
            ...newSubtopics[subtopicIndex],
            content: paragraphs.join('\n\n')
          };
          count++;
          return newSubtopics;
        });
      }
    } catch (error) {
      console.error('Error expanding sentence:', error);
    }
  };
  
  const handleInputKeyDown = async (e, id, paragraphText) => {
    if (e.key === 'Enter' && inputValues[id]?.trim()) {
      const question = inputValues[id].trim();
      
      // Set loading state for this specific question
      setAnswerLoading(prev => ({ ...prev, [id]: true }));
      
      try {
        // Extract plain text from paragraph
        const plainText = paragraphText.content.replace(/<[^>]*>/g, '');
        const stream = await getAnswerToQuestion(question, plainText);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let answer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          answer += chunk;
          
          // Update the answer as it streams in
          setAnswers(prev => ({
            ...prev,
            [id]: answer
          }));
        }
      } catch (error) {
        console.error('Error getting answer:', error);
        setAnswers(prev => ({
          ...prev,
          [id]: 'Sorry, I couldn\'t answer that question. Please try again.'
        }));
      } finally {
        setAnswerLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };
  
  // Group subtopics by their parent topic
  const groupedSubtopics = subtopics.reduce((acc, subtopic) => {
    const topicId = subtopic.topicId || 'unknown';
    if (!acc[topicId]) {
      acc[topicId] = [];
    }
    acc[topicId].push(subtopic);
    return acc;
  }, {});
  
  // Get unique topic IDs in the order they appear
  const topicIds = [];
  subtopics.forEach(subtopic => {
    const topicId = subtopic.topicId || 'unknown';
    if (!topicIds.includes(topicId)) {
      topicIds.push(topicId);
    }
  });
  
  if (subtopics.length > 0) {
    return (
      <>
        <div className="study-header">
          <h1>{topicIds[0]}</h1>
        </div>
        <div className="study-body">
          {topicIds.map((topicId, topicIndex) => (
            <div key={topicId} className="topic-section">
              {/* Show topic header for each group of subtopics */}
              {topicIndex !== 0 && <h1 className="topic-title">{topicId}</h1>}
              
              {groupedSubtopics[topicId].map((subtopic, subtopicIndex) => {
                // Calculate the global index for this subtopic
                const globalSubtopicIndex = subtopics.findIndex(s => 
                  s.title === subtopic.title && s.topicId === subtopic.topicId);
                
                // Create a unique ID for this subtopic
                const subtopicId = `${topicId}-${subtopicIndex}`;
                const isActive = activeSubtopic === subtopicId;
                
                return (
                  <div 
                    key={`${topicId}-${subtopicIndex}`} 
                    className={`study-section ${isActive ? 'active-subtopic' : ''}`}
                    data-subtopic-id={subtopicId}
                  >
                    {topicIndex !== 0 && <h2>{subtopic.title}</h2>}
                    <div className="study-section-content">
                      <div className="study-text-content">
                        {subtopic.content ? (
                          <div className="study-content-text">
                            {parseContent(subtopic.content).map((paragraph, pIndex) => {
                              const paragraphId = `${globalSubtopicIndex}-${pIndex}`;
                              const isHovered = hoveredParagraph === paragraphId;
                              
                              return (
                                <div 
                                  key={paragraphId}
                                  onMouseEnter={qaEnabled ? () => handleParagraphMouseEnter(paragraphId) : undefined}
                                  onMouseLeave={qaEnabled ? handleParagraphMouseLeave : undefined}
                                  className={`paragraph-container ${isHovered ? 'hovered' : ''}`}
                                  id={`paragraph-container-${paragraphId}`}
                                >
                                  <Paragraph 
                                    paragraph={paragraph} 
                                    onSentenceClick={handleSentenceClick}
                                    expandEnabled={expandEnabled}
                                    paragraphId={paragraphId}
                                  />
                                  
                                  {isHovered && qaEnabled && (
                                    <div className="paragraph-input-container visible">
                                      <div className="paragraph-input-wrapper">
                                        <input
                                          type="text"
                                          className="paragraph-input"
                                          id={`paragraph-input-${paragraphId}`}
                                          placeholder="Click to ask a question..."
                                          value={inputValues[paragraphId] || ''}
                                          onChange={(e) => handleInputChange(paragraphId, e.target.value)}
                                          onKeyDown={(e) => handleInputKeyDown(e, paragraphId, paragraph)}
                                          // autoFocus
                                        />
                                        <button 
                                          className="paragraph-input-button"
                                          onClick={() => handleInputKeyDown({key: 'Enter'}, paragraphId, paragraph)}
                                          disabled={!inputValues[paragraphId]?.trim()}
                                        >
                                          <i className="fas fa-search"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {answers[paragraphId] && (
                                    <div className="paragraph-answer">
                                      {answerLoading[paragraphId] ? (
                                        <div className="answer-loading">
                                          <span className="loading-dots">Answering</span>
                                        </div>
                                      ) : (
                                        <div className="answer-content">
                                          <div className="answer-question">{inputValues[paragraphId]}</div>
                                          <br/>
                                          <div className="answer-text">{answers[paragraphId]}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="subtopic-loading">
                            <span className="loading-dots">Generating content</span>
                          </div>
                        )}
                      </div>
                      {subtopic.images?.length > 0 && (
                        <div className="study-images">
                          {subtopic.images.map((image, imgIndex) => (
                            <figure key={imgIndex} className="study-image">
                              <img src={image.original} alt="" />
                              <figcaption>
                                <a href={image.contextLink} target="_blank" rel="noopener noreferrer">
                                  {image.title}
                                </a>
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {topicIds.length < totalTopics && <div className="loading-dots">Loading content</div>}
        </div>
      </>
    );
  } else {
    return <div className="loading-dots">Loading content...</div>;
  }
}

export default StudyContent; 