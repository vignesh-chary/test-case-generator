# backend/app/main.py
from dotenv import load_dotenv
load_dotenv() # This line should be at the very top of the file

# ... rest of your imports and code
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.github import github_router
from app.routes.generate import router as generate_router
from app.config import ALLOWED_ORIGINS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(github_router, prefix="/auth", tags=["GitHub"])
app.include_router(generate_router, prefix="/api", tags=["Generate"])
