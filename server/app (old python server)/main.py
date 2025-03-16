from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from dotenv import load_dotenv
from typing import Optional, AsyncGenerator
from pydantic import BaseModel
import httpx
from openai import AsyncOpenAI
import json

#new
google_api_key = ''
google_cx = ''
groq_api_key = ''
openai_api_key = ''


# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:1212", "http://10.19.92.22:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize API clients with async clients
async def get_openai_client():
    return AsyncOpenAI(api_key=openai_api_key)

async def get_groq_client():
    return AsyncOpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )

async def get_llm_client(provider: str):
    if provider == "openai":
        return await get_openai_client()
    elif provider == "groq":
        return await get_groq_client()
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

# Pydantic models for request validation
class TopicRequest(BaseModel):
    topic: str
    provider: str
    model: str

class DetailedContentRequest(BaseModel):
    subject: str
    topic: str
    subtopic: str
    provider: str
    model: str

class ImageRequest(BaseModel):
    query: str

# LLM endpoints
@app.post("/api/generate-topic-overview")
async def generate_topic_overview(request: TopicRequest):
    try:
        prompt = f"""Create a structured and ordered Wiki page for {request.topic}. Include:
            1. A concise main title.
            2. 5-12 of the most essential main topics in an appropriate order
            3. For each topic:
               - A one-line description
               - key subtopics
            Format each topic as a separate JSON object and end each with a newline.
            First send the title as: {{"title": "Main Title"}}
            Then send each topic as: {{"topic": {{"title": "Topic Title", "description": "Description", "subtopics": ["Subtopic 1", "Subtopic 2"]}}}}
            Dont send any other text than the JSON objects on separate lines"""

        async def generate() -> AsyncGenerator[str, None]:
            client = await get_llm_client(request.provider)
            stream = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=request.model,
                temperature=0.5,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-detailed-content")
async def generate_detailed_content(request: DetailedContentRequest):
    try:
        prompt = f"""You are a globally renowned expert on {request.subject}. 
            You are currently writing a chapter for a wiki page on {request.subject}.
            This is the "{request.topic}" chapter. Right now you are writing the section on "{request.subtopic}".

            For this section please provide a thorough explanation of the subtopic ({request.subtopic}). 
            Talk about whatever may be most important about the subtopic in relation to the 
            subject ({request.subject}) in whatever order makes sense.

            VERY IMPORTANT: Please wrap any key concepts, people, places, events, etc. in [square brackets]."""

        async def generate() -> AsyncGenerator[str, None]:
            client = await get_llm_client(request.provider)
            stream = await client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=request.model,
                temperature=0.5,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Image endpoints
@app.post("/api/fetch-images")
async def fetch_images(request: ImageRequest):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://customsearch.googleapis.com/customsearch/v1",
                params={
                    "key": google_api_key,
                    "cx": google_cx,
                    "q": f"{request.query}",
                    "searchType": "image"
                }
            )
            print(request.query)
            
            data = response.json()
            items = data.get("items", [])
            return [
                {
                    "thumbnail": item["image"]["thumbnailLink"],
                    "original": item["link"],
                    "title": item["title"],
                    "contextLink": item["image"]["contextLink"]
                }
                for item in items
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
