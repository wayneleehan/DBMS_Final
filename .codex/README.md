# `.codex/` — 本地 Codex 專案設定

這個資料夾放 Codex 可使用的專案本機設定與 skill。

## 內容

- `skills/fastapi-refactoring/SKILL.md` — FastAPI 重構、安全性與效能檢查指南。

## 與 Claude 設定的對應

- 原 `CLAUDE.md` 已轉為根目錄 `AGENTS.md`。
- 原 `.claude/skills/refactoring.md` 已轉為 `.codex/skills/fastapi-refactoring/SKILL.md`。

## Git

`.codex/` 預設視為本機協作設定,不進 git。若團隊想共享 skill,可移除 `.gitignore` 中的 `.codex/` 規則後再提交。
