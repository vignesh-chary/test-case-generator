# backend/app/routes/generate.py

import httpx
import json
import re
import asyncio
from typing import List, Optional, Union
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# --- Ollama Configuration ---
OLLAMA_API_URL = "http://localhost:11434/api/generate"
# Note: Specific models will be passed in the function calls below.

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

# --- Pydantic Models for Ollama Response Parsing ---
class TestSummary(BaseModel):
    title: str
    description: str
    framework: Optional[str] = None
    # Now accepts a string OR a list of strings for the 'file' field
    file: Union[str, List[str]]

class TestSummariesResponse(BaseModel):
    summaries: List[TestSummary]

# --- Core Async Ollama Function with enhanced error detail ---
async def generate_with_ollama(prompt: str, model_name: str) -> str:
    """Send prompt to Ollama asynchronously with improved error logging."""
    async with httpx.AsyncClient(timeout=180) as client:
        try:
            print(f"🚀 Sending prompt to Ollama with model: {model_name}...")
            
            resp = await client.post(
                OLLAMA_API_URL,
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_ctx": 4096
                    }
                }
            )
            resp.raise_for_status()
            data = resp.json()
            response_text = (data.get("response") or "").strip()
            
            print("✅ Received response from Ollama. Raw text:")
            print("---START OF RESPONSE---")
            print(response_text)
            print("---END OF RESPONSE---")

            if not response_text:
                print("⚠️ Ollama returned an empty response.")
                raise ValueError("Ollama returned an empty response.")
            return response_text
        except httpx.RequestError as e:
            print(f"❌ Ollama request failed: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"Ollama server not reachable. Ensure Ollama is running and model '{model_name}' is pulled. Error: {type(e).__name__}"
            )
        except Exception as e:
            print(f"❌ Unexpected error from Ollama: {e}")
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred during AI generation: {str(e)}")

# --- Helper: Extract JSON array from text with better error message ---
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

# --- Helper: Formats the file field to be a single string ---
def format_file_field(file_data: Union[str, List[str]]) -> str:
    """Formats the 'file' field to be a single string for the frontend."""
    if isinstance(file_data, list):
        return ", ".join(file_data)
    return file_data

# --- API Endpoints with refined prompts ---
@router.post("/generate-summaries", response_model=TestSummariesResponse)
async def generate_summaries(data: SummaryRequest):
    """Generate test summaries for each file and return as a JSON list."""
    print(f"📦 Received request to generate summaries for {len(data.files)} files.")
    
    file_contents = "\n\n".join(
        f"### File: {file.filename}\n```typescript\n{file.content[:4000]}\n```"
        for file in data.files
    )

    prompt = f"""
    You are an expert software tester. Your only task is to generate a list of high-level test case summaries based on the provided code files.

    The output MUST be a valid JSON array of objects. Do not include any text, conversation, or explanations outside of the JSON.

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
        response_text = await generate_with_ollama(prompt, model_name="phi3:mini")
        summaries_data = extract_json_array(response_text)
        print("🎉 Successfully generated and parsed summaries.")
        
        # Validate the raw model output against the flexible Pydantic model
        validated_summaries = [TestSummary(**s) for s in summaries_data]
        
        # Re-format the data to ensure the 'file' field is always a single string
        formatted_summaries = []
        for summary in validated_summaries:
            formatted_summary_dict = summary.model_dump()
            formatted_summary_dict['file'] = format_file_field(formatted_summary_dict['file'])
            formatted_summaries.append(formatted_summary_dict)
            
        return {"summaries": formatted_summaries}
    except Exception as e:
        print(f"❌ An error occurred in /generate-summaries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summaries: {e}")

@router.post("/generate-test-code")
async def generate_test_code(data: CodeRequest):
    """Generate test code for a given summary."""
    print(f"📦 Received request to generate test code for summary: {data.summary[:50]}...")
    prompt = f"""
You are a highly skilled developer writing test code.
Your task is to write a complete, runnable, and high-quality test code block for the provided test case summary.
The test code must be written for the **{data.framework}** framework.

Summary of the test case:
{data.summary}

Instructions:
1. The output MUST contain ONLY the code block.
2. The code should be a complete test file, including necessary imports and any required setup or teardown functions.
3. Follow best practices for the specified framework.
4. DO NOT include any explanations, comments, or surrounding text (e.g., "Here is the code:", or markdown fences like ```).
"""
    try:
        code_output = await generate_with_ollama(prompt, model_name="qwen2.5-coder:7b")
        # Remove accidental markdown code fences
        code_clean = re.sub(r"^```[a-zA-Z]*|```$", "", code_output, flags=re.MULTILINE).strip()
        if not code_clean:
            raise ValueError("Ollama returned an empty code block.")
        print("🎉 Successfully generated test code.")
        return {"code": code_clean}
    except Exception as e:
        print(f"❌ An error occurred in /generate-test-code: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate test code: {e}")