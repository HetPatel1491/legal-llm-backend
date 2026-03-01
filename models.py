from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    google_id = Column(String, nullable=True, unique=True)
    
    def __repr__(self):
        return f"<User {self.email}>"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String)
    
    def __repr__(self):
        return f"<Conversation {self.id}>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String, index=True)
    user_id = Column(Integer, index=True)
    question = Column(String)
    answer = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Message {self.id}>"