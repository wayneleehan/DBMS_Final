from sqlalchemy import text
from sqlalchemy.orm import Session

def get_all_patterns(db: Session):
    sql = text("SELECT Pattern_ID, Type, Weight FROM fraud_pattern")
    return db.execute(sql).mappings().all()