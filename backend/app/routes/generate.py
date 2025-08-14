# backend/app/routes/generate.py

import httpx
import json
import re
import os
from typing import List, Optional, Union
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# --- API Configuration ---
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# Groq uses an OpenAI-compatible API, but with its own URL
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- Define the models for each task ---
# Choose a capable, free model for summaries
SUMMARY_MODEL = "openai/gpt-oss-20b:free"
# Choose a fast, free model for code generation
CODE_MODEL = "llama3-8b-8192" # A high-speed, open-source model available on Groq

router = APIRouter()

# --- Pydantic Models for API Requests ---
class FileInput(BaseModel):
    filename: str
    content: str

class SummaryRequest(BaseModel):
    files: List[FileInput]

class CodeRequest(BaseModel):
    summary: str
    framework: str

# --- Pydantic Models for Response Parsing ---
class TestSummary(BaseModel):
    """
    Pydantic model for a test summary.
    The 'file' field is now optional to handle cases where the model
    might not include it, preventing a validation error.
    """
    title: str
    description: str
    framework: Optional[str] = None
    file: Optional[Union[str, List[str]]] = None

class TestSummariesResponse(BaseModel):
    summaries: List[TestSummary]

# --- Helper functions ---
def format_file_field(file_data: Optional[Union[str, List[str]]]) -> Optional[str]:
    """Formats the 'file' field to be a single string."""
    if isinstance(file_data, list):
        return ", ".join(file_data)
    return file_data

def extract_json_array(text: str) -> list:
    """Find and parse the first valid JSON array in the text."""
    print("🔍 Attempting to extract JSON array from response...")
    match = re.search(r"\[\s*\{.*?\}\s*\]", text, re.DOTALL)
    if not match:
        print("❌ Failed to find a valid JSON array in the response.")
        raise ValueError(f"Could not find a valid JSON array in model response. Raw response: {text[:200]}...")
    
    json_text = match.group(0)
    print("✅ Found potential JSON. Parsing...")
    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed. Error: {e}")
        print("Raw JSON text that failed to parse:")
        print(json_text)
        raise ValueError(f"Invalid JSON array from model. Error: {e}. Raw JSON: {json_text[:200]}...")

# --- Core Async Functions for each provider ---
async def generate_with_openrouter(prompt: str, model_name: str) -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not set.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=180) as client:
        try:
            resp = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            response_text = data["choices"][0]["message"]["content"].strip()
            return response_text
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"OpenRouter server not reachable. Error: {type(e).__name__}")

async def generate_with_groq(prompt: str, model_name: str) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set.")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=180) as client:
        try:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            response_text = data["choices"][0]["message"]["content"].strip()
            return response_text
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Groq server not reachable. Error: {type(e).__name__}")

# --- API Endpoints with separate calls ---
@router.post("/generate-summaries", response_model=TestSummariesResponse)
async def generate_summaries(data: SummaryRequest):
    file_contents = "\n\n".join(
        f"### File: {file.filename}\n```typescript\n{file.content[:4000]}\n```"
        for file in data.files
    )

    prompt = f"""
    You are an expert software tester. Your only task is to generate a list of high-level test case summaries based on the provided code files.

    The output MUST be a valid JSON array of objects. Do not include any text or explanations outside of the JSON.

    Each object in the array MUST contain the following four keys: "title", "description", "framework", and "file".

    Example of the required output format:
    ```json
    [
    {{
        "title": "Verify user authentication flow",
        "description": "Tests the user login and logout process with valid and invalid credentials.",
        "framework": "Jest",
        "file": "auth.js"
    }},
    {{
        "title": "Validate data fetching logic",
        "description": "Tests the component's ability to fetch and display data from the API correctly.",
        "framework": "Jest",
        "file": "data-component.tsx"
    }}
    ]
    ```
    
    Here are the code files to analyze:
    {file_contents}
    """
    try:
        response_text = await generate_with_openrouter(prompt, model_name=SUMMARY_MODEL)
        summaries_data = extract_json_array(response_text)
        
        # Validate and reformat the data
        validated_summaries = [TestSummary(**s) for s in summaries_data]
        formatted_summaries = []
        for summary in validated_summaries:
            formatted_summary_dict = summary.model_dump()
            formatted_summary_dict['file'] = format_file_field(formatted_summary_dict['file'])
            formatted_summaries.append(formatted_summary_dict)
        
        return {"summaries": formatted_summaries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summaries: {e}")

@router.post("/generate-test-code")
async def generate_test_code(data: CodeRequest):
    prompt = f"""
You are a highly skilled developer writing test code.
Your task is to write a complete, runnable, and high-quality test code block for the provided test case summary.
The test code must be written for the **{data.framework}** framework.

Summary of the test case:
{data.summary}

Instructions:
1. The output MUST contain ONLY the code block.
2. The code should be a complete test file.
3. DO NOT include any explanations, comments, or surrounding text.
"""
    try:
        code_output = await generate_with_groq(prompt, model_name=CODE_MODEL)
        code_clean = re.sub(r"^```[a-zA-Z]*|```$", "", code_output, flags=re.MULTILINE).strip()
        if not code_clean:
            raise ValueError("Groq returned an empty code block.")
        return {"code": code_clean}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test code: {e}")
