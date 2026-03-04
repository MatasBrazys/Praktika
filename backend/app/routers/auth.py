# app/routers/auth.py
# Authentication endpoints: login, current user info.
# Dev-only seed endpoint is registered only when ENABLE_DEV_ROUTES=true in .env.

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.auth.utils import verify_password, create_access_token, hash_password
from app.auth.dependencies import get_current_user
from app.schemas.user import LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


# Returns a JWT token on successful login
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == body.username,
        User.is_active == True
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        logger.warning("Failed login attempt for username: %r", body.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("User logged in: id=%d username=%r", user.id, user.username)
    return TokenResponse(access_token=token, role=user.role, username=user.username)


# Returns the currently authenticated user — used by frontend to restore session
@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# Dev-only routes — completely absent in production (not even a 404)
if settings.ENABLE_DEV_ROUTES:
    logger.warning("ENABLE_DEV_ROUTES=true — dev endpoints are active, do not use in production")

    # Creates default admin/manager test users if they don't already exist
    @router.post("/seed", include_in_schema=False)
    def seed_users(db: Session = Depends(get_db)):
        default_users = [
            {"username": "admin",   "email": "admin@datagroup.de",   "role": "admin", "password": "admin123"},
            {"username": "manager", "email": "manager@datagroup.de", "role": "user",  "password": "user123"},
        ]

        created_usernames = []

        try:
            for user_data in default_users:
                already_exists = db.query(User).filter(
                    User.username == user_data["username"]
                ).first()

                if not already_exists:
                    db.add(User(
                        username=user_data["username"],
                        email=user_data["email"],
                        role=user_data["role"],
                        password_hash=hash_password(user_data["password"]),
                        is_active=True,
                    ))
                    created_usernames.append(user_data["username"])

            db.commit()
            logger.info("Seed: created users: %s", created_usernames)
            return {"created": created_usernames}

        except Exception as error:
            db.rollback()
            logger.error("Seed failed: %s", error)
            return {"error": str(error)}