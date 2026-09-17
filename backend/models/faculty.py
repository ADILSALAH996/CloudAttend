from sqlalchemy import Column, Integer, String

from database import Base


# ========================================
# FACULTY MODEL
# ========================================

class Faculty(Base):
    __tablename__ = "faculty"

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
        nullable=True
    )