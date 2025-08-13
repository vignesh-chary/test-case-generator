# backend/app/dependencies.py

from fastapi.security import OAuth2PasswordBearer

# This is the dependency that will be used to get the access token from the
# 'Authorization' header in your requests. It looks for a 'Bearer <token>' string.
# The tokenUrl is where clients can go to get a new token, but for this
# project, we're getting it directly from GitHub's redirect.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")