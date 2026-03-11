from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Deployment Server")


@app.post("/check-and-deploy")
def check_and_deploy():

    print("Checking and deploying...")
    pass


@app.get("/health")
def health():
    return {"status": "ok and ready to dihploy"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
