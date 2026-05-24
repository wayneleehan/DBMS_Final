# `api/v1/` — 第一版業務 API

所有業務 router 都在這層。每個檔對應一塊業務(auth、appeals、admin、users ...)。

## 檔案 ↔ Endpoint 對照

- **`auth.py`** — `/api/v1/auth/*`:`POST /login`、`POST /logout`、`GET /me`、`POST /register`。login/register 公開,`/me` 與 `/logout` 隱含需 session。
- **`users.py`** — `/api/v1/users/*`:`GET /me/reports`、`GET /me/stats`。守門 `require_user`。
- **`visits.py`** — `/api/v1/visits`:Chrome 擴充功能傳來的瀏覽紀錄,**匿名**(無守門)。
- **`reports.py`** — `/api/v1/reports`:使用者通報網址。守門 `require_user`。
- **`appeal.py`** — `/api/v1/appeals/`:`POST /`(提交申訴)。守門 `require_user`。
- **`admin_review.py`** — `/api/v1/admin/*`:`GET /queue`、`GET /queue/counts`、`POST /review`(申訴裁決)、`POST /report-verdict`(舉報裁決)。守門 `require_admin`。
- **`warnings.py`** — `/api/v1/warnings/*`:`POST /cib`、`POST /cluster`(目前無守門)。

## Endpoint 速查

```text
POST /api/v1/auth/login                登入
POST /api/v1/auth/register             註冊(直接登入)
POST /api/v1/auth/logout               登出
GET  /api/v1/auth/me                   目前登入者

GET  /api/v1/users/me/reports          我的通報紀錄
GET  /api/v1/users/me/stats            我的通報統計

POST /api/v1/visits                    擴充功能瀏覽紀錄(匿名)
POST /api/v1/reports                   使用者通報

POST /api/v1/appeals/                  提交申訴

GET  /api/v1/admin/queue               審核佇列(舉報 + 申訴)
GET  /api/v1/admin/queue/counts        佇列計數
POST /api/v1/admin/review              裁決申訴
POST /api/v1/admin/report-verdict      直接裁決舉報

POST /api/v1/warnings/cib              觸發 CIB 監控
POST /api/v1/warnings/cluster          觸發機房集群預警
```

## auth 模式

- Cookie session,簽章用 `SESSION_SECRET_KEY`(`.env`)
- 跨來源請求要帶 `credentials: 'include'`(前端 `apiFetch` 已處理)
- `require_user` / `require_admin` 守門失敗會回 401 / 403
