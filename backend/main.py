from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine, Base
from models import (
    Teacher,
    Class,
    Student,
    AttendanceSession,
    AttendanceRecord
)

from models.batch import Batch
from models.subject import Subject
from models.faculty import Faculty

from models.class_schedule import ClassSchedule

from routes.auth import router as auth_router
from routes.classes import router as classes_router 
from routes.attendance import router as attendance_router
from routes.schedules import router as schedules_router
from models.faculty import Faculty


app = FastAPI(title="CloudAttend API")


# Register class routes
app.include_router(classes_router)
app.include_router(attendance_router)
app.include_router(schedules_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register authentication routes
app.include_router(auth_router)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "CloudAttend API is running"
    }


@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as error:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(error)
        }