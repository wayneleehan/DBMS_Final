import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# 讀取剛剛寫的 .env 檔案
load_dotenv()

# 取得資料庫連線網址
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# 建立引擎與連線池
# - pool_pre_ping:每次借連線時先 ping,擋掉 MySQL idle timeout 後的死連線
#                (沒設的話會炸 "MySQL server has gone away" 2006)
# - pool_recycle:每條連線最多用 1 小時就回收,主動避開 MySQL 預設 wait_timeout=28800s
# - pool_size + max_overflow:本機 dev 用預設就夠;production 可依負載調
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 讓每一支 API 都能拿這個來跟資料庫講話
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()