from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)

    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)

    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    qr_token = Column(String, unique=True, nullable=False, index=True)
    qr_expires_at = Column(DateTime, nullable=False)

    status = Column(String, default="active", nullable=False)

    class_ = relationship("Class", back_populates="attendance_sessions")

    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="session"
    )


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("attendance_sessions.id"),
        nullable=False
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    status = Column(String, nullable=False)

    marked_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "student_id",
            name="uq_attendance_session_student"
        ),
    )

    session = relationship(
        "AttendanceSession",
        back_populates="attendance_records"
    )

    student = relationship(
        "Student",
        back_populates="attendance_records"
    )


    from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.class_model import Class
from models.attendance import AttendanceSession
from schemas.attendance_schema import (
    AttendanceSessionCreate,
    AttendanceSessionResponse
)


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


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

    # Session starts now
    start_time = datetime.utcnow()

    # Temporary session duration
    end_time = start_time + timedelta(hours=1)

    # QR will expire after 5 minutes
    qr_expires_at = start_time + timedelta(minutes=5)

    # Generate unique QR token
    qr_token = secrets.token_urlsafe(32)

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