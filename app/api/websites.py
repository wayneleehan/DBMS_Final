from fastapi import APIRouter, Depends, Query
from sqlalchemy import Connection
from app.core.database import get_db
from app.crud import website as crud_website
from app.schemas.website import WebsiteResponse

router = APIRouter(prefix="/api/v1/websites", tags=["Websites"])

@router.get("/", response_model=list[WebsiteResponse])
def get_website(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Connection = Depends(get_db),
):
    """
    取得所有網址列表
    """
    return crud_website.get_all_websites(db, limit=limit, offset=offset)
