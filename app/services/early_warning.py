from sqlalchemy import Connection
from app.crud import report, alert_logs, website

def monitor_cib_attack(db: Connection, site_id: int) -> dict:
    """
    偵測協同造假攻擊邏輯
    系統讀取 Reports 表中最近 1 分鐘的紀錄。
    """
    # 檢查 60 秒內是否有超過 3 名不同用戶檢舉 (可依需求調整門檻)
    distinct_users = report.count_recent_reports_for_cib(db, site_id, seconds=60)

    if distinct_users >= 3:
        try:
            # 若多個 Users.User_ID 在極短時間內對同一網址提交檢舉，自動寫入 Alert_Logs [cite: 7]
            alert_desc = f"系統偵測到短時間內湧入大量檢舉 (Site_ID: {site_id})，疑似協同造假攻擊。"
            alert_logs.create_alert_log(db, alert_type="CIB_Attack", target_id=f"Site_ID: {site_id}", description=alert_desc)

            # 暫停該網址的自動封鎖功能，強制轉入人工審核流程 [cite: 8]
            website.force_manual_review(db, site_id)

            db.commit()
        except Exception:
            db.rollback()
            raise

        return {"alert_triggered": True, "details": {"distinct_users": distinct_users, "action": "Manual review enforced"}}

    return {"alert_triggered": False, "details": {"distinct_users": distinct_users}}

def monitor_cluster_warning(db: Connection, ip_address: str) -> dict:
    """
    主動探知詐騙集團的「集群機房」邏輯
    執行 JOIN 查詢 Websites 與 Server_Info 計算比例 [cite: 10, 12]。
    """
    stats = website.get_ip_block_stats(db, ip_address)
    total = stats['total_sites']
    blocked = stats['blocked_sites']

    if total == 0:
        return {"alert_triggered": False, "details": {"message": "No sites found for this IP"}}

    block_ratio = blocked / total

    # 若該 IP 下已有超過 50% 的網站被判定為詐騙，觸發預警 [cite: 13]
    if block_ratio >= 0.5:
        try:
            alert_desc = f"該 IP ({ip_address}) 網段下已有 {block_ratio*100}% 的網站被標記為詐騙，觸發機房集群預警。"
            alert_logs.create_alert_log(db, alert_type="Cluster_Warning", target_id=f"IP: {ip_address}", description=alert_desc)

            # 批量更新該 IP 下所有「正常」網址的 Risk_Score [cite: 14]
            # 假設增加 30 分風險值
            website.batch_increase_risk_score_by_ip(db, ip_address, score_increment=30.0)

            db.commit()
        except Exception:
            db.rollback()
            raise

        return {"alert_triggered": True, "details": {"block_ratio": block_ratio, "action": "Batch risk score increased"}}

    return {"alert_triggered": False, "details": {"block_ratio": block_ratio}}