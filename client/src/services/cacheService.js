const CACHE_KEY = 'ai_course_generator_cache';
const STUDY_CACHE_KEY = 'ai_course_generator_study_cache';
const IMAGE_CACHE_KEY = 'ai_course_generator_image_cache';

export function saveToCache(topic, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[topic.toLowerCase()] = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

export function saveStudyToCache(topic, subtopic, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(STUDY_CACHE_KEY) || '{}');
    const cacheKey = `${topic.toLowerCase()}_${subtopic.toLowerCase()}`;
    cache[cacheKey] = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(STUDY_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Study cache save error:', error);
  }
}

export function getFromCache(subject) {
  try {
    // temp: disable cache
    // return null;

    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const cacheEntry = cache[subject.toLowerCase()];
    
    if (!cacheEntry) return null;
    
    return cacheEntry.data;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
}

export function getStudyFromCache(subject, topic) {
  try {
    // temp: disable cache
    // return null;

    const cache = JSON.parse(localStorage.getItem(STUDY_CACHE_KEY) || '{}');
    const cacheKey = `${subject.toLowerCase()}_${topic.toLowerCase()}`;
    const cacheEntry = cache[cacheKey];
    
    if (!cacheEntry) return null;
    
    return cacheEntry.data;
  } catch (error) {
    console.error('Study cache retrieval error:', error);
    return null;
  }
}

export function getAllCachedTopics() {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  return Object.keys(cache);
}

export function saveImageToCache(topic, imageUrl) {
  try {
    const imageCache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    imageCache[topic.toLowerCase()] = imageUrl;
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageCache));
  } catch (error) {
    console.error('Image cache save error:', error);
  }
}

export function getImageFromCache(topic) {
  try {
    const imageCache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    return imageCache[topic.toLowerCase()] || null;
  } catch (error) {
    console.error('Image cache retrieval error:', error);
    return null;
  }
}

export function getAllCachedTopicsWithImages() {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const imageCache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
  
  return Object.keys(cache).map(topic => ({
    topic,
    imageUrl: imageCache[topic.toLowerCase()] || null
  }));
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(STUDY_CACHE_KEY);
  localStorage.removeItem(IMAGE_CACHE_KEY);
} 