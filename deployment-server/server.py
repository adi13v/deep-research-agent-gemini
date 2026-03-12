from starlette.responses import JSONResponse
import asyncio.base_subprocess
from fastapi import FastAPI
import uvicorn
import subprocess

app = FastAPI(title="Deployment Server")


@app.post("/check-and-deploy")
def check_and_deploy():

    print("-------------DEPLOYING------------- ")
    result = subprocess.run(["./scripts/deploy.sh"], )

    if result.returncode == 0:
        return {"status": "success"}
    else:
        return JSONResponse(content={"status": "failure"}, status_code=500)


@app.get("/health")
def health():
    return {"status": "ok and ready to deeeeploy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005, reload=True)
