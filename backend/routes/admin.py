from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from pwdlib import PasswordHash

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

password_hash = PasswordHash.recommended()


# ========================================
# DATABASE DEPENDENCY
# ========================================

def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()


class AdminStudentCreate(BaseModel):

    student_id: str
    name: str
    email: str
    password: str
    class_id: int
    batch_id: int


class AdminStudentStatusUpdate(BaseModel):

    is_active: bool


class AdminTeacherCreate(BaseModel):

    name: str
    email: str
    password: str
    faculty_id: int


class AdminTeacherStatusUpdate(BaseModel):

    is_active: bool


class AdminFacultyCreate(BaseModel):

    name: str
    email: str | None = None


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
            f.name AS faculty_name,
            t.is_active
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
                row["faculty_name"],

            "is_active":
                row["is_active"]

        })


    return teachers


# ========================================
# M9.7.1 - CREATE TEACHER
# ========================================

@router.post("/teachers", status_code=201)
def create_admin_teacher(
    teacher_data: AdminTeacherCreate,
    db: Session = Depends(get_db)
):

    existing_teacher = (
        db.query(Teacher)
        .filter(Teacher.email == teacher_data.email)
        .first()
    )

    if existing_teacher:
        raise HTTPException(
            status_code=409,
            detail="Teacher email already exists"
        )

    faculty = (
        db.query(Faculty)
        .filter(Faculty.id == teacher_data.faculty_id)
        .first()
    )

    if not faculty:
        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )

    new_teacher = Teacher(
        name=teacher_data.name,
        email=teacher_data.email,
        password=password_hash.hash(teacher_data.password),
        faculty_id=teacher_data.faculty_id,
        is_active=True
    )

    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    return {
        "message": "Teacher created successfully",
        "id": new_teacher.id,
        "name": new_teacher.name,
        "email": new_teacher.email,
        "faculty_id": new_teacher.faculty_id,
        "is_active": new_teacher.is_active
    }


# ========================================
# M9.7.2 - UPDATE TEACHER STATUS
# ========================================

@router.patch("/teachers/{teacher_id}/status")
def update_admin_teacher_status(
    teacher_id: int,
    status_data: AdminTeacherStatusUpdate,
    db: Session = Depends(get_db)
):

    teacher = (
        db.query(Teacher)
        .filter(Teacher.id == teacher_id)
        .first()
    )

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail="Teacher not found"
        )

    teacher.is_active = status_data.is_active

    db.commit()
    db.refresh(teacher)

    return {
        "message": "Teacher status updated",
        "teacher_id": teacher.id,
        "is_active": teacher.is_active
    }


# ========================================
# M9.7.3 - ADMIN FACULTIES
# ========================================

@router.get("/faculties")
def get_admin_faculties(
    db: Session = Depends(get_db)
):

    faculties = (
        db.query(Faculty)
        .order_by(Faculty.name)
        .all()
    )

    return [

        {
            "id": faculty.id,
            "name": faculty.name,
            "email": faculty.email
        }

        for faculty in faculties

    ]


# ========================================
# M9.7.4 - CREATE FACULTY
# ========================================

@router.post("/faculties", status_code=201)
def create_admin_faculty(
    faculty_data: AdminFacultyCreate,
    db: Session = Depends(get_db)
):

    name = faculty_data.name.strip()


    if not name:

        raise HTTPException(
            status_code=400,
            detail="Faculty name is required"
        )


    existing = (
        db.query(Faculty)
        .filter(
            Faculty.name.ilike(name)
        )
        .first()
    )


    if existing:

        raise HTTPException(
            status_code=409,
            detail="Faculty already exists"
        )


    new_faculty = Faculty(

        name=name,

        email=(
            faculty_data.email.strip()
            if faculty_data.email
            else None
        )

    )


    db.add(new_faculty)

    db.commit()

    db.refresh(new_faculty)


    return {

        "message":
            "Faculty created successfully",

        "id":
            new_faculty.id,

        "name":
            new_faculty.name,

        "email":
            new_faculty.email

    }


# ========================================
# M9.7.5 - DELETE FACULTY
# ========================================

@router.delete("/faculties/{faculty_id}")
def delete_admin_faculty(
    faculty_id: int,
    db: Session = Depends(get_db)
):

    faculty = (
        db.query(Faculty)
        .filter(
            Faculty.id == faculty_id
        )
        .first()
    )


    if not faculty:

        raise HTTPException(
            status_code=404,
            detail="Faculty not found"
        )


    teacher_count = (
        db.query(Teacher)
        .filter(
            Teacher.faculty_id == faculty_id
        )
        .count()
    )


    schedule_count = (
        db.query(ClassSchedule)
        .filter(
            ClassSchedule.faculty_id == faculty_id
        )
        .count()
    )


    if (
        teacher_count > 0
        or schedule_count > 0
    ):

        raise HTTPException(
            status_code=409,
            detail=(
                "Faculty cannot be deleted because it is "
                "still assigned to teachers or timetable schedules."
            )
        )


    db.delete(faculty)

    db.commit()


    return {

        "message":
            "Faculty deleted successfully",

        "faculty_id":
            faculty_id

    }


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
            Class,
            Batch
        )
        .join(
            Class,
            Student.class_id == Class.id
        )
        .outerjoin(
            Batch,
            Student.batch_id == Batch.id
        )
        .order_by(
            Student.name
        )
        .all()
    )


    result = []


    for student, class_item, batch_item in students:

        result.append({

            "id":
                student.id,

            "student_id":
                student.student_id,

            "name":
                student.name,

            "email":
                student.email,

            "class_id":
                student.class_id,

            "class_name":
                class_item.name,

            "batch_id":
                student.batch_id,

            "batch_name":
                batch_item.name
                if batch_item
                else None,

            "is_active":
                student.is_active

        })


    return result


# ========================================
# M9.9.1 - CREATE STUDENT
# ========================================

@router.post("/students", status_code=201)
def create_admin_student(
    student_data: AdminStudentCreate,
    db: Session = Depends(get_db)
):

    existing_student = (
        db.query(Student)
        .filter(
            Student.student_id ==
            student_data.student_id
        )
        .first()
    )

    if existing_student:

        raise HTTPException(
            status_code=409,
            detail="Student ID already exists"
        )


    existing_email = (
        db.query(Student)
        .filter(
            Student.email ==
            student_data.email
        )
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=409,
            detail="Student email already exists"
        )


    class_item = (
        db.query(Class)
        .filter(
            Class.id ==
            student_data.class_id
        )
        .first()
    )

    if not class_item:

        raise HTTPException(
            status_code=404,
            detail="Class not found"
        )


    batch = (
        db.query(Batch)
        .filter(
            Batch.id ==
            student_data.batch_id
        )
        .first()
    )

    if not batch:

        raise HTTPException(
            status_code=404,
            detail="Batch not found"
        )


    new_student = Student(

        student_id =
            student_data.student_id,

        name =
            student_data.name,

        email =
            student_data.email,

        password =
            password_hash.hash(
                student_data.password
            ),

        class_id =
            student_data.class_id,

        batch_id =
            student_data.batch_id,

        is_active =
            True
    )


    db.add(new_student)
    db.commit()
    db.refresh(new_student)


    return {

        "message":
            "Student created successfully",

        "id":
            new_student.id,

        "student_id":
            new_student.student_id,

        "name":
            new_student.name,

        "email":
            new_student.email,

        "class_id":
            new_student.class_id,

        "batch_id":
            new_student.batch_id,

        "is_active":
            new_student.is_active

    }


# ========================================
# M9.9.2 - UPDATE STUDENT STATUS
# ========================================

@router.patch("/students/{student_id}/status")
def update_admin_student_status(
    student_id: str,
    status_data: AdminStudentStatusUpdate,
    db: Session = Depends(get_db)
):

    student = (
        db.query(Student)
        .filter(
            Student.student_id ==
            student_id
        )
        .first()
    )


    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )


    student.is_active = status_data.is_active


    db.commit()
    db.refresh(student)


    return {

        "message":
            "Student status updated",

        "student_id":
            student.student_id,

        "is_active":
            student.is_active

    }


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