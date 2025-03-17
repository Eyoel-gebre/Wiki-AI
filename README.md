Generate a Wikipedia-like page on a topic using AI.

[wiki-ai.link](https://wiki-ai.link/)
[X post]https://x.com/eyoelgebre/status/1901406059237122079


<img width="1470" alt="Screenshot 2025-03-16 at 3 01 24 PM" src="https://github.com/user-attachments/assets/07fb7027-0fd5-4bd5-9ce9-cf3e0d74c15e" />


# Wiki AI Backend Server `/server`

Handles LLM requests and image fetching, acting as a proxy between the frontend and various external APIs.

## Hosting Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in `server/src` with the following variables:
```
GOOGLE_IMAGES_API_KEY=your_api_key
GOOGLE_IMAGES_CX=your_api_key
GEMINI_API_KEY=your_api_key
GROQ_API_KEY=your_api_key
OPENAI_CHAT_API_KEY=your_api_key
```

## Running the Server

Start the development server with:
```bash
npm run dev
```

Or start in production mode:
```bash
npm start
```

The server will be available at `http://localhost:1212`.

## API Endpoints

- POST `/api/generate-topic-overview` - Generate topic overview
- POST `/api/generate-detailed-content` - Generate detailed content for a topic
- POST `/api/fetch-images` - Fetch images using Google Custom Search API
- POST `/api/generate-subject-summary` - Generate introductory summary for a subject
- POST `/api/answer-question` - Answer questions about a topic
- POST `/api/expand-sentence` - Expand a sentence into a detailed paragraph


# Client `/client`

This is the client application.

## Setup and Development

### Installation

```bash
# Install dependencies
npm install
```

### Development Server

```bash
# From the client directory
npm start
```

This will:
- Start a development server on port 3000
- Enable hot module replacement for real-time updates
- Use source maps for easier debugging
- Serve the application at http://localhost:3000

### Building for Production

To build the application for production:

```bash
# From the client directory
npm run build
```

This will:
- Create optimized production bundles
- Output the files to `../server/dist` directory
- Generate the following files:
  - `bundle.js` (your application code)
  - `index.html` (the HTML entry point)
  - Any assets like images in their respective folders

## Server Integration

To deploy the full application:
1. Build the client as described above
2. Start your server (run `npm start` in `/server`) application (which will serve the files from its `dist` directory)
