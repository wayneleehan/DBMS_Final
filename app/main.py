from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.api import reports, visits

app = FastAPI(title="防詐騙預警系統 API")

# MVP: allow all origins so the Chrome extension can POST during local dev.
# TODO(prod): restrict to a known origin list before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(visits.router)
app.include_router(reports.router)

# 測試 1：根目錄
@app.get("/")
def read_root():
    return {"message": "歡迎來到詐騙聯防預警系統後端"}

# 測試 2：資料庫連線 (就是這個不見了！)
@app.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT Site_ID, URL, Status, Risk_Score FROM WEBSITE LIMIT 5")).mappings().all()
        return {
            "status": "success",
            "message": "資料庫連線成功！",
            "data": result
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"資料庫連線徹底失敗：{str(e)}"
        }