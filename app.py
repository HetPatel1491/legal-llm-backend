from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import requests
import json
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from database import get_db, engine
from models import Base, User, Conversation, Message
from auth import (
    create_user, get_user_by_email, authenticate_user,
    create_access_token, verify_token, hash_password,
    get_or_create_google_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from datetime import timedelta, datetime

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Pydantic models for requests
class SignUpRequest(BaseModel):
    email: str
    username: str
    password: str

class SignInRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    token: str
    email: str
    name: str

class AskRequest(BaseModel):
    question: str
    format: str = "detailed"
    conversation_history: list = []

class SaveConversationRequest(BaseModel):
    conversation_id: str
    messages: list
    title: str
    user_id: int

# Auth Endpoints
@app.post("/auth/signup")
async def signup(request: SignUpRequest, db: Session = Depends(get_db)):
    """Sign up with email and password"""
    
    existing_user = get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        user = create_user(db, request.email, request.username, request.password)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        return {
            "success": True,
            "message": "User created successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@app.post("/auth/signin")
async def signin(request: SignInRequest, db: Session = Depends(get_db)):
    """Sign in with email and password"""
    
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "success": True,
        "message": "Signed in successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username
        }
    }


@app.post("/auth/google")
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Sign in/up with Google"""
    
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
        
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        email = idinfo.get('email')
        name = idinfo.get('name', 'Google User')
        google_id = idinfo.get('sub')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not found in Google token"
            )
        
        user = get_or_create_google_user(
            db,
            email=email,
            google_id=google_id,
            username=name.replace(" ", "_").lower()
        )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=access_token_expires
        )
        
        return {
            "success": True,
            "message": "Google auth successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@app.get("/ask")
async def ask_legal_question(question: str, format: str = "detailed", conversation_history: str = "[]", db: Session = Depends(get_db)):
    """Ask a legal question with conversation context"""
    
    user_question = question
    response_format = format
    
    if not user_question:
        return {"error": "No question provided", "success": False}
    
    try:
        system_prompts = {
            "detailed": """You are an expert legal assistant. ALWAYS format your answers professionally and clearly:

**Introduction:** Start with 1-2 sentences explaining the concept briefly.

**Main Definition & Explanation:** Provide 2-3 detailed paragraphs with comprehensive information.

**Types/Categories:** If applicable, list different types using bullet points (•).

**Key Elements or Features:** Use bullet points for main characteristics, requirements, or components.

**Examples:** Provide practical real-world examples in 1-2 paragraphs.

**Important Notes:** Add any important disclaimers, variations by jurisdiction, or special considerations.

Be accurate, helpful, and practical in your legal explanations.""",

            "bullets": """You are a legal assistant. Answer the question ONLY using bullet points. Each bullet should be concise and clear. Include:
- Key definition
- Main points (3-5 bullets)
- Important notes

Keep it brief and scannable.""",

            "simple": """You are a legal assistant. Answer the question in ONE paragraph only (3-4 sentences). Be concise and clear. Skip examples and detailed explanations. Just the essential information.""",

            "qa": """You are a legal assistant. Format your answer as Q&A:

Q: [Restate the user's question]

A: [Provide a clear, comprehensive answer in 2-3 paragraphs]

Keep it professional and accurate."""
        }
        
        system_prompt = system_prompts.get(response_format, system_prompts["detailed"])
        
        messages = [
            {
                "role": "system",
                "content": system_prompt
            }
        ]
        
        # Add conversation history for context
        if conversation_history and conversation_history != "[]":
            try:
                history = json.loads(conversation_history)
                # Keep last 4 messages for context
                for msg in history[-2:]:
                    if isinstance(msg, dict) and msg.get("role") and msg.get("content"):
                        messages.append({
                            "role": msg.get("role"),
                            "content": msg.get("content")
                        })
            except Exception as e:
                print(f"Error parsing conversation history: {e}")
        
        # Add current question
        messages.append({
            "role": "user",
            "content": user_question
        })
        
        def generate():
            try:
                response = requests.post(
                    GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2000,
                        "stream": True
                    },
                    stream=True,
                    timeout=30
                )
                
                if response.status_code == 200:
                    for line in response.iter_lines():
                        if line:
                            line = line.decode('utf-8')
                            if line.startswith('data: '):
                                line = line[6:]
                            if line.strip() == '[DONE]':
                                break
                            try:
                                chunk = json.loads(line)
                                if 'choices' in chunk and len(chunk['choices']) > 0:
                                    delta = chunk['choices'][0].get('delta', {})
                                    if 'content' in delta:
                                        word = delta['content']
                                        yield f"data: {json.dumps({'word': word})}\n\n"
                            except:
                                pass
                    
                    yield f"data: {json.dumps({'done': True})}\n\n"
                else:
                    yield f"data: {json.dumps({'error': f'Groq API error: {response.status_code}'})}\n\n"
                    
            except requests.exceptions.Timeout:
                yield f"data: {json.dumps({'error': 'Request timed out'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    
    except Exception as e:
        return {"error": f"Error: {str(e)}", "success": False}


@app.post("/conversations/save")
async def save_conversation(request: SaveConversationRequest, db: Session = Depends(get_db)):
    """Save or update a conversation"""
    try:
        existing_conv = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == request.user_id
        ).first()
        
        if not existing_conv:
            conv = Conversation(
                id=request.conversation_id,
                user_id=request.user_id,
                title=request.title or "Untitled"
            )
            db.add(conv)
            db.commit()
        
        db.query(Message).filter(Message.conversation_id == request.conversation_id).delete()
        db.commit()
        
        for msg in request.messages:
            message = Message(
                conversation_id=request.conversation_id,
                user_id=request.user_id,
                question=msg.get("question", ""),
                answer=msg.get("answer", "")
            )
            db.add(message)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Conversation saved",
            "conversation_id": request.conversation_id
        }
    except Exception as e:
        db.rollback()
        print(f"ERROR SAVING CONVERSATION: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/conversations/{user_id}")
async def get_conversations(user_id: int, db: Session = Depends(get_db)):
    """Get all conversations for a user"""
    try:
        conversations = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).all()
        
        result = []
        for conv in conversations:
            messages = db.query(Message).filter(
                Message.conversation_id == conv.id
            ).all()
            
            msg_list = []
            for m in messages:
                if m.question:
                    msg_list.append({
                        "role": "user",
                        "content": m.question
                    })
                if m.answer:
                    msg_list.append({
                        "role": "bot",
                        "content": m.answer
                    })
            
            result.append({
                "id": conv.id,
                "title": conv.title,
                "messages": msg_list,
                "createdAt": conv.created_at.isoformat()
            })
        
        return {
            "success": True,
            "conversations": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Delete a conversation and all its messages"""
    try:
        db.query(Message).filter(Message.conversation_id == conversation_id).delete()
        db.commit()
        
        db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).delete()
        db.commit()
        
        return {
            "success": True,
            "message": "Conversation deleted successfully",
            "conversation_id": conversation_id
        }
    except Exception as e:
        db.rollback()
        print(f"DELETE ERROR: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/")
async def root():
    """Test endpoint"""
    return {
        "message": "Legal LLM Backend is running!",
        "status": "online",
        "version": "2.0"
    }

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}
