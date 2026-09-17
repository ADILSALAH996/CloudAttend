from datetime import time

from pydantic import BaseModel


class ClassCreate(BaseModel):
    name: str
    subject: str
    teacher_id: int
    day_of_week: str
    start_time: time
    end_time: time


class ClassResponse(BaseModel):
    id: int
    name: str
    subject: str
    teacher_id: int
    day_of_week: str
    start_time: time
    end_time: time

    class Config:
        from_attributes = True