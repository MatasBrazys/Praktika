from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import form, forms  # ← ADD forms

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IT Services Portal API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "IT Services Portal API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Include routers
app.include_router(form.router)
app.include_router(forms.router)  # ← ADD this