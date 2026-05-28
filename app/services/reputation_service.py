from sqlalchemy import Connection

from app.crud import user as user_crud
from app.crud import report as report_crud

PENALTY_SPAM = -15.0
PENALTY_APPEAL_REJECTED = -10.0
REWARD_APPEAL_APPROVED = 10.0

def check_and_penalize_spam(db: Connection, user_id: int, site_id: int) -> bool:
    report_count = report_crud.count_recent_reports_by_user(db, user_id, site_id)

    if report_count >= 3:
        user_crud.update_reliability_score(db, user_id, PENALTY_SPAM)
        return True 
    
    return False 

def process_appeal_impact(db: Connection, user_id: int, status: str):
    if status == "Rejected":
        user_crud.update_reliability_score(db, user_id, PENALTY_APPEAL_REJECTED)
    elif status == "Approved":
        user_crud.update_reliability_score(db, user_id, REWARD_APPEAL_APPROVED)