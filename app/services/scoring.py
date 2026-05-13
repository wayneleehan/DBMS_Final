from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
import socket
from app.crud import website, server_info, fraud_pattern, evaluation, risk_history
from app.utils.scraper import simple_scrape_content, get_domain_age_days # 確保這裡有引用 age 函式

def get_status_by_score(score: float) -> str:
    if score >= 80:
        return "Blocked"
    elif score >= 60:
        return "Warning"
    elif score >= 40:
        return "Low_Risk"
    else:
        return "Safe"

def run_scoring_pipeline(db: Session, url: str, background_tasks: BackgroundTasks):
    initial_score = 10.0

    # 1. 網址關鍵字計分
    sensitive_keywords = ['login', 'verify', 'bank', 'secure', 'account', 'gift']
    keywords_found = [key for key in sensitive_keywords if key in url.lower()]
    initial_score += min(len(keywords_found) * 10.0, 30.0)
    
    # 2. IP 獲取與 server_info 檢查
    try:
        hostname = url.split("//")[-1].split("/")[0]
        ip = socket.gethostbyname(hostname)
    except:
        ip = "0.0.0.0"

    # 確保 server_info 表中一定要有這個 IP (避免 1452 外鍵報錯)
    server_info.ensure_server_info_exists(db, ip)

    # 檢查該 IP 黑歷史
    s_info = server_info.get_server_info_by_ip(db, ip)
    if s_info and s_info.get('blocked_count', 0) >= 1:
        initial_score += 20.0

    # 3. 檢查網址是否已存在 (避免 1062 重複報錯)
    initial_status = get_status_by_score(initial_score)
    existing_site = website.get_website_by_url(db, url)
    
    if existing_site:
        site_id = existing_site['Site_ID']
        # 更新現有網址的分數與狀態
        website.update_website_score(db, site_id, initial_score, initial_status)
    else:
        # 建立新網址紀錄
        website.create_website_entry(db, url=url, ip=ip, score=initial_score, status=initial_status)
        new_site = website.get_website_by_url(db, url)
        site_id = new_site['Site_ID']
    
    # 4. 派發背景深度分析任務
    background_tasks.add_task(deep_analyze_background, db, site_id, url, initial_score)
    
    return {
        "Site_ID": site_id, 
        "URL": url, 
        "Risk_Score": initial_score, 
        "Status": initial_status
    }

# --- Part 2 deep scanning (已合併網域年齡與爬蟲邏輯) ---
def deep_analyze_background(db: Session, site_id: int, url: str, old_score: float):
    added_score = 0.0
    
    # A. 網域年齡檢查
    age_days = get_domain_age_days(url)
    if age_days is not None and age_days < 30:
        # 檢查是否已存在 Pattern_ID=3 的紀錄，避免重複寫入
        if not evaluation.check_evaluation_exists(db, site_id, 3):
            evaluation.create_evaluation(db, site_id, 3)
            added_score += 35.0

    # B. 網頁內容爬蟲與樣態比對
    web_content = simple_scrape_content(url) 
    patterns = fraud_pattern.get_all_patterns(db)
    
    for p in patterns:
        # 避免重複計分與重複寫入 evaluation
        if p['Type'].lower() in web_content.lower():
            if not evaluation.check_evaluation_exists(db, site_id, p['Pattern_ID']):
                evaluation.create_evaluation(db, site_id, p['Pattern_ID'])
                added_score += p['Weight']

    # C. 計算最終分數與更新狀態
    final_score = min(old_score + added_score, 100.0)
    final_status = get_status_by_score(final_score)
    
    website.update_website_score(db, site_id, final_score, final_status)
    risk_history.create_history(db, site_id, old_score, final_score)