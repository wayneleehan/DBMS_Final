"""網站風險評分服務(SCRUM-24 風險評分演算法的接口)。

    這個檔案是**佔位**,真正的評分邏輯之後由負責的同學實作。
    目前先回傳一組保守預設值,讓 /report API 能端對端跑通。

============================================================
給之後接手的人:
============================================================

- 實作 `score_url(url)` 這一個函式,**簽名不要變**:
    def score_url(url: str) -> tuple[str, float]
    回傳一個 tuple:(status, risk_score)
    - status: 'Safe' / 'Low_Risk' / 'Warning' / 'Blocked' 之一 (對應 WEBSITE.Status 的 ENUM)
    - risk_score: 0.0 ~ 100.0 的浮點數

- 如果評分過程很慢(例如要打外部 API),
之後可以把這個函式改成 async,並把 /report 的 service 也一起改 async。
"""

from __future__ import annotations


def score_url(url: str) -> tuple[str, float]:
    """對 URL 評分,回傳 (status, risk_score)。
    
        目前是 placeholder,讓 /report 端對端能跑。
        
    """
    # placeholder 預設:中立偏低,後續演算法接上後此處替換
    default_status = "Low_Risk"
    default_risk_score = 10.0
    return default_status, default_risk_score
