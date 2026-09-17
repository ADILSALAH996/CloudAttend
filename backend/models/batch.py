from sqlalchemy import Column, Integer, String

from database import Base

# ========================================
# M7.3.3 - BATCH MODEL
# ========================================

class Batch(Base):
    __tablename__ = "batches"

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