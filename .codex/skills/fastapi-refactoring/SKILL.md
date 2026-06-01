---
name: fastapi-refactoring
description: FastAPI 後端重構評估、安全性與效能偵測指南。用於 TDD 流程中 mutation testing 驗證測試強度後（MUTATE 階段），評估 FastAPI 應用程式的改進機會，包含程式碼結構優化、安全漏洞偵測與效能瓶頸排查。
---

# FastAPI Refactoring

Refactoring 是 TDD 的最後步驟。在 mutation testing 確認測試強度後，評估 FastAPI 應用是否需要重構、是否存在安全或效能隱患。

## When to Refactor

- 每次 mutation testing 確認測試強度後評估
- 只有在能改進程式碼時才重構
- **重構前先 commit 可運作的程式碼**（關鍵安全網）
- 偵測到安全或效能問題時，視為 Critical 等級立即處理

### Commit Before Refactoring - WHY

在重構前保有可運作的基準版本：
- 重構失敗時可以還原
- 提供實驗的安全網
- 降低重構風險
- 在 git 歷史中呈現清楚的分離

**Workflow：**
1. GREEN：測試通過
2. MUTATE：驗證測試有效性
3. KILL MUTANTS：處理存活的 mutants
4. **SCAN**：執行安全與效能掃描（見下方章節）
5. COMMIT：儲存具備強測試的可運作程式碼
6. REFACTOR：改善結構
7. COMMIT：儲存重構後的程式碼

---

## Priority Classification

| Priority | Action | FastAPI Examples |
|----------|--------|------------------|
| **Critical** | 立刻修復 | SQL injection、明文密碼、缺少 auth、同步 I/O 阻塞 event loop、N+1 queries、暴露的 secrets |
| **High** | 本次 session 處理 | 缺少 Pydantic 驗證、未使用 dependency injection、缺少 response_model、未做 pagination |
| **Nice** | 之後處理 | Router 拆分、tag 整理、docstring 補齊、小幅命名 |
| **Skip** | 不要動 | 已經乾淨的程式碼 |

---

## DRY = Knowledge, Not Code

**抽象化的時機**：
- 相同的業務概念（語義意義相同）
- 需求變動時會一起改變
- 分組的原因明顯

**保持分離的時機**：
- 不同概念但長得類似（結構相似而已）
- 會獨立演化
- 耦合會造成困惑

### FastAPI 中的 DRY 範例

```python
# ✅ 正確抽象：共用的 dependency
async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# ❌ 錯誤抽象：把不同概念硬湊在一起
# 「驗證 email」和「驗證 username」雖然長得像，
# 但業務規則不同，未來會獨立演化，不該抽成同一個 function
```

---

## 🔒 安全性偵測（Security Scanning）

每次重構前必須執行的安全檢查清單。發現任一項都應視為 **Critical**。

### 1. Input Validation（輸入驗證）

```python
# ❌ 危險：直接接收 dict，缺少驗證
@app.post("/users")
async def create_user(data: dict):
    return await db.users.insert(data)  # Mass assignment 漏洞

# ✅ 安全：使用 Pydantic model 限制欄位
class UserCreate(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=8)
    name: str = Field(max_length=100)

    model_config = ConfigDict(extra="forbid")  # 拒絕多餘欄位

@app.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate):
    ...
```

### 2. SQL Injection

```python
# ❌ 危險：字串拼接
query = f"SELECT * FROM users WHERE email = '{email}'"
await db.execute(query)

# ✅ 安全：使用 ORM 或參數化查詢
stmt = select(User).where(User.email == email)
result = await session.execute(stmt)
```

### 3. Authentication & Authorization

```python
# ❌ 危險：endpoint 沒有保護
@app.get("/admin/users")
async def list_all_users():
    return await db.users.all()

# ✅ 安全：使用 dependency 強制驗證
@app.get("/admin/users", dependencies=[Depends(require_admin)])
async def list_all_users(
    current_user: User = Depends(get_current_active_user),
):
    return await db.users.all()
```

### 4. Secrets Management

```python
# ❌ 危險：hardcoded secret
SECRET_KEY = "my-super-secret-key-123"

# ✅ 安全：透過 pydantic-settings 從環境變數讀取
class Settings(BaseSettings):
    secret_key: SecretStr
    database_url: SecretStr

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
```

### 5. Password Hashing

```python
# ❌ 危險：明文或弱 hash
user.password = password  # 明文！
user.password = hashlib.md5(password.encode()).hexdigest()  # MD5 不安全

# ✅ 安全：使用 bcrypt / argon2
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
user.password = pwd_context.hash(password)
```

### 6. Sensitive Data Exposure

```python
# ❌ 危險：回傳整個 User model（含 password hash）
@app.get("/users/{user_id}")
async def get_user(user_id: int) -> User:
    return await db.users.get(user_id)

# ✅ 安全：明確指定 response_model 過濾敏感欄位
class UserPublic(BaseModel):
    id: int
    email: EmailStr
    name: str
    # 不包含 password_hash、internal_notes 等

@app.get("/users/{user_id}", response_model=UserPublic)
async def get_user(user_id: int):
    return await db.users.get(user_id)
```

### 7. CORS、Rate Limiting、CSRF

- CORS：`allow_origins=["*"]` 在 production 是 **Critical** 問題
- Rate Limiting：對 auth endpoint 必須加（推薦 slowapi）
- CSRF：使用 cookie-based auth 時需要 CSRF token

### 安全性檢查清單

- [ ] 所有 endpoint 使用 Pydantic model 驗證輸入
- [ ] Pydantic model 設定 `extra="forbid"` 防止 mass assignment
- [ ] 所有 DB 操作使用 ORM 或參數化查詢
- [ ] 所有非公開 endpoint 有 `Depends(get_current_active_user)`
- [ ] 權限檢查使用 dependency injection（不在 endpoint 內手刻）
- [ ] 沒有 hardcoded secret（透過 `Settings` 讀環境變數）
- [ ] 密碼使用 bcrypt 或 argon2 hash
- [ ] 回傳資料明確指定 `response_model`
- [ ] CORS `allow_origins` 設定為具體 domain
- [ ] Auth/敏感 endpoint 有 rate limiting

---

## ⚡ 效能偵測（Performance Scanning）

### 1. Async vs Sync — 不要阻塞 Event Loop

```python
# ❌ 危險：在 async function 裡跑同步 I/O
@app.get("/data")
async def get_data():
    response = requests.get("https://api.example.com")  # 阻塞！
    return response.json()

# ✅ 正確：使用 async HTTP client
@app.get("/data")
async def get_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com")
    return response.json()

# ✅ 替代：CPU-bound 工作用 sync function 讓 FastAPI 丟到 threadpool
@app.get("/heavy")
def heavy_computation():  # 注意：def 不是 async def
    return cpu_intensive_work()
```

### 2. N+1 Query Problem

```python
# ❌ 慢：N+1 queries
@app.get("/posts")
async def list_posts(session: AsyncSession = Depends(get_session)):
    posts = await session.scalars(select(Post))
    return [
        {"title": p.title, "author": p.author.name}  # 每個 post 觸發一次 query
        for p in posts
    ]

# ✅ 快：eager loading
@app.get("/posts")
async def list_posts(session: AsyncSession = Depends(get_session)):
    stmt = select(Post).options(selectinload(Post.author))
    posts = await session.scalars(stmt)
    return [{"title": p.title, "author": p.author.name} for p in posts]
```

### 3. Pagination

```python
# ❌ 慢：一次回傳所有資料
@app.get("/items")
async def list_items():
    return await db.items.all()  # 100 萬筆怎麼辦？

# ✅ 快：強制 pagination
@app.get("/items", response_model=Page[ItemResponse])
async def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    stmt = select(Item).offset(skip).limit(limit)
    ...
```

### 4. Database Connection Pool

```python
# ✅ 正確設定 connection pool
engine = create_async_engine(
    settings.database_url.get_secret_value(),
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,  # 偵測斷線
    pool_recycle=3600,
)
```

### 5. Background Tasks / Job Queue

```python
# ❌ 慢：endpoint 內做耗時工作
@app.post("/send-email")
async def send_email(data: EmailRequest):
    await send_smtp_email(data)  # 使用者要等 5 秒
    return {"status": "sent"}

# ✅ 快：丟到背景處理
@app.post("/send-email")
async def send_email(data: EmailRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_smtp_email, data)
    return {"status": "queued"}

# ✅ 更好：重要任務用 Celery/ARQ/RQ，有 retry 與持久化
```

### 6. Caching

```python
# ✅ 對熱門但不常變動的資料加 cache
from fastapi_cache.decorator import cache

@app.get("/popular-items")
@cache(expire=60)  # 60 秒
async def popular_items():
    return await expensive_query()
```

### 7. Response Streaming

```python
# ❌ 慢：載入整個大檔案到記憶體
@app.get("/export")
async def export_data():
    data = await fetch_all_records()  # 可能 GB 級
    return data

# ✅ 快：streaming response
@app.get("/export")
async def export_data():
    async def generate():
        async for chunk in fetch_records_chunked():
            yield chunk
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

### 效能檢查清單

- [ ] async endpoint 內沒有同步 I/O（requests、time.sleep、同步 DB driver）
- [ ] 所有跨 relation 的查詢使用 `selectinload` / `joinedload`
- [ ] 列表 endpoint 強制 pagination（`limit` 有上限）
- [ ] DB engine 設定 `pool_size`、`pool_pre_ping`、`pool_recycle`
- [ ] 耗時工作丟到 `BackgroundTasks` 或 job queue
- [ ] 熱門讀取資料有 cache 策略
- [ ] 大量資料回傳使用 `StreamingResponse`
- [ ] 必要欄位有 DB index（特別是 WHERE / ORDER BY 用的欄位）

---

## FastAPI 重構模式（Refactoring Patterns）

### 1. 抽出 Dependency

```python
# ❌ 重複的 session 與 auth 邏輯
@app.get("/items")
async def list_items(token: str = Header(...)):
    user = decode_token(token)
    if not user:
        raise HTTPException(401)
    async with AsyncSession(engine) as session:
        ...

# ✅ 抽成 dependency
async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSession(engine) as session:
        yield session

@app.get("/items")
async def list_items(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    ...
```

### 2. Router 拆分

```python
# ❌ 一個 main.py 塞所有 endpoint
# main.py: 800 行

# ✅ 按資源拆 router
# routers/users.py
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserPublic])
async def list_users(...): ...

# main.py
app.include_router(users.router)
app.include_router(posts.router)
```

### 3. Service Layer 分離

```python
# ❌ 業務邏輯塞在 endpoint
@router.post("/orders")
async def create_order(data: OrderCreate, session = Depends(get_session)):
    # 50 行的業務邏輯混合 DB 操作、驗證、通知...
    ...

# ✅ 分離：endpoint 負責 HTTP，service 負責業務
@router.post("/orders", response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    service: OrderService = Depends(get_order_service),
):
    return await service.create(data)

# services/order_service.py
class OrderService:
    async def create(self, data: OrderCreate) -> Order:
        # 純業務邏輯，容易測試
        ...
```

### 4. 統一錯誤處理

```python
# ❌ 每個 endpoint 自己 raise HTTPException
# ✅ 自訂 exception + exception handler
class ResourceNotFound(Exception):
    def __init__(self, resource: str, id: Any):
        self.resource = resource
        self.id = id

@app.exception_handler(ResourceNotFound)
async def not_found_handler(request, exc: ResourceNotFound):
    return JSONResponse(
        status_code=404,
        content={"detail": f"{exc.resource} {exc.id} not found"},
    )
```

---

## Example Assessment

```python
# After MUTATE + KILL MUTANTS:
@app.post("/orders")
async def create_order(order: dict, session=Depends(get_session)):
    items_total = sum(item['price'] for item in order['items'])
    shipping = 0 if items_total > 50 else 5.99
    total = items_total + shipping

    # 同步寄信
    requests.post("https://email-api/send", json={"order": order})

    stmt = f"INSERT INTO orders VALUES ('{order['id']}', {total})"
    await session.execute(stmt)

    return {"total": total, "shipping": shipping}
```

### ASSESSMENT

| 等級 | 問題 | 處理 |
|------|------|------|
| 🔴 Critical | SQL injection（字串拼接） | 改用 ORM / 參數化 |
| 🔴 Critical | `order: dict` 缺少驗證 | 改用 Pydantic `OrderCreate` |
| 🔴 Critical | async 內呼叫 `requests`（阻塞 event loop） | 改 `httpx.AsyncClient` 或丟 `BackgroundTasks` |
| 🔴 Critical | 沒有 auth | 加 `Depends(get_current_active_user)` |
| 🟡 High | Magic numbers `50`, `5.99` | 抽成 `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FEE` |
| 🟡 High | 缺少 `response_model` | 加 `OrderResponse` |
| 🟢 Nice | 業務邏輯可抽到 `OrderService` | 之後再拆 |

---

## Speculative Code is a TDD Violation

如果程式碼不是由失敗測試驅動產生的，就不要寫。

**核心原則**：每一行程式碼都必須有一個要求它存在的測試。

❌ **Speculative code 範例：**
- 「以防萬一」的邏輯
- 還沒用到的功能
- 為了「未來彈性」而寫的程式碼
- 沒有測試的錯誤處理路徑
- 未被使用的 Pydantic 欄位

✅ **正確做法**：刪除 speculative code。如果真的需要該行為，先寫失敗測試。

```python
# ❌ WRONG - 沒有測試要求的錯誤處理
@router.post("/items")
async def create_item(item: ItemCreate):
    if item.name == "":  # 沒測試！而且 Pydantic 應該已經擋掉了
        raise HTTPException(400, "Empty name")
    ...

# ✅ CORRECT - 用 Pydantic validation 取代手刻檢查
class ItemCreate(BaseModel):
    name: str = Field(min_length=1)
```

---

## When NOT to Refactor

不要重構的情境：

- ❌ 程式碼運作正常（沒有 bug）
- ❌ 沒有測試要求這個改動（speculative refactoring）
- ❌ 會改變行為（那是 feature，不是 refactor）
- ❌ Premature optimization（沒有 profiling 數據支持）
- ❌ 程式碼對當前階段「夠好」
- ❌ **單純為了可測試性而抽出** — 如果抽出檔案的唯一理由是「這樣才能 unit test」，請保持 inline。呼叫端的 function 已有行為測試覆蓋。抽出的合理理由是 readability、DRY（相同知識用在多處）、separation of concerns，但不是「為了測試」。

**注意**：Refactoring 應該改善程式碼結構，但不改變行為。

---

## Commit Messages for Refactoring

```
refactor: extract OrderService from order endpoints
refactor: replace dict input with Pydantic OrderCreate
refactor: split users router from main.py
security: fix SQL injection in order creation
security: add auth dependency to admin endpoints
perf: eager-load author relation in posts list
perf: move email sending to BackgroundTasks
```

**Format**：
- `refactor: <做了什麼>` — 純結構改善
- `security: <做了什麼>` — 安全性修復
- `perf: <做了什麼>` — 效能改善

**注意**：Refactoring / security / perf commit 不要與 feature commit 混在一起。

---

## 整合 Checklist

### Refactoring Checklist
- [ ] 所有測試不修改即通過
- [ ] 沒有新增公開 API
- [ ] 程式碼比之前更易讀
- [ ] 與 feature 分開 commit
- [ ] 重構前先 commit（安全網）
- [ ] 沒有 speculative code
- [ ] 行為未改變（測試證明）

### Security Checklist
- [ ] 所有輸入透過 Pydantic 驗證且 `extra="forbid"`
- [ ] DB 操作使用 ORM / 參數化
- [ ] 非公開 endpoint 強制 auth dependency
- [ ] Secrets 透過環境變數 / `Settings`
- [ ] 密碼用 bcrypt / argon2
- [ ] 回傳明確指定 `response_model`
- [ ] CORS 設定具體 domain
- [ ] Auth endpoint 有 rate limiting

### Performance Checklist
- [ ] async function 內沒有同步 I/O
- [ ] Relation 查詢用 `selectinload` / `joinedload`
- [ ] 列表 endpoint 有 pagination 上限
- [ ] DB pool 設定完整
- [ ] 耗時工作丟 `BackgroundTasks` / queue
- [ ] 熱門資料有 cache
- [ ] 大檔案用 `StreamingResponse`
- [ ] 查詢欄位有 index

---

## 建議搭配工具

- **靜態分析**：`ruff`、`mypy`、`bandit`（安全掃描）
- **依賴漏洞**：`pip-audit`、`safety`
- **負載測試**：`locust`、`k6`
- **Profiling**：`py-spy`、`scalene`
- **DB 查詢分析**：SQLAlchemy `echo=True`、`EXPLAIN ANALYZE`
- **APM**：Sentry、OpenTelemetry、Datadog
