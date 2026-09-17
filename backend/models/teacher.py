from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(
        String,
        nullable=False
    )

    # ========================================
    # M7.4.3A - FACULTY LINK
    # ========================================

    faculty_id = Column(
        Integer,
        ForeignKey("faculty.id"),
        nullable=True
    )

    classes = relationship(
        "Class",
        back_populates="teacher"
    )