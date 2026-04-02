# app/routers/auth.py

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.auth.utils import verify_password, create_access_token, hash_password
from app.auth.ldap import ldap_authenticate, ldap_get_user_info
from app.auth.dependencies import get_current_user
from app.schemas.user import LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == body.username,
        User.is_active == True,
    ).first()

    authenticated = False

    if user and user.password_hash:
        # ── Lokalus vartotojas (seed) — bcrypt ───────────────────────
        authenticated = verify_password(body.password, user.password_hash)

    else:
        # ── LDAP vartotojas ──────────────────────────────────────────
        authenticated = ldap_authenticate(body.username, body.password)

        if authenticated:
            info = ldap_get_user_info(body.username)

            if not info:
                # Vartotojas išdingo iš LDAP — deaktyvuoti DB įrašą
                if user:
                    user.is_active = False
                    db.commit()
                    logger.warning("User %r not found in LDAP — deactivated", body.username)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect username or password",
                )

            if not user:
                # Pirmas prisijungimas — sukurti DB įrašą
                user = User(
                    username=body.username,
                    email=info["email"],
                    role=info["role"],
                    password_hash=None,
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                logger.info("Auto-created LDAP user: %r role=%s", body.username, info["role"])

            else:
                # Kiekvienas prisijungimas — atnaujinti rolę pagal LDAP grupę
                if user.role != info["role"]:
                    logger.info(
                        "Role updated for %r: %s → %s",
                        body.username, user.role, info["role"],
                    )
                    user.role = info["role"]
                    db.commit()
                    db.refresh(user)

    if not authenticated or not user:
        logger.warning("Failed login: %r", body.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("User logged in: id=%d username=%r role=%s", user.id, user.username, user.role)
    return TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


if settings.ENABLE_DEV_ROUTES:
    logger.warning("ENABLE_DEV_ROUTES=true — dev endpoints active")

    @router.post("/seed", include_in_schema=False)
    def seed_users(db: Session = Depends(get_db)):
        default_users = [
            {"username": "admin",   "email": "admin@datagroup.de",   "role": "admin", "password": "admin123"},
            {"username": "manager", "email": "manager@datagroup.de", "role": "user",  "password": "user123"},
        ]
        created = []
        try:
            for u in default_users:
                if not db.query(User).filter(User.username == u["username"]).first():
                    db.add(User(
                        username=u["username"],
                        email=u["email"],
                        role=u["role"],
                        password_hash=hash_password(u["password"]),
                        is_active=True,
                    ))
                    created.append(u["username"])
            db.commit()
            return {"created": created}
        except Exception as e:
            db.rollback()
            return {"error": str(e)}