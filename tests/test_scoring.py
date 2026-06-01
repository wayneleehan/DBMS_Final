from fastapi import BackgroundTasks
from app.core.database import engine
from app.services.scoring import deep_analyze_background, get_status_by_score, run_scoring_pipeline


def test_get_status_by_score_boundaries():
    assert get_status_by_score(0) == "Safe"
    assert get_status_by_score(40) == "Low_Risk"
    assert get_status_by_score(60) == "Warning"
    assert get_status_by_score(80) == "Blocked"


def run_pipeline_smoke(url: str):
    bg_tasks = BackgroundTasks()

    with engine.connect() as db:
        print(f"--- 開始測試 URL: {url} ---")

        # 1. 測試第一階段：初分
        result = run_scoring_pipeline(db, url, bg_tasks)
        print(f"第一階段結果: {result}")

    # 2. 手動模擬背景深度分析。背景任務現在會自己建立 DB connection。
    print("正在模擬背景深度分析...")
    deep_analyze_background(result["Site_ID"], url, result["Risk_Score"])

    print("測試完成，請檢查資料庫！")

if __name__ == "__main__":
    # 測試案例 1：一個看起來很像銀行登入的網址
    run_pipeline_smoke("https://lbpiaccess-online.lat")
