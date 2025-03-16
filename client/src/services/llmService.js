import config from '../config';

export const PROVIDERS = {
  groq: {
    name: 'Groq',
    models: {
      'llama-3.3-70b-versatile': 'LLaMA 3.3 70B',
      'mixtral-8x7b-32768': 'Mixtral 8x7B',
      'llama-3.2-1b-preview': 'LLaMA 3.2 1B'
    }
  },
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-4o-mini': 'GPT-4o Mini'
    }
  },
  gemini: {
    name: 'Google',
    models: {
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite'
    }
  }
};

// Default provider and model
let currentProvider = 'groq';
let currentModel = 'llama-3.3-70b-versatile';

export function setModel(provider, model) {
  console.log('Setting model:', provider, model);
  currentProvider = provider;
  currentModel = model;
}

export async function generateTopicOverview(topic) {
  const response = await fetch(`${config.apiBaseUrl}/api/generate-topic-overview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      provider: 'openai',
      model: 'gpt-4o-mini'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate topic overview');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return {
    async* [Symbol.asyncIterator]() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield decoder.decode(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
  };
}

export async function generateSubjectSummary(subject) {
  const response = await fetch(`${config.apiBaseUrl}/api/generate-subject-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject,
      provider: currentProvider,
      model: currentModel
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate detailed content');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return {
    async* [Symbol.asyncIterator]() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield decoder.decode(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
  };
}

export async function generateDetailedContent(subject, topic, subtopic) {
  const response = await fetch(`${config.apiBaseUrl}/api/generate-detailed-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject,
      topic,
      subtopic,
      provider: currentProvider,
      model: currentModel
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate detailed content');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return {
    async* [Symbol.asyncIterator]() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield decoder.decode(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
  };
}

export async function getAnswerToQuestion(question, context) {
  const response = await fetch(`${config.apiBaseUrl}/api/answer-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      context,
      provider: currentProvider,
      model: currentModel
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get answer');
  }

  return response.body;
}

export async function expandSentence(sentence) {
  const response = await fetch(`${config.apiBaseUrl}/api/expand-sentence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sentence,
      provider: currentProvider,
      model: currentModel
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to expand sentence');
  }

  return response.body;
} 