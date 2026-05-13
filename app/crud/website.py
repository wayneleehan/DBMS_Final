from sqlalchemy import text
from sqlalchemy.orm import Session

def create_website_entry(db: Session, url: str, ip: str, score: float, status: str):
    sql = text("""
        INSERT INTO WEBSITE (URL, IP_Address, Status, Risk_Score) 
        VALUES (:url, :ip, :status, :score)
    """)
    db.execute(sql, {
        "url": url, 
        "ip": ip,      
        "status": status, 
        "score": score
    })
    db.commit()

def update_website_score(db: Session, site_id: int, score: float, status: str):
    sql = text("""
        UPDATE website 
        SET Risk_Score = :score, Status = :status 
        WHERE Site_ID = :site_id
    """)
    db.execute(sql, {"score": score, "status": status, "site_id": site_id})
    db.commit()

def get_website_by_url(db: Session, url: str):
    sql = text("SELECT Site_ID, URL, IP_Address, Status, Risk_Score FROM website WHERE URL = :url")
    return db.execute(sql, {"url": url}).mappings().first()