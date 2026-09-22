from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal

from models.class_model import Class
from models.student import Student
from models.attendance import AttendanceSession
from models.attendance import AttendanceRecord

from schemas.attendance_schema import (
    AttendanceSessionCreate,
    AttendanceSessionResponse,
    AttendanceMark
)


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


# ========================================
# DATABASE SESSION
# ========================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ========================================
# CREATE ATTENDANCE SESSION
# ========================================

@router.post(
    "/sessions",
    response_model=AttendanceSessionResponse
)
def create_attendance_session(
    session_data: AttendanceSessionCreate,
    db: Session = Depends(get_db)
):

    # Check that the class exists
    class_item = db.query(Class).filter(
        Class.id == session_data.class_id
    ).first()

    if not class_item:

        raise HTTPException(
            status_code=404,
            detail="Class not found"
        )


    # Prevent multiple active sessions
    # for the same class.

    existing_session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.class_id == session_data.class_id,
        AttendanceSession.status == "active",
        AttendanceSession.end_time > datetime.utcnow()
    ).first()


    if existing_session:

        raise HTTPException(
            status_code=409,
            detail="An attendance session is already active for this class"
        )


    # ========================================
    # SESSION TIME
    # ========================================

    start_time = datetime.utcnow()

    end_time = (
        start_time +
        timedelta(hours=1)
    )


    # QR expires after 10 minutes
    qr_expires_at = (
        start_time +
        timedelta(minutes=10)
    )


    # Generate secure random QR token
    qr_token = secrets.token_urlsafe(32)


    # ========================================
    # CREATE SESSION
    # ========================================

    new_session = AttendanceSession(
        class_id=session_data.class_id,
        start_time=start_time,
        end_time=end_time,
        qr_token=qr_token,
        qr_expires_at=qr_expires_at,
        status="active"
    )


    db.add(new_session)
    db.commit()
    db.refresh(new_session)


    return new_session


# ========================================
# STOP ATTENDANCE SESSION
# ========================================

@router.post(
    "/sessions/{session_id}/stop",
    response_model=AttendanceSessionResponse
)
def stop_attendance_session(
    session_id: int,
    db: Session = Depends(get_db)
):

    attendance_session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.id == session_id
    ).first()


    if not attendance_session:

        raise HTTPException(
            status_code=404,
            detail="Attendance session not found"
        )


    if attendance_session.status != "active":

        raise HTTPException(
            status_code=400,
            detail="Attendance session is already stopped"
        )


    # Stop the session
    attendance_session.status = "stopped"


    # Immediately invalidate the QR
    attendance_session.qr_expires_at = datetime.utcnow()


    db.commit()
    db.refresh(attendance_session)


    return attendance_session


# ========================================
# GET ACTIVE ATTENDANCE SESSION
# ========================================

@router.get(
    "/sessions/active/{class_id}",
    response_model=AttendanceSessionResponse
)
def get_active_attendance_session(
    class_id: int,
    db: Session = Depends(get_db)
):

    active_session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.status == "active",
        AttendanceSession.end_time > datetime.utcnow()
    ).first()


    if not active_session:

        raise HTTPException(
            status_code=404,
            detail="No active attendance session"
        )


    return active_session




# ========================================
# M8.3 - GET TEACHER ATTENDANCE SESSIONS
# ========================================

@router.get(
    "/teacher/{teacher_id}"
)
def get_teacher_attendance_sessions(
    teacher_id: int,
    db: Session = Depends(get_db)
):

    sessions = (
        db.query(
            AttendanceSession,
            Class
        )
        .join(
            Class,
            AttendanceSession.class_id == Class.id
        )
        .filter(
            Class.teacher_id == teacher_id
        )
        .order_by(
            AttendanceSession.start_time.desc()
        )
        .limit(5)
        .all()
    )


    session_history = []


    for session, class_item in sessions:

        total_students = db.query(
            Student
        ).filter(
            Student.class_id == session.class_id
        ).count()


        present_count = db.query(
            AttendanceRecord
        ).filter(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.status == "present"
        ).count()


        session_history.append({

            "session_id":
                session.id,

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

            "present_count":
                present_count,

            "total_students":
                total_students
        })


    return session_history



# ========================================
# MARK ATTENDANCE
# ========================================

@router.post("/mark")
def mark_attendance(
    attendance_data: AttendanceMark,
    db: Session = Depends(get_db)
):

    # ========================================
    # FIND STUDENT
    # ========================================

    student = db.query(Student).filter(
        Student.student_id ==
        attendance_data.student_id
    ).first()


    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )


    # ========================================
    # FIND SESSION USING QR TOKEN
    # ========================================

    attendance_session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.qr_token ==
        attendance_data.qr_token
    ).first()


    if not attendance_session:

        raise HTTPException(
            status_code=404,
            detail="Invalid QR code"
        )


    # ========================================
    # CHECK QR EXPIRY
    # ========================================

    if datetime.utcnow() > attendance_session.qr_expires_at:

        raise HTTPException(
            status_code=400,
            detail="QR code has expired"
        )


    # ========================================
    # CHECK SESSION STATUS
    # ========================================

    if attendance_session.status != "active":

        raise HTTPException(
            status_code=400,
            detail="Attendance session is no longer active"
        )


    # ========================================
    # CHECK CLASS ENROLLMENT
    # ========================================

    if student.class_id != attendance_session.class_id:

        raise HTTPException(
            status_code=403,
            detail="You are not enrolled in this class"
        )


    # ========================================
    # PREVENT DUPLICATE ATTENDANCE
    # ========================================

    existing_record = db.query(
        AttendanceRecord
    ).filter(
        AttendanceRecord.session_id ==
        attendance_session.id,

        AttendanceRecord.student_id ==
        student.id
    ).first()


    if existing_record:

        raise HTTPException(
            status_code=409,
            detail="Attendance already marked"
        )


    # ========================================
    # CREATE ATTENDANCE RECORD
    # ========================================

    new_record = AttendanceRecord(
        session_id=attendance_session.id,
        student_id=student.id,
        status="present",
        marked_at=datetime.utcnow()
    )


    db.add(new_record)
    db.commit()
    db.refresh(new_record)


    return {
        "message": "Attendance marked successfully",
        "student_id": student.student_id,
        "status": new_record.status,
        "marked_at": new_record.marked_at
    }


# ========================================
# M6.14 - GET STUDENT ATTENDANCE SUMMARY
# ========================================

@router.get("/student/{student_id}/summary")
def get_student_attendance_summary(
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

    # A session counts for the student's attendance only
    # when it belongs to the student's enrolled class and
    # has finished or has been explicitly stopped.
    now = datetime.utcnow()

    completed_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == student.class_id,
        (
            (AttendanceSession.status == "stopped") |
            (AttendanceSession.end_time <= now)
        )
    ).all()

    completed_session_ids = [
        session.id for session in completed_sessions
    ]

    present_count = 0

    if completed_session_ids:
        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.session_id.in_(completed_session_ids),
            AttendanceRecord.status == "present"
        ).count()

    total_sessions = len(completed_sessions)
    absent_count = max(total_sessions - present_count, 0)
    percentage = (
        round((present_count / total_sessions) * 100, 1)
        if total_sessions > 0
        else 0
    )

    return {
        "class_count": 1,
        "total_sessions": total_sessions,
        "present": present_count,
        "absent": absent_count,
        "percentage": percentage
    }


# ========================================
# M6.11 - GET STUDENT ATTENDANCE
# ========================================

@router.get(
    "/student/{student_id}"
)
def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db)
):

    # ========================================
    # FIND STUDENT
    # ========================================

    student = db.query(Student).filter(
        Student.student_id == student_id
    ).first()


    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )


    # ========================================
    # GET ATTENDANCE RECORDS
    # ========================================

    records = (
        db.query(
            AttendanceRecord,
            AttendanceSession,
            Class
        )
        .join(
            AttendanceSession,
            AttendanceRecord.session_id ==
            AttendanceSession.id
        )
        .join(
            Class,
            AttendanceSession.class_id ==
            Class.id
        )
        .filter(
            AttendanceRecord.student_id ==
            student.id
        )
        .order_by(
            AttendanceRecord.marked_at.desc()
        )
        .all()
    )


    # ========================================
    # FORMAT RESPONSE
    # ========================================

    attendance_history = []


    for record, session, class_item in records:

        attendance_history.append({
            "session_id": record.session_id,
            "class_name": class_item.name,
            "subject": class_item.subject,
            "status": record.status,
            "marked_at": record.marked_at
        })


    return attendance_history


# ========================================
# M8.3 - GET TEACHER ATTENDANCE RECORDS
# ========================================

@router.get("/teacher/{teacher_id}")
def get_teacher_attendance(
    teacher_id: int,
    db: Session = Depends(get_db)
):

    # ========================================
    # GET TEACHER'S CLASSES
    # ========================================

    classes = db.query(Class).filter(
        Class.teacher_id == teacher_id
    ).all()

    if not classes:
        return []


    class_ids = [
        class_item.id
        for class_item in classes
    ]


    # ========================================
    # GET ATTENDANCE SESSIONS
    # ========================================

    sessions = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.class_id.in_(class_ids)
    ).order_by(
        AttendanceSession.start_time.desc()
    ).all()


    attendance_reports = []


    # ========================================
    # BUILD REPORT
    # ========================================

    for session in sessions:

        class_item = db.query(Class).filter(
            Class.id == session.class_id
        ).first()


        students = db.query(Student).filter(
            Student.class_id == session.class_id
        ).order_by(
            Student.name
        ).all()


        records = db.query(
            AttendanceRecord
        ).filter(
            AttendanceRecord.session_id == session.id
        ).all()


        present_student_ids = {
            record.student_id
            for record in records
            if record.status == "present"
        }


        student_records = []


        for student in students:

            status = (
                "present"
                if student.id in present_student_ids
                else "absent"
            )


            student_records.append({
                "student_id": student.student_id,
                "name": student.name,
                "status": status
            })


        attendance_reports.append({

            "session_id": session.id,

            "class_id": session.class_id,

            "class_name": class_item.name,

            "subject": class_item.subject,

            "start_time": session.start_time,

            "end_time": session.end_time,

            "status": session.status,

            "students": student_records

        })


    return attendance_reports



# ========================================
# M8.4 - GET ATTENDANCE SESSION DETAILS
# ========================================

@router.get("/session/{session_id}")
def get_attendance_session_details(
    session_id: int,
    db: Session = Depends(get_db)
):

    # ========================================
    # FIND SESSION
    # ========================================

    session = db.query(
        AttendanceSession
    ).filter(
        AttendanceSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Attendance session not found"
        )


    # ========================================
    # FIND CLASS
    # ========================================

    class_item = db.query(
        Class
    ).filter(
        Class.id == session.class_id
    ).first()

    if not class_item:
        raise HTTPException(
            status_code=404,
            detail="Class not found"
        )


    # ========================================
    # GET STUDENTS
    # ========================================

    students = db.query(
        Student
    ).filter(
        Student.class_id == session.class_id
    ).order_by(
        Student.name
    ).all()


    # ========================================
    # GET ATTENDANCE RECORDS
    # ========================================

    records = db.query(
        AttendanceRecord
    ).filter(
        AttendanceRecord.session_id == session.id
    ).all()


    # ========================================
    # CREATE RECORD LOOKUP
    # ========================================

    attendance_map = {
        record.student_id: record
        for record in records
    }


    # ========================================
    # BUILD STUDENT LIST
    # ========================================

    student_list = []

    for student in students:

        record = attendance_map.get(
            student.id
        )

        if record:

            status = record.status
            marked_at = record.marked_at

        else:

            status = "absent"
            marked_at = None


        student_list.append({

            "student_id": student.student_id,

            "name": student.name,

            "status": status,

            "marked_at": marked_at

        })


    # ========================================
    # COUNTS
    # ========================================

    total_students = len(students)

    present_count = sum(
        1
        for student in student_list
        if student["status"] == "present"
    )

    absent_count = (
        total_students -
        present_count
    )


    # ========================================
    # RETURN SESSION DETAILS
    # ========================================

    return {

        "session_id": session.id,

        "class_id": session.class_id,

        "class_name": class_item.name,

        "subject": class_item.subject,

        "start_time": session.start_time,

        "end_time": session.end_time,

        "status": session.status,

        "total_students": total_students,

        "present": present_count,

        "absent": absent_count,

        "students": student_list

    }



# ========================================
# M8.4 - CLASS-WISE ATTENDANCE REPORT
# ========================================

@router.get("/class/{class_id}")
def get_class_attendance(
    class_id: int,
    db: Session = Depends(get_db)
):

    # Find class
    class_item = db.query(Class).filter(
        Class.id == class_id
    ).first()

    if not class_item:
        raise HTTPException(
            status_code=404,
            detail="Class not found"
        )

    # Get completed attendance sessions
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.status != "active"
    ).all()

    total_sessions = len(sessions)

    # Get students in this class
    students = db.query(Student).filter(
        Student.class_id == class_id
    ).all()

    student_reports = []

    for student in students:

        present_count = 0

        for session in sessions:

            record = db.query(
                AttendanceRecord
            ).filter(
                AttendanceRecord.session_id == session.id,
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == "present"
            ).first()

            if record:
                present_count += 1

        absent_count = total_sessions - present_count

        if total_sessions > 0:
            attendance_percentage = round(
                (present_count / total_sessions) * 100,
                1
            )
        else:
            attendance_percentage = 0

        student_reports.append({
            "student_id": student.student_id,
            "name": student.name,
            "present": present_count,
            "absent": absent_count,
            "attendance_percentage": attendance_percentage
        })

    return {
        "class_id": class_id,
        "class_name": class_item.name,
        "total_sessions": total_sessions,
        "students": student_reports
    }