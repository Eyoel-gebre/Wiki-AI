import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import StudyContent from './StudyContent';
import Header from './Header';
import TableOfContents from './TableOfContents';
import { generateTopicOverview, generateSubjectSummary, generateDetailedContent } from '../services/llmService';
import { saveToCache, getFromCache, saveStudyToCache, getStudyFromCache } from '../services/cacheService';
import { fetchGoogleImages as fetchImages } from '../services/imageService';
import ViewHistory from './ViewHistory';

// Wrapper component that handles URL parameters
function AppContent() {
  const { subject } = useParams();
  const navigate = useNavigate();

  // TODO: this will have to be removed when continous scrolling is implemented
  const isActiveRef = React.useRef(true);
  const currentTopicRef = React.useRef(null);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [studyMode, setStudyMode] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studySubtopics, setStudySubtopics] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [qaEnabled, setQaEnabled] = useState(() => {
    const savedValue = localStorage.getItem('qaEnabled');
    return savedValue !== null ? savedValue === 'true' : true; // Default to true if not set
  });
  const [expandEnabled, setExpandEnabled] = useState(() => {
    const savedValue = localStorage.getItem('expandEnabled');
    return savedValue !== null ? savedValue === 'true' : true; // Default to true if not set
  });
  const [activeSubtopic, setActiveSubtopic] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);

  // Add state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Add this state for mobile TOC
  const [tocExpanded, setTocExpanded] = useState(false);
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Close sidebar when clicking outside
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Toggle TOC function
  const toggleToc = () => {
    setTocExpanded(!tocExpanded);
  };

  // Trigger search when subject is provided in URL
  React.useEffect(() => {
    if (subject) {
      isActiveRef.current = true;
      const decodedSubject = decodeURIComponent(subject);
      handleTopicSubmit(decodedSubject);
    } else {
      // Clear all state and stop any ongoing processing
      isActiveRef.current = false;
      currentTopicRef.current = null;
      setTopics([]);
      setTitle('');
      setIsComplete(false);
      setExpandedTopics(new Set());
      setStudyMode(false);
      setStudySubtopics([]); // Clear study subtopics
      setLoading(false);
    }
  }, [subject]);

  const handleTopicToggle = (index) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleTopicSubmit = async (topic) => {
    // Update URL when searching manually
    if (topic !== subject) {
      console.log(`[${new Date().toISOString()}] Navigating to: ${encodeURIComponent(topic)}`);
      navigate(`/${encodeURIComponent(topic)}`);
      return;
    }
    console.log(`[${new Date().toISOString()}] Starting topic generation for: ${topic}`);
    setLoading(true);
    setTopics([]);
    setTitle('');
    setIsComplete(false);
    setExpandedTopics(new Set());
    setStudyMode(false);
    setStudySubtopics([]);
    
    try {
      console.log(`[${new Date().toISOString()}] Checking cache`);
      const cachedResult = getFromCache(topic);
      if (cachedResult) {
        console.log(`[${new Date().toISOString()}] Cache hit - loading cached content`);
        setTitle(cachedResult.title);
        setTopics(cachedResult.topics);
        setIsComplete(true);
        setLoading(false);
        if (cachedResult.topics.length >= 1) {
          handleStudyClick(cachedResult.topics[0], 0);
          setExpandedTopics(new Set([0]));
        }
        return;
      }

      // Add a hard-coded first topic that matches the search term only if not cached
      const firstTopic = {
        title: topic.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        description: `Overview of ${topic}`,
        subtopics: [],
        subject: topic
      };
      
      setTopics([firstTopic]);
      
      // Automatically select this topic
      handleStudyClick(firstTopic, 0);
      setExpandedTopics(new Set([0]));
      
      console.log(`[${new Date().toISOString()}] Cache miss - generating new content`);
      const stream = await generateTopicOverview(topic);
      let buffer = '';
      let mainTitle = '';
      
      console.log(`[${new Date().toISOString()}] Starting stream processing`);
      let collectedTopics = [firstTopic];
      for await (const chunk of stream) {
        if (!isActiveRef.current) {
          console.log(`[${new Date().toISOString()}] Processing stopped - user navigated away`);
          return;
        }
        const content = chunk;
        buffer += content;
        
        if (content.includes('\n') || content.includes('}')) {
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            try {
              if (line.trim()) {
                const parsed = JSON.parse(line.trim());
                if (parsed.title && !parsed.topic) {
                  console.log(`[${new Date().toISOString()}] Received main title: ${parsed.title}`);
                  mainTitle = parsed.title;
                  setTitle(parsed.title);
                } else if (parsed.topic) {
                  console.log(`[${new Date().toISOString()}] Received topic: ${parsed.topic.title}`);
                  const newTopic = { ...parsed.topic, subject: topic };
                  collectedTopics.push(newTopic);
                  setTopics(prev => [...prev, newTopic]);
                }
              }
            } catch (e) {
              console.log('Parsing chunk failed:', e);
              console.log('line:', line);
            }
          }
        }
      }
      
      if (isActiveRef.current) {
        const finalContent = {
          title: mainTitle || 'Contents',
          topics: collectedTopics
        };

        if (mainTitle || collectedTopics.length > 0) {
          console.log(`[${new Date().toISOString()}] Stream complete - saving to cache`);
          saveToCache(topic, finalContent);
        } else {
          console.log(`[${new Date().toISOString()}] Stream complete - not saving to cache because no content`);
        }
        setIsComplete(true);
      }
    } catch (error) {
      if (isActiveRef.current) {
        console.log(`[${new Date().toISOString()}] Error:`, error);
        console.error('Error generating content:', error);
        alert('Failed to retrieve content. Please try again.');
        setTopics([]);
        setTitle('');
        setIsComplete(false);
      }
    }
    if (isActiveRef.current) {
      setLoading(false);
      console.log(`[${new Date().toISOString()}] Topic generation complete`);
    }
  };

  const handleStudyClick = async (topic, topicIndex) => {
    console.log(`[${new Date().toISOString()}] 📚 Starting study content generation for: ${topic.title}`);

    // Stop any ongoing topic generation
    if (currentTopicRef.current && currentTopicRef.current !== topic.title) {
      console.log(`[${new Date().toISOString()}] 🔄 Switching from "${currentTopicRef.current}" to "${topic.title}"`);
    }
    currentTopicRef.current = topic.title;

    setStudyLoading(true);
    setStudyMode(true);
    setCurrentTopic(topic);
    
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Checking study cache for ${topic.title}`);
      const cachedStudy = getStudyFromCache(topic.subject, topic.title);
      if (cachedStudy) {
        console.log(`[${new Date().toISOString()}] ⚡ Cache hit - loading cached study content`);
        // Append to existing subtopics instead of replacing
        setStudySubtopics(prev => [...prev, ...cachedStudy.subtopics]);
        setStudyLoading(false);
        return;
      }

      console.log(`[${new Date().toISOString()}] 🔄 Cache miss - generating new study content`);
      
      // Handle case where topic has no subtopics (first hard-coded topic)
      if (!topic.subtopics || topic.subtopics.length === 0) {
        console.log(`[${new Date().toISOString()}] 📝 Generating content for topic with no subtopics: ${topic.title}`);
        
        // Create a default subtopic based on the topic itself
        const defaultSubtopic = {
          title: topic.title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          description: topic.description || `Overview of ${topic.title}`,
          number: `${topicIndex + 1}`,
          content: '',
          images: [],
          topicId: topic.title // Add a reference to the parent topic
        };
        
        // Fetch images for the topic
        const query = `${topic.subject}`;
        const numImages = 1; // 2-3 images
        console.log(`[${new Date().toISOString()}] 🖼️ Fetching ${numImages} images for ${query}`);
        defaultSubtopic.images = await fetchImages(query, numImages);
        
        // Generate content for the topic
        const stream = await generateSubjectSummary(topic.subject);
        let subtopicContent = '';
        
        for await (const chunk of stream) {
          if (!isActiveRef.current || currentTopicRef.current !== topic.title) {
            console.log(`[${new Date().toISOString()}] 🛑 Processing stopped - topic changed or user navigated away`);
            return;
          }
          subtopicContent += chunk;
          defaultSubtopic.content = subtopicContent;
          // Update with the new content while preserving previous subtopics
          setStudySubtopics(prev => {
            const updatedSubtopics = [...prev];
            const existingIndex = updatedSubtopics.findIndex(st => 
              st.title === defaultSubtopic.title && st.topicId === topic.title);
            
            if (existingIndex >= 0) {
              updatedSubtopics[existingIndex] = defaultSubtopic;
            } else {
              updatedSubtopics.push(defaultSubtopic);
            }
            return updatedSubtopics;
          });
        }
        
        if (isActiveRef.current && currentTopicRef.current === topic.title) {
          saveStudyToCache(topic.subject, topic.title, {
            subtopics: [defaultSubtopic]
          });
          setStudyLoading(false);
          return;
        }
      }
      
      // Original code for handling topics with subtopics
      // First fetch images for all subtopics
      console.log(`[${new Date().toISOString()}] 🖼️ Fetching images for all subtopics`);
      const subtopicsWithImages = await Promise.all(topic.subtopics.map(async (title, index) => {
        if (!isActiveRef.current || currentTopicRef.current !== topic.title) return null;
        const query = `${topic.subject} ${title}`;
        const numImages = 1;
        console.log(`[${new Date().toISOString()}] 🖼️ Fetching ${numImages} images for ${query}`);
        const images = await fetchImages(query, numImages);
        return {
          title,
          description: topic.description,
          number: `${topicIndex + 1}${String.fromCharCode(97 + (index%3))}`,
          content: '',
          images,
          topicId: topic.title // Add a reference to the parent topic
        };
      }));
      
      if (!isActiveRef.current || currentTopicRef.current !== topic.title) {
        console.log(`[${new Date().toISOString()}] 🛑 Processing stopped - topic changed or user navigated away`);
        return;
      }
      
      const validSubtopics = subtopicsWithImages.filter(st => st !== null);
      // Append new subtopics to existing ones
      setStudySubtopics(prev => [...prev, ...validSubtopics]);
      
      let updatedSubtopics = [...validSubtopics];
      
      // Process each subtopic sequentially
      for (let i = 0; i < topic.subtopics.length; i++) {
        if (!isActiveRef.current || currentTopicRef.current !== topic.title) {
          console.log(`[${new Date().toISOString()}] 🛑 Processing stopped - topic changed or user navigated away`);
          return;
        }
        
        const subtopic = topic.subtopics[i];
        console.log(`[${new Date().toISOString()}] ✍️ Generating content for subtopic: ${subtopic}`);
       
        const stream = await generateDetailedContent(topic.subject, topic.title, subtopic);
        let subtopicContent = '';

        for await (const chunk of stream) {
          if (!isActiveRef.current || currentTopicRef.current !== topic.title) {
            console.log(`[${new Date().toISOString()}] 🛑 Processing stopped - topic changed or user navigated away`);
            return;
          }
          const content = chunk;
          subtopicContent += content;
          updatedSubtopics[i].content = subtopicContent;
          
          // Update the state to show progress while preserving other subtopics
          setStudySubtopics(prev => {
            const allSubtopics = [...prev];
            const subtopicIndex = allSubtopics.findIndex(st => 
              st.title === updatedSubtopics[i].title && st.topicId === topic.title);
            
            if (subtopicIndex >= 0) {
              allSubtopics[subtopicIndex] = updatedSubtopics[i];
            }
            return allSubtopics;
          });
        }
      }

      if (isActiveRef.current && currentTopicRef.current === topic.title) {
        const finalSubtopics = [...updatedSubtopics];
        const allSubtopicsHaveContent = finalSubtopics.every(st => st.content.trim().length > 0);
        if (allSubtopicsHaveContent) {
          console.log(`[${new Date().toISOString()}] 💾 Stream complete - saving study content to cache`);
          saveStudyToCache(topic.subject, topic.title, {
            subtopics: finalSubtopics
          });
        } else {
          console.log(`[${new Date().toISOString()}] ⚠️ Stream complete - not saving to cache because not all subtopics have content`);
        }
      }
    } catch (error) {
      if (isActiveRef.current && currentTopicRef.current === topic.title) {
        console.log(`[${new Date().toISOString()}] ❌ Error:`, error);
        console.error('Error loading study content:', error);
        alert('Failed to load study content. Please try again.');
      }
    }
    if (isActiveRef.current && currentTopicRef.current === topic.title) {
      setStudyLoading(false);
      console.log(`[${new Date().toISOString()}] ✅ Study content generation complete`);
    }
  };

  const exitStudyMode = () => {
    setStudyMode(false);
    setCurrentTopic(null);
    setStudySubtopics([]); // Clear subtopics when exiting study mode
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const isAtBottom = scrollY + windowHeight >= scrollHeight - 50;
      console.log('isAtBottom', isAtBottom);
      
      if (isAtBottom && studyMode && !studyLoading && topics.length > 0) {
        console.log(`[${new Date().toISOString()}] 📜 Reached bottom of page`);
        
        // Find the current topic index
        const currentTopicIndex = topics.findIndex(t => currentTopic && t.title === currentTopic.title);
        
        // If there's a next topic, load it
        if (currentTopicIndex >= 0 && currentTopicIndex < topics.length - 1) {
          const nextTopic = topics[currentTopicIndex + 1];
          console.log(`[${new Date().toISOString()}] 📚 Loading next topic: ${nextTopic.title}`);
          handleStudyClick(nextTopic, currentTopicIndex + 1);
          
          // Expand the next topic in the table of contents
          setExpandedTopics(prev => {
            const newSet = new Set(prev);
            newSet.add(currentTopicIndex + 1);
            return newSet;
          });
        } else {
          console.log(`[${new Date().toISOString()}] 📚 No more topics to load`);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [studyMode, studyLoading, topics, currentTopic]);

  useEffect(() => {
    if (!studyMode) return;

    const handleScroll = () => {
      // Don't track if we're not in study mode or if there are no subtopics
      if (!studyMode || studySubtopics.length === 0) return;

      // Get all subtopic sections
      const subtopicElements = document.querySelectorAll('.study-section');
      if (subtopicElements.length === 0) return;

      // Calculate the middle of the viewport
      const viewportMiddle = window.scrollY + window.innerHeight / 2;

      // Find which element is closest to the middle
      let closestElement = null;
      let closestDistance = Infinity;

      subtopicElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const elementMiddle = window.scrollY + rect.top + rect.height / 2;
        const distance = Math.abs(elementMiddle - viewportMiddle);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = element;
        }
      });

      if (closestElement) {
        // Extract the subtopic ID from the element
        const subtopicKey = closestElement.getAttribute('data-subtopic-id');
        if (subtopicKey && subtopicKey !== activeSubtopic) {
          setActiveSubtopic(subtopicKey);
          
          // Find the topic this subtopic belongs to
          const [topicId, subtopicIndex] = subtopicKey.split('-');
          
          // Find the topic index in the topics array
          const topicIndex = topics.findIndex(t => t.title === topicId);
          
          // Update the expanded topics in the table of contents
          // if (topicIndex >= 0) {
          //   setExpandedTopics(prev => {
          //     const newSet = new Set(prev);
          //     newSet.add(topicIndex);
          //     return newSet;
          //   });
          // }
          
          console.log(`[${new Date().toISOString()}] 📍 Active subtopic: ${topicId}, ${subtopicIndex}`);
          setActiveTopic(topicId);
          setActiveSubtopic(subtopicKey);
        }
      }
    };

    // Throttle the scroll event to improve performance
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener);
    return () => window.removeEventListener('scroll', scrollListener);
  }, [studyMode, studySubtopics, activeSubtopic, topics]);
  return (
    <div className="app">
      <Header 
        onTopicSubmit={handleTopicSubmit}
        loading={loading}
        currentSubject={subject ? decodeURIComponent(subject) : ''}
        qaEnabled={qaEnabled}
        setQaEnabled={setQaEnabled}
        expandEnabled={expandEnabled}
        setExpandEnabled={setExpandEnabled}
      />
      
      {/* Mobile Table of Contents (collapsible) */}
      {/* {subject && (
        <div className="mobile-toc">
          <div className="mobile-toc-header" onClick={toggleToc}>
            <h3>Contents</h3>
            <span className={`mobile-toc-toggle ${tocExpanded ? 'open' : ''}`}>
              ▼
            </span>
          </div>
          <div className={`mobile-toc-content ${tocExpanded ? 'open' : ''}`}>
            <TableOfContents
              loading={loading}
              title={title}
              topics={topics}
              expandedTopics={expandedTopics}
              onTopicToggle={handleTopicToggle}
              onStudyClick={(topic, index) => {
                handleStudyClick(topic, index);
                setTocExpanded(false); // Close TOC after selection
              }}
              isComplete={isComplete}
              studyMode={studyMode}
              studyLoading={studyLoading}
              activeTopic={activeTopic}
              activeSubtopic={activeSubtopic}
              mobileToc={true}
            />
          </div>
        </div>
      )} */}
      
      {!subject && !studyMode && (
        <ViewHistory onTopicClick={handleTopicSubmit} />
      )}
      
      {/* Mobile Sidebar Toggle Button */}
      {subject && (
        <button 
          className="mobile-sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      )}
      
      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <h3>Contents</h3>
          <button 
            className="mobile-sidebar-close" 
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <TableOfContents
          loading={loading}
          title={title}
          topics={topics}
          expandedTopics={expandedTopics}
          onTopicToggle={handleTopicToggle}
          onStudyClick={(topic, index) => {
            handleStudyClick(topic, index);
            setTocExpanded(false); // Close TOC after selection
          }}
          isComplete={isComplete}
          studyMode={studyMode}
          studyLoading={studyLoading}
          activeTopic={activeTopic}
          activeSubtopic={activeSubtopic}
          mobileToc={true}
        />

        {/* {subject && (
          <div className="mobile-toc">
            <div className="mobile-toc-header" onClick={toggleToc}>
              <h3>Contents</h3>
              <span className={`mobile-toc-toggle ${tocExpanded ? 'open' : ''}`}>
                ▼
              </span>
            </div>
            <div className={`mobile-toc-content ${tocExpanded ? 'open' : ''}`}> */}
              {/* <TableOfContents
                loading={loading}
                title={title}
                topics={topics}
                expandedTopics={expandedTopics}
                onTopicToggle={handleTopicToggle}
                onStudyClick={(topic, index) => {
                  handleStudyClick(topic, index);
                  setTocExpanded(false); // Close TOC after selection
                }}
                isComplete={isComplete}
                studyMode={studyMode}
                studyLoading={studyLoading}
                activeTopic={activeTopic}
                activeSubtopic={activeSubtopic}
                mobileToc={true}
              /> */}
            {/* </div>
          </div>
        )} */}
        
        {/* <div className="mobile-sidebar-controls">
          <div className="mobile-sidebar-control">
            <label htmlFor="mobile-model-selector">Model:</label>
            <select 
              id="mobile-model-selector" 
              className="model-selector"
            >
              <option value="gpt-3.5-turbo">GPT-3.5</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>
          
          <div className="mobile-sidebar-control">
            <label htmlFor="mobile-qa-toggle">Q&A Mode:</label>
            <input
              id="mobile-qa-toggle"
              type="checkbox"
              checked={qaEnabled}
              onChange={(e) => setQaEnabled(e.target.checked)}
            />
          </div>
          
          <div className="mobile-sidebar-control">
            <label htmlFor="mobile-expand-toggle">Expand Mode:</label>
            <input
              id="mobile-expand-toggle"
              type="checkbox"
              checked={expandEnabled}
              onChange={(e) => setExpandEnabled(e.target.checked)}
            />
          </div>
        </div> */}
      </div>
      
      {/* Original Table of Contents (hidden on mobile) */}
      <TableOfContents
        loading={loading}
        title={title}
        topics={topics}
        expandedTopics={expandedTopics}
        onTopicToggle={handleTopicToggle}
        onStudyClick={handleStudyClick}
        isComplete={isComplete}
        studyMode={studyMode}
        studyLoading={studyLoading}
        activeTopic={activeTopic}
        activeSubtopic={activeSubtopic}
        mobileToc={false}
      />
      
      <main className={studyMode ? 'study-mode' : ''}>
        {studyMode && (
          <div className="study-content">
            <StudyContent
              loading={studyLoading}
              subtopics={studySubtopics}
              setStudySubtopics={setStudySubtopics}
              onExit={exitStudyMode}
              currentTopic={currentTopic}
              qaEnabled={qaEnabled}
              expandEnabled={expandEnabled}
              totalTopics={topics.length}
              activeSubtopic={activeSubtopic}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/:subject" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 