from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)

    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)

    class_ = relationship(
        "Class",
        back_populates="students"
    )

    attendance_records = relationship(
        "AttendanceRecord",
        back_populates="student"
    )