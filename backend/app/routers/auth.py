# app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth.utils import verify_password, create_access_token, hash_password
from app.auth.dependencies import get_current_user
from app.schemas.user import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == body.username,
        User.is_active == True
    ).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user




@router.post("/seed", include_in_schema=False)
def seed_users(db: Session = Depends(get_db)):
    try:
        defaults = [
            {"username": "admin",   "email": "admin@datagroup.de",   "role": "admin", "password": "admin123"},
            {"username": "manager", "email": "manager@datagroup.de", "role": "user",  "password": "user123"},
        ]
        created = []
        for u in defaults:
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