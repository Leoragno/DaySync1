from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta


# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI(title="DaySync API")
api_router = APIRouter(prefix="/api")

# ---------- Helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autenticato")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---------- Models ----------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserOut

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)

class CategoryInput(BaseModel):
    name: str
    color: str

class ScheduleItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    day_of_week: int  # 0=Lun ... 6=Dom
    start_time: str  # "HH:MM"
    end_time: str
    category_id: Optional[str] = None
    color: Optional[str] = None
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)

class ScheduleInput(BaseModel):
    title: str
    day_of_week: int
    start_time: str
    end_time: str
    category_id: Optional[str] = None
    color: Optional[str] = None

class Note(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class NoteInput(BaseModel):
    title: str
    content: str
    category_id: Optional[str] = None

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM
    type: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    color: Optional[str] = None
    completed: bool = False
    reminder_minutes: Optional[int] = None
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)

class EventInput(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    color: Optional[str] = None
    reminder_minutes: Optional[int] = None

class QuickNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    color: str = "#3f3f46"
    user_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)

class QuickNoteInput(BaseModel):
    text: str
    color: Optional[str] = "#3f3f46"

# ---------- Auth ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(inp: RegisterInput):
    email = inp.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email già registrata")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": inp.name or email.split("@")[0],
        "password_hash": hash_password(inp.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"])
    # Seed default categories
    defaults = [
        {"name": "Lavoro", "color": "#3b82f6"},
        {"name": "Personale", "color": "#10b981"},
        {"name": "Studio", "color": "#f59e0b"},
        {"name": "Urgente", "color": "#ef4444"},
    ]
    for d in defaults:
        cat = Category(name=d["name"], color=d["color"], user_id=user["id"])
        await db.categories.insert_one(cat.model_dump())
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(inp: LoginInput):
    email = inp.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(inp.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name")}}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user.get("name")}

# ---------- Categories ----------
@api_router.get("/categories", response_model=List[Category])
async def list_categories(user: dict = Depends(get_current_user)):
    docs = await db.categories.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return docs

@api_router.post("/categories", response_model=Category)
async def create_category(inp: CategoryInput, user: dict = Depends(get_current_user)):
    cat = Category(**inp.model_dump(), user_id=user["id"])
    await db.categories.insert_one(cat.model_dump())
    return cat

@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: dict = Depends(get_current_user)):
    await db.categories.delete_one({"id": cat_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Schedule ----------
@api_router.get("/schedule", response_model=List[ScheduleItem])
async def list_schedule(user: dict = Depends(get_current_user)):
    docs = await db.schedule.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs

@api_router.post("/schedule", response_model=ScheduleItem)
async def create_schedule(inp: ScheduleInput, user: dict = Depends(get_current_user)):
    item = ScheduleItem(**inp.model_dump(), user_id=user["id"])
    await db.schedule.insert_one(item.model_dump())
    return item

@api_router.put("/schedule/{item_id}", response_model=ScheduleItem)
async def update_schedule(item_id: str, inp: ScheduleInput, user: dict = Depends(get_current_user)):
    existing = await db.schedule.find_one({"id": item_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Non trovato")
    updated = {**existing, **inp.model_dump()}
    await db.schedule.update_one({"id": item_id, "user_id": user["id"]}, {"$set": updated})
    return updated

@api_router.delete("/schedule/{item_id}")
async def delete_schedule(item_id: str, user: dict = Depends(get_current_user)):
    await db.schedule.delete_one({"id": item_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Notes (Appunti) ----------
@api_router.get("/notes", response_model=List[Note])
async def list_notes(user: dict = Depends(get_current_user)):
    docs = await db.notes.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return docs

@api_router.post("/notes", response_model=Note)
async def create_note(inp: NoteInput, user: dict = Depends(get_current_user)):
    note = Note(**inp.model_dump(), user_id=user["id"])
    await db.notes.insert_one(note.model_dump())
    return note

@api_router.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: str, inp: NoteInput, user: dict = Depends(get_current_user)):
    existing = await db.notes.find_one({"id": note_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Non trovato")
    updated = {**existing, **inp.model_dump(), "updated_at": now_iso()}
    await db.notes.update_one({"id": note_id, "user_id": user["id"]}, {"$set": updated})
    return updated

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(get_current_user)):
    await db.notes.delete_one({"id": note_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Events ----------
@api_router.get("/events", response_model=List[Event])
async def list_events(user: dict = Depends(get_current_user)):
    docs = await db.events.find({"user_id": user["id"]}, {"_id": 0}).sort("date", 1).to_list(1000)
    return docs

@api_router.post("/events", response_model=Event)
async def create_event(inp: EventInput, user: dict = Depends(get_current_user)):
    ev = Event(**inp.model_dump(), user_id=user["id"])
    await db.events.insert_one(ev.model_dump())
    return ev

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, inp: EventInput, user: dict = Depends(get_current_user)):
    existing = await db.events.find_one({"id": event_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Non trovato")
    updated = {**existing, **inp.model_dump()}
    await db.events.update_one({"id": event_id, "user_id": user["id"]}, {"$set": updated})
    return updated

@api_router.patch("/events/{event_id}/complete")
async def toggle_complete(event_id: str, user: dict = Depends(get_current_user)):
    existing = await db.events.find_one({"id": event_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Non trovato")
    new_val = not existing.get("completed", False)
    await db.events.update_one({"id": event_id, "user_id": user["id"]}, {"$set": {"completed": new_val}})
    return {"completed": new_val}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    await db.events.delete_one({"id": event_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Quick Notes ----------
@api_router.get("/quicknotes", response_model=List[QuickNote])
async def list_quicknotes(user: dict = Depends(get_current_user)):
    docs = await db.quicknotes.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.post("/quicknotes", response_model=QuickNote)
async def create_quicknote(inp: QuickNoteInput, user: dict = Depends(get_current_user)):
    qn = QuickNote(**inp.model_dump(), user_id=user["id"])
    await db.quicknotes.insert_one(qn.model_dump())
    return qn

@api_router.put("/quicknotes/{qn_id}", response_model=QuickNote)
async def update_quicknote(qn_id: str, inp: QuickNoteInput, user: dict = Depends(get_current_user)):
    existing = await db.quicknotes.find_one({"id": qn_id, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Non trovato")
    updated = {**existing, **inp.model_dump()}
    await db.quicknotes.update_one({"id": qn_id, "user_id": user["id"]}, {"$set": updated})
    return updated

@api_router.delete("/quicknotes/{qn_id}")
async def delete_quicknote(qn_id: str, user: dict = Depends(get_current_user)):
    await db.quicknotes.delete_one({"id": qn_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Root ----------
@api_router.get("/")
async def root():
    return {"message": "DaySync API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.categories.create_index("user_id")
    await db.schedule.create_index("user_id")
    await db.notes.create_index("user_id")
    await db.events.create_index([("user_id", 1), ("date", 1)])
    await db.quicknotes.create_index("user_id")
    logger.info("DaySync API ready")

@app.on_event("shutdown")
async def shutdown():
    client.close()
