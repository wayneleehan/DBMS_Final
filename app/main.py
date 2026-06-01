import os


from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, Connection
from starlette.middleware.sessions import SessionMiddleware


from app.core.database import get_db
from app.api import websites
from app.api.v1 import warnings, appeal, admin_review, auth, users, reports, visits



_session_secret = os.getenv("SESSION_SECRET_KEY")
if not _session_secret:
    raise RuntimeError(
        "SESSION_SECRET_KEY 未設定。請在 .env 設定,產生方式:"
        "uv run python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    )

_https_only = os.getenv("SESSION_HTTPS_ONLY", "false").lower() in ("true", "1", "yes")


app = FastAPI(title="詐騙聯防預警系統")


# Cookie session(simulate login state)
# secret 從 .env 讀;沒設就用 dev fallback(部署時務必設正確值)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-only-do-not-use-in-prod"),
    same_site="lax",
    https_only=_https_only,
    max_age=60 * 60 * 24 * 7,  # 7 天
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|chrome-extension://.+)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(visits.router)
app.include_router(reports.router)
app.include_router(warnings.router)
app.include_router(appeal.router)
app.include_router(admin_review.router)
app.include_router(websites.router)
@app.get("/")
def read_root():
    return {"message": "歡迎來到詐騙聯防預警系統後端"}


@app.get("/test-db")
def test_database_connection(db: Connection = Depends(get_db)):
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
