import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# 讀取剛剛寫的 .env 檔案
load_dotenv()

# 取得資料庫連線網址
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# 建立引擎與連線池
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 讓每一支 API 都能拿這個來跟資料庫講話
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()