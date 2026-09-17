from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship

from database import Base


# ========================================
# CLASS MODEL
# ========================================

class Class(Base):
    __tablename__ = "classes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    subject = Column(
        String,
        nullable=False
    )

    teacher_id = Column(
        Integer,
        ForeignKey("teachers.id"),
        nullable=False
    )

    day_of_week = Column(
        String,
        nullable=False
    )

    start_time = Column(
        Time,
        nullable=False
    )

    end_time = Column(
        Time,
        nullable=False
    )

    # ========================================
    # TEACHER RELATIONSHIP
    # ========================================

    teacher = relationship(
        "Teacher",
        back_populates="classes"
    )

    # ========================================
    # STUDENT RELATIONSHIP
    # ========================================

    students = relationship(
        "Student",
        back_populates="class_"
    )

    # ========================================
    # ATTENDANCE RELATIONSHIP
    # ========================================

    attendance_sessions = relationship(
        "AttendanceSession",
        back_populates="class_"
    )

    # ========================================
    # TIMETABLE RELATIONSHIP
    # ========================================

    schedules = relationship(
        "ClassSchedule",
        back_populates="class_"
    )