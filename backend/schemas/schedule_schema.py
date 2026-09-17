from datetime import time
from pydantic import BaseModel

# ========================================
# M7.4.2 - SCHEDULE SCHEMAS
# ========================================


class ScheduleCreate(BaseModel):
    batch_id: int
    subject_id: int
    faculty_id: int | None = None
    day_of_week: str
    start_time: time
    end_time: time
    room: str | None = None
    schedule_type: str = "regular"


class ScheduleResponse(BaseModel):
    id: int

    batch_id: int
    subject_id: int
    faculty_id: int | None

    day_of_week: str
    start_time: time
    end_time: time

    room: str | None
    schedule_type: str

    class Config:
        from_attributes = True


class TeacherScheduleResponse(BaseModel):
    id: int
    class_id: int
    day_of_week: str
    start_time: time
    end_time: time

    batch: str
    subject: str
    faculty: str | None

    room: str | None
    schedule_type: str


# ========================================
# M7.5.2 - STUDENT SCHEDULE RESPONSE
# ========================================

class StudentScheduleResponse(BaseModel):
    id: int
    day_of_week: str
    start_time: time
    end_time: time
    batch: str
    subject: str
    faculty: str | None
    room: str | None
    schedule_type: str