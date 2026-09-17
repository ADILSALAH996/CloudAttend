from sqlalchemy import text

from database import engine


with engine.connect() as connection:
    connection.execute(text("DROP TABLE IF EXISTS classes CASCADE"))
    connection.commit()

print("Classes table removed successfully.")