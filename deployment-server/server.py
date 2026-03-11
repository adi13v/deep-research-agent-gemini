import asyncio.base_subprocess
from fastapi import FastAPI
import uvicorn
import subprocess

app = FastAPI(title="Deployment Server")


@app.post("/check-and-deploy")
def check_and_deploy():

    print("-------------DEPLOYING------------- ")
    subprocess.run(["./scripts/deploy.sh"])


@app.get("/health")
def health():
    return {"status": "ok and ready to dihploy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
