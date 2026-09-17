from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from database import SessionLocal
from models.teacher import Teacher
from models.student import Student

router = APIRouter(prefix="/auth", tags=["Authentication"])

password_hash = PasswordHash.recommended()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class TeacherLogin(BaseModel):
    email: str
    password: str


class StudentLogin(BaseModel):
    student_id: str
    password: str


@router.post("/teacher/login")
def teacher_login(
    login: TeacherLogin,
    db: Session = Depends(get_db)
):
    teacher = db.query(Teacher).filter(
        Teacher.email == login.email
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not password_hash.verify(
        login.password,
        teacher.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return {
    "message": "Teacher login successful",
    "teacher_id": teacher.id,
    "name": teacher.name,
    "email": teacher.email,
    "faculty_id": teacher.faculty_id
}


@router.post("/student/login")
def student_login(
    login: StudentLogin,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.student_id == login.student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=401,
            detail="Invalid student ID or password"
        )

    if not password_hash.verify(
        login.password,
        student.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid student ID or password"
        )

    return {
        "message": "Student login successful",
        "student_id": student.student_id,
        "name": student.name,
        "email": student.email,
        "class_id": student.class_id
    }