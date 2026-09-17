from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship

from database import Base

# ========================================
# M7.4.1 - UPDATED CLASS SCHEDULE MODEL
# ========================================

class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)

    # Keep this temporarily for existing attendance system
    class_id = Column(
        Integer,
        ForeignKey("classes.id"),
        nullable=True
    )

    # New generic timetable references
    batch_id = Column(
        Integer,
        ForeignKey("batches.id"),
        nullable=True
    )

    subject_id = Column(
        Integer,
        ForeignKey("subjects.id"),
        nullable=True
    )

    faculty_id = Column(
        Integer,
        ForeignKey("faculty.id"),
        nullable=True
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

    room = Column(
        String,
        nullable=True
    )

    schedule_type = Column(
        String,
        default="regular",
        nullable=False
    )

        # ========================================
    # EXISTING CLASS RELATIONSHIP
    # ========================================

    class_ = relationship(
        "Class",
        back_populates="schedules"
    )