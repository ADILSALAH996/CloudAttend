from database import SessionLocal
from models.student import Student
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

db = SessionLocal()

student = Student(
    student_id="STU001",
    name="Demo Student",
    email="student@example.com",
    password=password_hash.hash("student123"),
    class_id=1
)

db.add(student)
db.commit()
db.refresh(student)

print("Student created successfully!")
print("Student ID:", student.student_id)
print("Name:", student.name)

db.close()