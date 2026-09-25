from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import SessionLocal
from models import (
    Teacher,
    Student,
    Class,
    AttendanceSession,
    AttendanceRecord
)

from models.batch import Batch
from models.subject import Subject
from models.faculty import Faculty
from models.class_schedule import ClassSchedule


# ========================================
# M9.4 - ADMIN ROUTES
# ========================================

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ========================================
# DATABASE DEPENDENCY
# ========================================

def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()


# ========================================
# ADMIN OVERVIEW
# ========================================

@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db)
):

    total_students = (
        db.query(Student).count()
    )


    total_teachers = (
        db.query(Teacher).count()
    )


    total_classes = (
        db.query(Class).count()
    )


    total_batches = (
        db.query(Batch).count()
    )


    total_subjects = (
        db.query(Subject).count()
    )


    total_schedules = (
        db.query(ClassSchedule).count()
    )


    total_attendance_sessions = (
        db.query(AttendanceSession).count()
    )


    active_attendance_sessions = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.status == "active",
            AttendanceSession.end_time >
            datetime.utcnow()
        )
        .count()
    )


    return {

        "total_students":
            total_students,

        "total_teachers":
            total_teachers,

        "total_classes":
            total_classes,

        "total_batches":
            total_batches,

        "total_subjects":
            total_subjects,

        "total_schedules":
            total_schedules,

        "total_attendance_sessions":
            total_attendance_sessions,

        "active_attendance_sessions":
            active_attendance_sessions

    }


# ========================================
# M9.6 - ADMIN TEACHERS
# ========================================

@router.get("/teachers")
def get_admin_teachers(
    db: Session = Depends(get_db)
):

    query = """
        SELECT
            t.id,
            t.name,
            t.email,
            t.faculty_id,
            f.name AS faculty_name
        FROM teachers t
        LEFT JOIN faculty f
            ON t.faculty_id = f.id
        ORDER BY t.name;
    """


    results = db.execute(
        text(query)
    ).mappings().all()


    teachers = []


    for row in results:

        teachers.append({

            "id": row["id"],

            "name": row["name"],

            "email": row["email"],

            "faculty_id":
                row["faculty_id"],

            "faculty":
                row["faculty_name"]

        })


    return teachers


# ========================================
# M9.8 - ADMIN STUDENTS
# ========================================

@router.get("/students")
def get_admin_students(
    db: Session = Depends(get_db)
):

    students = (
        db.query(
            Student,
            Class
        )
        .join(
            Class,
            Student.class_id == Class.id
        )
        .order_by(
            Student.name
        )
        .all()
    )


    result = []


    for student, class_item in students:

        result.append({

            "id": student.id,

            "student_id":
                student.student_id,

            "name":
                student.name,

            "email":
                student.email,

            "class_id":
                student.class_id,

            "class_name":
                class_item.name

        })


    return result 


# ========================================
# M9.10 - ADMIN BATCHES
# ========================================

@router.get("/batches")
def get_admin_batches(
    db: Session = Depends(get_db)
):

    batches = (
        db.query(Batch)
        .order_by(Batch.id)
        .all()
    )


    result = []


    for batch in batches:

        result.append({

            "id": batch.id,

            "name": batch.name

        })


    return result


# ========================================
# M9.12 - ADMIN CLASSES
# ========================================

@router.get("/classes")
def get_admin_classes(
    db: Session = Depends(get_db)
):

    classes = (
        db.query(
            Class,
            Teacher
        )
        .join(
            Teacher,
            Class.teacher_id == Teacher.id
        )
        .order_by(
            Class.id
        )
        .all()
    )


    result = []


    for class_item, teacher in classes:

        student_count = (
            db.query(Student)
            .filter(
                Student.class_id ==
                class_item.id
            )
            .count()
        )


        result.append({

            "id":
                class_item.id,

            "name":
                class_item.name,

            "subject":
                class_item.subject,

            "teacher_id":
                class_item.teacher_id,

            "teacher":
                teacher.name,

            "student_count":
                student_count

        })


    return result

# ========================================
# M9.13 - ADMIN SUBJECTS
# ========================================

@router.get("/subjects")
def get_admin_subjects(
    db: Session = Depends(get_db)
):

    subjects = (
        db.query(Subject)
        .order_by(Subject.id)
        .all()
    )


    return [

        {
            "id": subject.id,
            "name": subject.name
        }

        for subject in subjects

    ]


# ========================================
# M9.14 - ADMIN TIMETABLE
# ========================================

@router.get("/timetable")
def get_admin_timetable(
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
            ClassSchedule.batch_id ==
            Batch.id
        )
        .join(
            Subject,
            ClassSchedule.subject_id ==
            Subject.id
        )
        .outerjoin(
            Faculty,
            ClassSchedule.faculty_id ==
            Faculty.id
        )
        .order_by(
            ClassSchedule.day_of_week,
            ClassSchedule.start_time
        )
        .all()
    )


    result = []


    for schedule, batch, subject, faculty in schedules:

        result.append({

            "id":
                schedule.id,

            "class_id":
                schedule.class_id,

            "day_of_week":
                schedule.day_of_week,

            "start_time":
                schedule.start_time,

            "end_time":
                schedule.end_time,

            "batch":
                batch.name,

            "subject":
                subject.name,

            "faculty":
                faculty.name
                if faculty
                else None,

            "room":
                schedule.room,

            "schedule_type":
                schedule.schedule_type

        })


    return result


# ========================================
# M9.15 - ADMIN ATTENDANCE
# ========================================

@router.get("/attendance")
def get_admin_attendance(
    db: Session = Depends(get_db)
):

    sessions = (
        db.query(
            AttendanceSession,
            Class
        )
        .join(
            Class,
            AttendanceSession.class_id ==
            Class.id
        )
        .order_by(
            AttendanceSession.start_time.desc()
        )
        .limit(50)
        .all()
    )


    result = []


    for session, class_item in sessions:

        total_students = (
            db.query(Student)
            .filter(
                Student.class_id ==
                session.class_id
            )
            .count()
        )


        present_count = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id ==
                session.id,
                AttendanceRecord.status ==
                "present"
            )
            .count()
        )


        percentage = 0


        if total_students > 0:

            percentage = round(
                (
                    present_count /
                    total_students
                ) * 100,
                1
            )


        result.append({

            "session_id":
                session.id,

            "class_id":
                session.class_id,

            "class_name":
                class_item.name,

            "subject":
                class_item.subject,

            "start_time":
                session.start_time,

            "end_time":
                session.end_time,

            "status":
                session.status,

            "present":
                present_count,

            "total_students":
                total_students,

            "attendance_percentage":
                percentage

        })


    return result


# ========================================
# M9.16 - ADMIN REPORTS
# ========================================

@router.get("/reports")
def get_admin_reports(
    db: Session = Depends(get_db)
):

    classes = (
        db.query(Class)
        .order_by(Class.id)
        .all()
    )


    reports = []


    for class_item in classes:

        total_sessions = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.class_id ==
                class_item.id
            )
            .count()
        )


        total_students = (
            db.query(Student)
            .filter(
                Student.class_id ==
                class_item.id
            )
            .count()
        )


        present_records = (
            db.query(AttendanceRecord)
            .join(
                AttendanceSession,
                AttendanceRecord.session_id ==
                AttendanceSession.id
            )
            .filter(
                AttendanceSession.class_id ==
                class_item.id,
                AttendanceRecord.status ==
                "present"
            )
            .count()
        )


        possible_attendance = (
            total_sessions *
            total_students
        )


        attendance_percentage = 0


        if possible_attendance > 0:

            attendance_percentage = round(
                (
                    present_records /
                    possible_attendance
                ) * 100,
                1
            )


        reports.append({

            "class_id":
                class_item.id,

            "class_name":
                class_item.name,

            "subject":
                class_item.subject,

            "students":
                total_students,

            "sessions":
                total_sessions,

            "present_records":
                present_records,

            "attendance_percentage":
                attendance_percentage

        })


    return reports