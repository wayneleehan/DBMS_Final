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