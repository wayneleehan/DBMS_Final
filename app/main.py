from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db 
from fastapi import FastAPI
from app.api.v1 import warnings # 引入剛剛寫好的 router

app = FastAPI(title="詐騙聯防預警系統 API")

# 註冊預警系統路由
app.include_router(warnings.router)

@app.get("/")
def read_root():
    return {"message": "歡迎來到詐騙聯防預警系統後端"}

app = FastAPI(title="防詐騙預警系統 API")

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
            "message": f"資料庫連線失敗：{str(e)}"
        }