import config from '../config';

export async function fetchImages(query, count = 10) {
  try {
    console.log('configuring with', config.apiBaseUrl);
    const response = await fetch(`${config.apiBaseUrl}/api/fetch-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        count
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch images');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
}

// Using the same endpoint since both now use Google Custom Search API
export const fetchGoogleImages = fetchImages; 