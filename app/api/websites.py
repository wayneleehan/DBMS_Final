from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.schemas.website import WebsiteResponse

router = APIRouter(prefix="/api/v1/websites", tags=["Websites"])

@router.get("/", response_model=list[WebsiteResponse])
def get_website(db: Session = Depends(get_db)):
    """
    取得所有網址列表
    """
    query = text("SELECT Site_ID, URL, IP_Address, Status, Risk_Score FROM WEBSITE")
    rows = db.execute(query).mappings().all()
    return [dict(row) for row in rows]