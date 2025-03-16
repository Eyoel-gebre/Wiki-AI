import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchImages } from '../services/imageService';
import { clearCache, getAllCachedTopicsWithImages, saveImageToCache } from '../services/cacheService';

function ViewHistory({ onTopicClick }) {
  const [topicsWithImages, setTopicsWithImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      // Get all cached topics with their images
      const cachedTopicsWithImages = getAllCachedTopicsWithImages();
      
      // Create a map of topics that need new images
      const topicsNeedingImages = cachedTopicsWithImages.filter(topic => 
        !topic.imageUrl
      );

      // Fetch only the missing images
      const newImagesData = await Promise.all(
        topicsNeedingImages.map(async (topic) => {
          const query = `${topic.topic}`;
          const images = await fetchImages(query, 1);
          const imageUrl = images[0]?.original || null;
          // Cache the new image URL
          if (imageUrl) {
            saveImageToCache(query, imageUrl);
          }
          
          return {
            topic: topic.topic,
            imageUrl
          };
        })
      );

      // Combine cached and new images
      const allTopicsWithImages = [
        ...cachedTopicsWithImages.filter(topic => topic.imageUrl),
        ...newImagesData
      ];
      setTopicsWithImages(allTopicsWithImages);
      setLoading(false);
    };

    loadImages();
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your search history?')) {
      clearCache();
      setTopicsWithImages([]); // Clear images state
    }
  };

  if (!topicsWithImages.length) {
    return null;
  }

  return (
    <div className="view-history">
      <div className="view-history-header">
        <button onClick={handleClearHistory} className="clear-history-button">
          Clear History
        </button>
      </div>
      <div className="history-grid">
        {topicsWithImages.map(({ topic, imageUrl }) => (
          <Link
            key={topic}
            to={`/${encodeURIComponent(topic)}`}
            className="history-card"
            onClick={() => onTopicClick(topic)}
          >
            {imageUrl && (
              <div className="history-card-image">
                <img src={imageUrl} alt={topic} />
              </div>
            )}
            <span className="topic-name">{topic.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ViewHistory; 