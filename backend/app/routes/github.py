# backend/app/routes/github.py

import base64
import uuid
import httpx
import asyncio
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from fastapi.responses import JSONResponse

# This import is crucial for your OAuth dependency injection
from ..dependencies import oauth2_scheme
from app.config import GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI

# Instantiate the APIRouter. All endpoints will use this router.
github_router = APIRouter()

# Pydantic models for the new PR request
class FileContent(BaseModel):
    file: str
    code: str

class CreatePRRequest(BaseModel):
    repo: str
    files: List[FileContent]


@github_router.get("/github/callback")
async def github_callback(code: str):
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, headers=headers, data=data)
        token_json = token_res.json()

    if "access_token" not in token_json:
        raise HTTPException(status_code=400, detail="GitHub OAuth failed")

    access_token = token_json["access_token"]

    # Use asyncio.gather to run the requests concurrently
    async with httpx.AsyncClient() as client:
        user_res, repos_res = await asyncio.gather(
            client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"}
            ),
            client.get(
                "https://api.github.com/user/repos?per_page=100",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        )

    if user_res.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to fetch user profile")

    user_data = user_res.json()
    repos_data = repos_res.json()

    return JSONResponse({
        "user": {
            "login": user_data["login"],
            "name": user_data.get("name"),
            "avatar_url": user_data["avatar_url"],
        },
        "access_token": access_token,
        "repositories": [
            {
                "id": repo["id"],
                "name": repo["name"],
                "full_name": repo["full_name"],
                "description": repo.get("description", ""),
                "language": repo.get("language", "Unknown"),
                "updated_at": repo["updated_at"],
                "private": repo["private"]
            }
            for repo in repos_data
        ]
    })


@github_router.get("/github/repositories")
async def get_user_repositories(token: str):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    async with httpx.AsyncClient() as client:
        res = await client.get("https://api.github.com/user/repos?per_page=100", headers=headers)

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Failed to fetch repositories")

    repos_data = res.json()

    return [
        {
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "description": repo.get("description", ""),
            "language": repo.get("language", "Unknown"),
            "updated_at": repo["updated_at"],
            "private": repo["private"]
        }
        for repo in repos_data
    ]


@github_router.get("/github/repos/{owner}/{repo}/contents/{path:path}")
async def get_repo_contents(owner: str, repo: str, path: str = "", token: str = ""):
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Failed to fetch file or directory")

    if isinstance(res.json(), list):
        contents = res.json()
        return [
            {
                "name": item["name"],
                "path": item["path"],
                "type": item["type"],
                "size": item.get("size", 0),
            }
            for item in contents if item["type"] in ("file", "dir")
        ]
    else:
        return res.json()


@github_router.post("/create-pr")
async def create_pr(data: CreatePRRequest, token: str = Depends(oauth2_scheme)):
    """
    Creates a new branch, commits the generated test files, and opens a pull request.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication failed")

    headers = {"Authorization": f"token {token}"}
    repo_url = f"https://api.github.com/repos/{data.repo}"

    async with httpx.AsyncClient() as client:
        try:
            # 1. Get the main branch's default ref (e.g., 'main' or 'master')
            repo_info = await client.get(repo_url, headers=headers)
            repo_info.raise_for_status()
            default_branch = repo_info.json().get("default_branch", "main")

            # 2. Get the SHA of the latest commit on the default branch
            ref_url = f"{repo_url}/git/ref/heads/{default_branch}"
            ref_res = await client.get(ref_url, headers=headers)
            ref_res.raise_for_status()
            base_commit_sha = ref_res.json()["object"]["sha"]

            # 3. Create a new branch
            new_branch_name = f"feature/add-tests-{uuid.uuid4().hex[:6]}"
            new_branch_url = f"{repo_url}/git/refs"
            await client.post(
                new_branch_url,
                headers=headers,
                json={
                    "ref": f"refs/heads/{new_branch_name}",
                    "sha": base_commit_sha,
                },
            )

            # 4. Create and commit the new test files
            for file_data in data.files:
                # Define a file path for the new tests
                file_path = f"tests/generated/{file_data.file}.test.js"
                commit_message = f"feat: Add generated test for {file_data.file}"

                await client.put(
                    f"{repo_url}/contents/{file_path}",
                    headers=headers,
                    json={
                        "message": commit_message,
                        "content": base64.b64encode(file_data.code.encode()).decode(),
                        "branch": new_branch_name,
                    },
                )

            # 5. Create the Pull Request
            pr_title = "feat: Add auto-generated tests"
            pr_body = "This PR introduces a suite of generated test cases to improve code coverage."
            pr_res = await client.post(
                f"{repo_url}/pulls",
                headers=headers,
                json={
                    "title": pr_title,
                    "body": pr_body,
                    "head": new_branch_name,
                    "base": default_branch,
                },
            )
            pr_res.raise_for_status()

            return {"url": pr_res.json()["html_url"]}

        except httpx.HTTPStatusError as e:
            # Check for 409 Conflict if the branch already exists (unlikely with UUID)
            if e.response.status_code == 409:
                raise HTTPException(status_code=409, detail=f"A branch with this name already exists: {e}")
            raise HTTPException(status_code=e.response.status_code, detail=f"GitHub API Error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")