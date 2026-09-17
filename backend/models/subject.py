from sqlalchemy import Column, Integer, String

from database import Base

# ========================================
# M7.3.3 - SUBJECT MODEL
# ========================================

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        unique=True,
        nullable=False
    )