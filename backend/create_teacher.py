from pwdlib import PasswordHash

from database import SessionLocal
from models.teacher import Teacher


password_hash = PasswordHash.recommended()


db = SessionLocal()

try:
    teacher = Teacher(
        name="Demo Teacher",
        email="teacher@example.com",
        password=password_hash.hash("password123")
    )

    db.add(teacher)
    db.commit()

    print("Teacher created successfully!")

except Exception as error:
    db.rollback()
    print("Error:", error)

finally:
    db.close()