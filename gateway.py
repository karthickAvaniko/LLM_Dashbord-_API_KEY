"""
This file has been updated to act as a fallback wrapper.
The entire FastAPI backend has been professionally restructured into the `backend/` directory.
"""
import uvicorn

if __name__ == "__main__":
    print("Starting refactored professional backend from backend/main.py ...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=1111, reload=True)
