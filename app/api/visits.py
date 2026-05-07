from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.website import upsert_website_by_url
from app.schemas.visit import VisitCreate

router = APIRouter(prefix="/api/v1", tags=["visits"])


@router.post("/visits")
def create_visit(payload: VisitCreate, db: Session = Depends(get_db)):
    timestamp = payload.visited_at or datetime.now()
    site_id = upsert_website_by_url(db, payload.url)

    print(f"📥 Received URL: {payload.url}")
    print(f"🕒 Visited at: {timestamp.isoformat()}")
    print(f"🗂️  Site_ID: {site_id}")

    return {
        "status": "ok",
        "received_url": payload.url,
        "site_id": site_id,
    }
