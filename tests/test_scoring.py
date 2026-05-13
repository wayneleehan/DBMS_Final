from sqlalchemy.orm import Session
from app.services.scoring import run_scoring_pipeline, deep_analyze_background
from fastapi import BackgroundTasks
from app.core.database import SessionLocal

def test_pipeline(url: str):
    db = SessionLocal()
    bg_tasks = BackgroundTasks()
    
    print(f"--- 開始測試 URL: {url} ---")
    
    # 1. 測試第一階段：初分
    result = run_scoring_pipeline(db, url, bg_tasks)
    print(f"第一階段結果: {result}")
    
    # 2. 手動模擬背景任務執行（因為是在腳本環境）
    print("正在模擬背景深度分析...")
    deep_analyze_background(db, result['Site_ID'], url, result['Risk_Score'])
    
    print("測試完成，請檢查資料庫！")
    db.close()

if __name__ == "__main__":
    # 測試案例 1：一個看起來很像銀行登入的網址
    test_pipeline("https://lbpiaccess-online.lat")