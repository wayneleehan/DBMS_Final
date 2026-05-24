# `core/` — 核心設定

讀 `.env`、建立 SQLAlchemy 連線引擎、提供 `get_db()` dependency。

> ⚠️ **這層已架設好,開發時不要改**。需要 DB session 時 import 即可:
> ```python
> from app.core.database import get_db
>
> def my_endpoint(db: Session = Depends(get_db)):
>     ...
> ```

## 檔案

| 檔案 | 內容 |
|------|------|
| `database.py` | 讀 `DATABASE_URL` → 建 SQLAlchemy `engine`、`SessionLocal` 工廠;`get_db()` yield 一個 session 並保證 close。也輸出 `Base = declarative_base()`(目前未用 ORM)。 |
| `__init__.py` | 空檔(Python package 標記) |

## 環境變數

`.env` 必須有:

| Key | 用途 |
|-----|------|
| `DATABASE_URL` | `mysql+pymysql://user:pwd@host:3306/anti_fraud_db` |
| `SESSION_SECRET_KEY` | Cookie session 簽章用(在 `main.py` 讀,不在這層讀) |
