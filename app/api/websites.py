from fastapi import APIRouter, Depends
from sqlalchemy import Connection
from app.core.database import get_db
from app.crud import website as crud_website
from app.schemas.website import WebsiteResponse

router = APIRouter(prefix="/api/v1/websites", tags=["Websites"])

@router.get("/", response_model=list[WebsiteResponse])
def get_website(db: Connection = Depends(get_db)):
    """
    取得所有網址列表
    """
    return crud_website.get_all_websites(db)
