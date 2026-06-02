from sqlalchemy import text, Connection


def create_click_event(db: Connection, user_id: int, site_id: int) -> int:
    """新增一筆使用者瀏覽事件。交易控制由呼叫端負責 commit。"""
    result = db.execute(
        text("""
            INSERT INTO CLICK_EVENT (User_ID, Site_ID)
            VALUES (:user_id, :site_id)
        """),
        {"user_id": user_id, "site_id": site_id},
    )
    return result.lastrowid
