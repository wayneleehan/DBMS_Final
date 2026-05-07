from datetime import datetime

from fastapi import APIRouter

from app.schemas.visit import VisitCreate

router = APIRouter(prefix="/api/v1", tags=["visits"])


@router.post("/visits")
def create_visit(payload: VisitCreate):
    timestamp = payload.visited_at or datetime.now()
    print(f"📥 Received URL: {payload.url}")
    print(f"🕒 Visited at: {timestamp.isoformat()}")
    return {"status": "ok", "received_url": payload.url}
