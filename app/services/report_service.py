"""處理使用者通報(POST /reports)的業務邏輯。

混合策略(方案 B):
    1. 用 URL 查 WEBSITE 表
    2. 找到 → 直接拿既有 status / risk_score / site_id(快取命中,不重評)
    3. 沒找到 → 呼叫 scoring.run_scoring_pipeline() 完整評分 → 寫入 WEBSITE
    4. **不論新舊**,在 Report 表插一筆通報紀錄,留下 user 行為足跡
"""

from importlib.resources import files
import logging, os, uuid, boto3
from datetime import datetime

from fastapi import BackgroundTasks, UploadFile, HTTPException
from sqlalchemy import Connection

from app.crud.report import create_report
from app.crud.website import get_website_by_url
from app.services.scoring import run_scoring_pipeline

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-east-2")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# 偵錯用：確保不是讀到空值
if not BUCKET_NAME:
    raise ValueError("錯誤：找不到環境變數 S3_BUCKET_NAME，請檢查 .env 檔案是否存在！")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def _rollback_s3_uploads(keys: list[str]):
    """輔助函式：發生錯誤時，刪除批次中已成功上傳至 S3 的檔案"""
    for key in keys:
        try:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
        except Exception:
            pass 

async def handle_report(
    db: Connection,
    user_id: int,
    url: str,
    reported_at: datetime | None,
    background_tasks: BackgroundTasks,
    ip_address: str | None = None,
    category: str | None = None,
    reason: str | None = None,
    files: list[UploadFile] | None = None,
) -> dict:
    
    """處理一次使用者通報,回傳給 API 層的結構。
    user_id 由 API 層從 session 帶入,service 不負責驗證身分。
    """
    timestamp = reported_at or datetime.now()
    # 1. 處理檔案上傳至 S3
    file_urls = []
    uploaded_keys = []
    
    if files:
        for file in files:
            if not file.content_type.startswith("image/"):
                _rollback_s3_uploads(uploaded_keys)
                raise HTTPException(status_code=400, detail="僅允許上傳圖片檔案")
            
            _, file_ext = os.path.splitext(file.filename)
            unique_filename = f"reports/{uuid.uuid4().hex}{file_ext.lower()}"
            
            try:
                s3_client.upload_fileobj(
                    file.file,
                    BUCKET_NAME,
                    unique_filename,
                    ExtraArgs={"ContentType": file.content_type}
                )
                uploaded_keys.append(unique_filename)
                file_url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{unique_filename}"
                file_urls.append(file_url)
            except Exception:
                _rollback_s3_uploads(uploaded_keys)
                raise HTTPException(status_code=500, detail="檔案上傳至 S3 失敗")

    evidence_path = ",".join(file_urls) if file_urls else None

    #2. checking url
    existing = get_website_by_url(db, url)
    if existing:
        site_id = existing["Site_ID"]
        status = existing["Status"]
        risk_score = float(existing["Risk_Score"])
        is_new = False
    else:
        # run_scoring_pipeline 內部會自己 commit + 安排背景任務
        scored = run_scoring_pipeline(db, url, background_tasks, ip=ip_address)
        site_id = scored["Site_ID"]
        status = scored["Status"]
        risk_score = float(scored["Risk_Score"])
        is_new = True

    try:
        # 不論 WEBSITE 是快取命中還是新建,都要為這次「使用者通報」留紀錄
        create_report(
            db,
            user_id=user_id,
            site_id=site_id,
            evidence_path=evidence_path,
            reported_at=timestamp,
            category=category,
            reason=reason,
        )      
        db.commit()
    except Exception:
        db.rollback()
        raise

    tag = "new (scored)" if is_new else "cached"
    ip_log = f" ip={ip_address}" if ip_address else ""
    logger.info(
        "Report (%s): user=%s %s%s → %s/%s @ %s",
        tag, user_id, url, ip_log, status, risk_score, timestamp.isoformat(),
    )
    return {
        "url": url,
        "status": status,
        "risk_score": risk_score,
        "is_new": is_new,
    }
