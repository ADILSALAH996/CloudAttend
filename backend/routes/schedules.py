from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal

from models.class_schedule import ClassSchedule
from models.class_model import Class
from models.batch import Batch
from models.subject import Subject
from models.faculty import Faculty

from schemas.schedule_schema import (
    ScheduleCreate,
    ScheduleResponse,
    TeacherScheduleResponse,
    StudentScheduleResponse
)

# ========================================
# M7.3.6 - SCHEDULE ROUTES
# ========================================

router = APIRouter(
    prefix="/schedules",
    tags=["Schedules"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ========================================
# CREATE SCHEDULE
# ========================================

@router.post(
    "/",
    response_model=ScheduleResponse
)
def create_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db)
):

    # ========================================
    # CHECK CLASS
    # ========================================

    class_item = db.query(Class).filter(
        Class.id == schedule_data.class_id
    ).first()

    if not class_item:
        raise HTTPException(
            status_code=404,
            detail="Class not found"
        )


    # ========================================
    # CHECK BATCH
    # ========================================

    batch = db.query(Batch).filter(
        Batch.id == schedule_data.batch_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )


    # ========================================
    # CHECK SUBJECT
    # ========================================

    subject = db.query(Subject).filter(
        Subject.id == schedule_data.subject_id
    ).first()

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Subject not found"
        )


    # ========================================
    # CHECK FACULTY
    # ========================================

    faculty = db.query(Faculty).filter(
        Faculty.id == schedule_data.faculty_id
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )


    # ========================================
    # VALIDATE TIME
    # ========================================

    if schedule_data.start_time >= schedule_data.end_time:

        raise HTTPException(
            status_code=400,
            detail="Start time must be before end time"
        )


    # ========================================
    # CREATE SCHEDULE
    # ========================================

    new_schedule = ClassSchedule(

        class_id=schedule_data.class_id,

        batch_id=schedule_data.batch_id,

        subject_id=schedule_data.subject_id,

        faculty_id=schedule_data.faculty_id,

        day_of_week=schedule_data.day_of_week,

        start_time=schedule_data.start_time,

        end_time=schedule_data.end_time,

        room=schedule_data.room,

        schedule_type=schedule_data.schedule_type
    )


    db.add(new_schedule)

    db.commit()

    db.refresh(new_schedule)


    return new_schedule


# ========================================
# GET SCHEDULES BY BATCH
# ========================================

@router.get(
    "/batch/{batch_id}",
    response_model=list[ScheduleResponse]
)
def get_batch_schedule(
    batch_id: int,
    db: Session = Depends(get_db)
):

    batch = db.query(Batch).filter(
        Batch.id == batch_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )

    schedules = db.query(
        ClassSchedule
    ).filter(
        ClassSchedule.batch_id == batch_id
    ).order_by(
        ClassSchedule.day_of_week,
        ClassSchedule.start_time
    ).all()

    return schedules


# ========================================
# GET ALL SCHEDULES
# ========================================

@router.get(
    "/",
    response_model=list[ScheduleResponse]
)
def get_schedules(
    db: Session = Depends(get_db)
):

    return db.query(
        ClassSchedule
    ).order_by(
        ClassSchedule.day_of_week,
        ClassSchedule.start_time
    ).all()


# ========================================
# M7.4.2 - GET SCHEDULES BY FACULTY
# ========================================

@router.get(
    "/faculty/{faculty_id}",
    response_model=list[TeacherScheduleResponse]
)
def get_faculty_schedule(
    faculty_id: int,
    db: Session = Depends(get_db)
):

    faculty = db.query(Faculty).filter(
        Faculty.id == faculty_id
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    schedules = (
        db.query(
            ClassSchedule,
            Batch,
            Subject
        )
        .join(
            Batch,
            ClassSchedule.batch_id == Batch.id
        )
        .join(
            Subject,
            ClassSchedule.subject_id == Subject.id
        )
        .filter(
            ClassSchedule.faculty_id == faculty_id
        )
        .order_by(
            ClassSchedule.day_of_week,
            ClassSchedule.start_time
        )
        .all()
    )

    timetable = []

    for schedule, batch, subject in schedules:

            timetable.append({
            "id": schedule.id,
            "class_id": schedule.class_id,
            "day_of_week": schedule.day_of_week,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "batch": batch.name,
            "subject": subject.name,
            "faculty": faculty.name,
            "room": schedule.room,
            "schedule_type": schedule.schedule_type
        })

    return timetable


# ========================================
# M7.5.2 - GET STUDENT SCHEDULE
# ========================================

@router.get(
    "/class/{class_id}",
    response_model=list[StudentScheduleResponse]
)
def get_class_schedule(
    class_id: int,
    db: Session = Depends(get_db)
):

    schedules = (
        db.query(
            ClassSchedule,
            Batch,
            Subject,
            Faculty
        )
        .join(
            Batch,
            ClassSchedule.batch_id == Batch.id
        )
        .join(
            Subject,
            ClassSchedule.subject_id == Subject.id
        )
        .outerjoin(
            Faculty,
            ClassSchedule.faculty_id == Faculty.id
        )
        .filter(
            ClassSchedule.class_id == class_id
        )
        .order_by(
            ClassSchedule.day_of_week,
            ClassSchedule.start_time
        )
        .all()
    )

    timetable = []

    for schedule, batch, subject, faculty in schedules:

        timetable.append({
            "id": schedule.id,
            "class_id": schedule.class_id,
            "day_of_week": schedule.day_of_week,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "batch": batch.name,
            "subject": subject.name,
            "faculty": faculty.name if faculty else None,
            "room": schedule.room,
            "schedule_type": schedule.schedule_type
        })

    return timetable