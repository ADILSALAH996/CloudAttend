from datetime import datetime

from pydantic import BaseModel


class AttendanceSessionCreate(BaseModel):
    class_id: int


class AttendanceSessionResponse(BaseModel):
    id: int
    class_id: int
    start_time: datetime
    end_time: datetime
    qr_token: str
    qr_expires_at: datetime
    status: str

    class Config:
        from_attributes = True

class AttendanceMark(BaseModel):
    student_id: str
    qr_token: str