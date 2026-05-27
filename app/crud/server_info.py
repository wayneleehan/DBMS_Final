from sqlalchemy import text, Connection

def get_server_info_by_ip(db: Connection, ip: str):
    sql = text("SELECT IP_Address, Country, ISP, ASN FROM server_info WHERE IP_Address = :ip")
    return db.execute(sql, {"ip": ip}).mappings().first()

def ensure_server_info_exists(db: Connection, ip: str):
    """檢查 IP 是否在 server_info,不在就插入 'Unknown' 預設值。
    交易控制由呼叫端負責 commit。
    """
    check_sql = text("SELECT IP_Address FROM server_info WHERE IP_Address = :ip")
    result = db.execute(check_sql, {"ip": ip}).first()

    if not result:
        insert_sql = text("""
            INSERT INTO SERVER_INFO (IP_Address, Country, ISP, ASN)
            VALUES (:ip, 'Unknown', 'Unknown', 'Unknown')
        """)
        db.execute(insert_sql, {"ip": ip})