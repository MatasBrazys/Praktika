# app/auth/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth.utils import decode_token
import logging

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        # Temporary: log the raw token prefix to check it's arriving correctly
        logger.warning(f"decode_token failed. Token prefix: {token[:20] if token else 'EMPTY'}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    user = db.query(User).filter(
        User.id == int(sub),
        User.is_active == True
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_form_confirmer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["admin", "form_confirmer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Form confirmer access required"
        )
    return current_user