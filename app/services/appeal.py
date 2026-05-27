import os
import uuid
import boto3
from typing import List, Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.crud import appeal as crud_appeal
from app.schemas.appeal import AppealCreateRequest

import os
import boto3
from dotenv import load_dotenv

#強制載入環境變數
load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-east-2")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# 偵錯用：確保不是讀到空值
if not BUCKET_NAME:
    raise ValueError("❌ 錯誤：找不到環境變數 S3_BUCKET_NAME，請檢查 .env 檔案是否存在！")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def _rollback_s3_uploads(keys: List[str]):
    """輔助函式：發生錯誤時，刪除批次中已成功上傳至 S3 的檔案"""
    for key in keys:
        try:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
        except Exception:
            pass 

async def process_appeal_submission(db: Session, appeal_data: AppealCreateRequest, files: Optional[List[UploadFile]]) -> dict:
    """
    處理使用者提交申訴或再申訴的邏輯。
    """
    #1 處理檔案上傳至S3
    file_urls = []
    uploaded_keys = [] 

    if files:
        for file in files:
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="僅允許上傳圖片檔案")
            #轉小寫附檔名
            _, file_ext = os.path.splitext(file.filename)
            unique_filename = f"appeals/{uuid.uuid4().hex}{file_ext.lower()}"
            
            try:
                file_content = await file.read()
                #putobject
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=unique_filename,
                    Body=file_content,
                    ContentType=file.content_type
                )
                """
                s3_client.upload_fileobj(
                    file.file,
                    BUCKET_NAME,
                    unique_filename,
                    ExtraArgs={"ContentType": file.content_type}
                )
                """
                uploaded_keys.append(unique_filename)
                file_url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{unique_filename}"
                file_urls.append(file_url)

            except Exception as e:
                #失敗就全退回
                _rollback_s3_uploads(uploaded_keys)
                print(f"S3 Upload Error: {str(e)}") 
                raise HTTPException(status_code=500, detail="檔案上傳至 S3 失敗")

    if file_urls:
        appeal_data.evidence_link = ",".join(file_urls)
    # 2. 檢查 Report_ID 是否真的存在 (防呆)
    # 3. 如果 parent_appeal_id 有值，確認上一筆申訴狀態是否為 'Rejected'
    
    # 呼叫 CRUD 寫入資料庫
    new_appeal_id = crud_appeal.create_appeal(
        db=db,
        report_id=appeal_data.report_id,
        reason=appeal_data.reason,
        evidence_link=appeal_data.evidence_link,
        parent_appeal_id=appeal_data.parent_appeal_id
    )

    is_re_appeal = "再申訴" if appeal_data.parent_appeal_id else "申訴"

    return {
        "status": "success",
        "message": f"{is_re_appeal}已成功提交，系統將盡速派員審核。",
        "appeal_id": new_appeal_id
    }