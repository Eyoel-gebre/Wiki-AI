import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 1212;

const google_images_api_key = process.env.GOOGLE_IMAGES_API_KEY
const google_images_cx = process.env.GOOGLE_IMAGES_CX
const gemini_api_key = process.env.GEMINI_API_KEY
const groq_api_key = process.env.GROQ_API_KEY
const openai_api_key = process.env.OPENAI_CHAT_API_KEY

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:1212', 'http://10.19.92.22:3000', 'http://10.0.0.242:3000', 'https://wiki-ai.link', 'https://wiki-842880760887.us-west1.run.app'],
  credentials: true
}));

// Add static file serving for client dist folder with resolved path
const clientDistPath = path.resolve(__dirname, '../dist');
app.use(express.static(clientDistPath));
console.log(`Serving static files from: ${clientDistPath}`);

// Initialize API clients
const getOpenAIClient = () => {
  return new OpenAI({ apiKey: openai_api_key });
};

const getGroqClient = () => {
  return new OpenAI({ 
    apiKey: groq_api_key,
    baseURL: 'https://api.groq.com/openai/v1'
  });
};

const getGeminiClient = () => {
  const genAI = new GoogleGenerativeAI(gemini_api_key);
  return genAI;
};

const getLLMClient = (provider) => {
  if (provider === 'openai') {
    return getOpenAIClient();
  } else if (provider === 'groq') {
    return getGroqClient();
  } else if (provider === 'gemini') {
    return getGeminiClient();
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
};

// Helper function to stream Gemini responses
const streamGeminiResponse = async (model, prompt, res) => {
  const client = getGeminiClient();
  const geminiModel = client.getGenerativeModel({ model });
  
  const result = await geminiModel.generateContentStream(prompt);
  
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      res.write(chunkText);
    }
  }
  res.end();
};

// LLM endpoints
app.post('/api/generate-topic-overview', async (req, res) => {
  try {
    const { topic, provider, model } = req.body;

    const prompt = `Create a structured and ordered Wiki page for ${topic}. Include:
      1. 4-8 of the most essential main topics in an appropriate order
      2. For each topic:
         - A one-line description
         - up to 4 subtopics
      Format each topic as a separate JSON object and end each with a newline.
      First send the title as: {"title": "Main Title"}
      Then send each topic as: {"topic": {"title": "Topic Title", "description": "Description", "subtopics": ["Subtopic 1", "Subtopic 2"]}}
      Dont send any other text than the JSON objects on separate lines`;

    if (provider === 'gemini') {
      await streamGeminiResponse(model, prompt, res);
      return;
    }

    const client = getLLMClient(provider);
    const stream = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.5,
      stream: true
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        res.write(chunk.choices[0].delta.content);
      }
    }
    res.end();

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-subject-summary', async (req, res) => {
  try {
    const { subject, provider, model } = req.body;

    const prompt = `You are a globally renowned expert on ${subject}. 
      You are currently the "Introductive Summary" for a wiki page on ${subject}.

      For this section please provide a thorough overview of the entire 
      subject and its most important topics. Be very objective and unopinionated. 
      Give only factual information.
      
      VERY IMPORTANT: Please wrap any key concepts, people, places, events, etc. in [square brackets]. 
      ONLY output text paragraphs. Make sure you cover all the important topics.`;

    if (provider === 'gemini') {
      await streamGeminiResponse(model, prompt, res);
      return;
    }

    const client = getLLMClient(provider);
    const stream = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.5,
      stream: true
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        res.write(chunk.choices[0].delta.content);
      }
    }
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-detailed-content', async (req, res) => {
  try {
    const { subject, topic, subtopic, provider, model } = req.body;

    const prompt = `You are a globally renowned expert on ${subject}. 
      You are currently writing a chapter for a wiki page on ${subject}.
      This is the "${topic}" chapter. Right now you are writing the section on "${subtopic}".

      For this section please provide a thorough explanation of the subtopic (${subtopic}). 
      Talk about whatever may be most important about the subtopic in relation to the 
      subject (${subject}) in whatever order makes sense. Be very objective and unopinionated. 
      Give only factual information.

      VERY IMPORTANT: Please wrap any key concepts, people, places, events, etc. in [square brackets]. 
      ONLY output text paragraphs. Make sure you cover all the important topics.`;

    if (provider === 'gemini') {
      await streamGeminiResponse(model, prompt, res);
      return;
    }

    const client = getLLMClient(provider);
    const stream = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.5,
      stream: true
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        res.write(chunk.choices[0].delta.content);
      }
    }
    res.end();

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Image endpoints
app.post('/api/fetch-images', async (req, res) => {
  try {
    const { query, count } = req.body;

    const response = await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?key=${google_images_api_key}&cx=${google_images_cx}&q=${encodeURIComponent(query)}&searchType=image&num=${count}`
    );
    
    const data = await response.json();
    const items = data.items || [];
    
    const images = items.map(item => ({
      thumbnail: item.image.thumbnailLink,
      original: item.link,
      title: item.title,
      contextLink: item.image.contextLink
    }));

    res.json(images);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this new endpoint for answering questions
app.post('/api/answer-question', async (req, res) => {
  try {
    const { question, context, provider = 'groq', model = 'llama-3.3-70b-versatile' } = req.body;

    const prompt = `
      You are a helpful AI assistant answering questions about educational content.

      CONTEXT:
      ${context}
      
      QUESTION:
      ${question}
      
      Answer the above questions using your world knowledge and the context provided. ONLY output text paragraphs. Be brief and to the point.`;

    if (provider === 'gemini') {
      await streamGeminiResponse(model, prompt, res);
      return;
    }

    const client = getLLMClient(provider);
    const stream = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.3,
      stream: true
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        res.write(chunk.choices[0].delta.content);
      }
    }
    res.end();

  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 

app.post('/api/expand-sentence', async (req, res) => {
  try {
    const { sentence, provider, model } = req.body;

    const prompt = `You are a helpful AI assistant that expands sentences.
      SENTENCE:
      ${sentence}
      
      Starting where the sentence ends, expand it into a more detailed and informative complete paragraph. Be brief and to the point.
      VERY IMPORTANT: Please wrap any key concepts, people, places, events, etc. in [square brackets]. 
      ONLY output a single text paragraph and do not repeat the original sentence. `;

    if (provider === 'gemini') {
      await streamGeminiResponse(model, prompt, res);
      return;
    }

    const client = getLLMClient(provider);
    const stream = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.5,
      stream: true
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        res.write(chunk.choices[0].delta.content);
      }
    }
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// This is a catch-all route that serves the index.html for any routes not matched above
app.get('*', (req, res) => {
  // Skip API routes
  if (req.url.startsWith('/api/')) {
    return res.status(404).send('API endpoint not found');
  }
  
  // Serve the index.html for all other routes to let React Router handle them
  res.sendFile(path.join(clientDistPath, 'index.html'));
});