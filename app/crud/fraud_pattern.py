from sqlalchemy import text, Connection

def get_all_patterns(db: Connection):
    sql = text("SELECT Pattern_ID, Type, Weight FROM FRAUD_PATTERN")
    return db.execute(sql).mappings().all()