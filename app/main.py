from fastapi import FastAPI

app = FastAPI(title="詐騙聯防與動態風險預警系統 API")

@app.get("/")
async def root():
    return {"message": "歡迎來到防詐騙系統後端 API！"}