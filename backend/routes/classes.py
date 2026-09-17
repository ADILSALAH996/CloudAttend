from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.class_model import Class
from models.student import Student
from schemas.class_schema import ClassCreate, ClassResponse


router = APIRouter(
    prefix="/classes",
    tags=["Classes"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ClassResponse)
def create_class(
    class_data: ClassCreate,
    db: Session = Depends(get_db)
):
    new_class = Class(
        name=class_data.name,
        subject=class_data.subject,
        teacher_id=class_data.teacher_id,
        day_of_week=class_data.day_of_week,
        start_time=class_data.start_time,
        end_time=class_data.end_time
    )

    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return new_class


@router.get("/", response_model=list[ClassResponse])
def get_classes(
    teacher_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Class)

    if teacher_id is not None:
        query = query.filter(Class.teacher_id == teacher_id)

    return query.all()


@router.get("/student/{student_id}", response_model=ClassResponse)
def get_student_class(
    student_id: str,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.student_id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    student_class = db.query(Class).filter(
        Class.id == student.class_id

    ).first()

    if not student_class:
        raise HTTPException(
            status_code=404,
            detail="Class not found"
        )

    return student_class


@router.get("/{class_id}/students")
def get_class_students(
    class_id: int,
    db: Session = Depends(get_db)
):
    students = db.query(Student).filter(
        Student.class_id == class_id
    ).order_by(Student.name.asc()).all()

    return [
        {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email
        }
        for student in students
    ]