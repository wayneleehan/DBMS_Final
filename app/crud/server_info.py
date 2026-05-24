from sqlalchemy import text, Connection

def get_server_info_by_ip(db: Connection, ip: str):
    sql = text("SELECT IP_Address, Country, ISP, ASN FROM server_info WHERE IP_Address = :ip")
    return db.execute(sql, {"ip": ip}).mappings().first()

def ensure_server_info_exists(db: Connection, ip: str):
    check_sql = text("SELECT IP_Address FROM server_info WHERE IP_Address = :ip")
    result = db.execute(check_sql, {"ip": ip}).first()

    if not result:
        insert_sql = text("""
            INSERT INTO server_info (IP_Address, Country, ISP, ASN) 
            VALUES (:ip, 'Unknown', 'Unknown', 'Unknown')
        """)
        db.execute(insert_sql, {"ip": ip})
        db.commit()