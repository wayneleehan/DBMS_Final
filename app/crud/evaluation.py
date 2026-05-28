from sqlalchemy import text, Connection

def create_evaluation(db: Connection, site_id: int, pattern_id: int):
    """交易控制由呼叫端負責 commit。"""
    sql = text("""
        INSERT INTO EVALUATION (Site_ID, Pattern_ID)
        VALUES (:site_id, :pattern_id)
    """)
    db.execute(sql, {"site_id": site_id, "pattern_id": pattern_id})

def check_evaluation_exists(db: Connection, site_id: int, pattern_id: int):
    sql = text("""
        SELECT 1 FROM EVALUATION
        WHERE Site_ID = :site_id AND Pattern_ID = :pattern_id 
        LIMIT 1
    """)
    return db.execute(sql, {"site_id": site_id, "pattern_id": pattern_id}).first() is not None