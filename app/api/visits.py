from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.visit import VisitCreate, VisitResponse
from app.services.visits_checking import check_visit

router = APIRouter(prefix="/api/v1", tags=["visits"])


@router.post("/visits", response_model=VisitResponse)
def create_visit(
    payload: VisitCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return check_visit(
        db,
        url=payload.url,
        visited_at=payload.visited_at,
        background_tasks=background_tasks,
        ip_address=payload.ip_address,
    )
