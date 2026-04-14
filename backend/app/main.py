# app/main.py

import logging
import threading
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import forms, auth, submissions, lookup, form_confirmations
from app.services.ldap_sync_service import LdapSyncService

logger = logging.getLogger(__name__)


def ldap_sync_worker():
    """Background thread for LDAP sync."""
    interval_seconds = settings.LDAP_SYNC_INTERVAL_MINUTES * 60
    logger.info(f"LDAP sync worker started (interval={interval_seconds}s)")
    while True:
        time.sleep(interval_seconds)
        try:
            LdapSyncService.sync_all_users()
        except Exception as e:
            logger.error(f"LDAP sync worker error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.LDAP_SYNC_ENABLED:
        t = threading.Thread(target=ldap_sync_worker, daemon=True)
        t.start()
        logger.info(
            "LDAP sync thread started (interval=%d min)",
            settings.LDAP_SYNC_INTERVAL_MINUTES,
        )
    
    yield


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IT Services Portal API",
    version="1.0.0",
    lifespan=lifespan,
)

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

app.include_router(forms.router)  
app.include_router(auth.router)
app.include_router(submissions.router)
app.include_router(lookup.router)
app.include_router(form_confirmations.router)
