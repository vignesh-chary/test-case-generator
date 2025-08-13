import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").strip("[]").replace('"', '').split(",")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
