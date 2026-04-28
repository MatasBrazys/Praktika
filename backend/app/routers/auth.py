# app/routers/auth.py

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.auth.utils import verify_password, create_access_token, hash_password
from app.auth.ldap import ldap_authenticate, ldap_get_user_info
from app.auth.dependencies import get_current_user, require_admin
from app.services.ldap_sync_service import LdapSyncService
from app.schemas.user import LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    # ── LDAP vartotojas (visada) ────────────────────────────────────────
    authenticated = ldap_authenticate(body.username, body.password)

    if authenticated:
        info = ldap_get_user_info(body.username)

        if not info:
            # Vartotojas išdingo iš LDAP — neleidžiame prisijungti
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

        user = db.query(User).filter(
            User.username == body.username,
            User.is_active == True
        ).first()

        if not user:
            # Pirmas prisijungimas — sukurti DB įrašą
            user = User(
                username=body.username,
                email=info["email"],
                role=info["role"],
                password_hash=None,  # Never store local password hash
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info("Auto-created LDAP user: %r role=%s", body.username, info["role"])

        else:
            # Kiekvienas prisijungimas — atnaujinti rolę ir emailą pagal LDAP
            changed = False
            if user.role != info["role"]:
                logger.info("Role updated for %r: %s → %s", body.username, user.role, info["role"])
                user.role = info["role"]
                changed = True
            if info["email"] and user.email != info["email"]:
                taken = db.query(User).filter(User.email == info["email"], User.id != user.id).first()
                if not taken:
                    logger.info("Email updated for %r: %s → %s", body.username, user.email, info["email"])
                    user.email = info["email"]
                    changed = True
                else:
                    logger.warning("Email %s already used by %r, skipping update for %r",
                                   info["email"], taken.username, body.username)
            if changed:
                db.commit()
                db.refresh(user)
    else:
        logger.warning("LDAP auth failed for %r", body.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Clear any existing local password hash to ensure LDAP-only auth
    if user.password_hash is not None:
        user.password_hash = None
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("User logged in: id=%d username=%r role=%s", user.id, user.username, user.role)
    return TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/ldap-sync")
def trigger_ldap_sync(_: User = Depends(require_admin)):
    try:
        LdapSyncService.sync_all_users()
        return {"status": "ok", "message": "LDAP sync completed"}
    except Exception as e:
        logger.error("LDAP sync failed: %s", str(e))
        return {"status": "error", "message": str(e)}


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