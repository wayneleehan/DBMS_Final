# `utils/` — 通用工具

不屬於 service 或 crud 的純函式工具。目前只有評分用的爬蟲。

## 檔案

| 檔案 | 函式 | 用途 |
|------|------|------|
| `scraper.py` | `simple_scrape_content(url)`、`get_domain_age_days(url)` | 給 scoring pipeline 用:抓網頁標題/H1/H2 文字;查 WHOIS 網域註冊天數 |

## 依賴套件

- `requests`:HTTP 抓取
- `beautifulsoup4`:HTML 解析
- `python-whois`:WHOIS 查詢

三個套件已寫入 `requirements.txt`,`uv pip install -r requirements.txt` 會裝。

## 注意

- `requests.get` 有 5 秒 timeout
- WHOIS 查詢可能慢(數百 ms 到數秒),所以 scoring 是用 FastAPI `BackgroundTasks` 包起來非同步跑,不會卡 request thread
