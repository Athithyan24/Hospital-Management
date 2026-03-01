from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime
import heapq
import sqlite3

# --- 1. DATABASE SETUP ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./hospital.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 2. ADVANCED DATABASE MODELS ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String) 
    role = Column(String)
    department = Column(String, nullable=True)
    name = Column(String)

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    urgency_level = Column(Integer)
    wait_time_mins = Column(Integer, default=0)
    status = Column(String, default="Pending Triage")
    
class Vitals(Base):
    __tablename__ = "vitals"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    blood_pressure = Column(String)
    temperature = Column(Float)
    weight = Column(Float)
    oxygen_level = Column(Integer)

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    symptoms = Column(String)
    diagnosis = Column(String)
    prescription = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Bill(Base):
    __tablename__ = "bills"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    consultation_fee = Column(Float, default=500.0)
    medicine_fee = Column(Float, default=0.0)
    total_amount = Column(Float)
    payment_status = Column(String, default="Unpaid")

Base.metadata.create_all(bind=engine)

class TriageData(BaseModel):
    blood_pressure: str  
    temperature: float   
    weight: float        
    oxygen_level: int

def init_db():
    db = SessionLocal()
    # If no users exist, create our 8 department doctors AND a Triage Nurse
    if not db.query(User).first():
        doctors = [
            ("Dr. Heart", "Cardiology", "doc_cardio"),
            ("Dr. Brain", "Neurology", "doc_neuro"),
            ("Dr. Child", "Pediatrics", "doc_peds"),
            ("Dr. Bone", "Orthopedics", "doc_ortho"),
            ("Dr. Cut", "General Surgery", "doc_surg"),
            ("Dr. Skin", "Dermatology", "doc_derm"),
            ("Dr. Cell", "Oncology", "doc_onco"),
            ("Dr. Ray", "Radiology", "doc_radio")
        ]
        
        # Add Doctors
        for name, dept, uname in doctors:
            user = User(username=uname, password="password123", role="Doctor", department=dept, name=name)
            db.add(user)
            
        # Add Triage Nurse
        nurse = User(username="nurse_triage", password="password123", role="Nurse", department="Triage", name="Nurse Joy")
        db.add(nurse)
        
        db.commit()
    db.close()

init_db() # Run seeder on startup

# --- 3. FASTAPI SETUP ---
app = FastAPI(title="Smart Hospital Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def setup_database():
    conn = sqlite3.connect("hospital.db")
    cursor = conn.cursor()
    
    # 1. Modify appointments table to include a 'status'
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT,
            doctor_id INTEGER,
            urgency_level INTEGER,
            status TEXT DEFAULT 'Pending Triage'
        )
    """)
    
    # 2. Create the Vitals table linked to the appointment
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER,
            blood_pressure TEXT,
            temperature REAL,
            weight REAL,
            oxygen_level INTEGER,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id)
        )
    """)
    conn.commit()
    conn.close()

# Run the SQLite raw schema setup
setup_database()

# --- 4. PYDANTIC SCHEMAS ---
class AppointmentCreate(BaseModel):
    patient_name: str
    doctor_id: int
    urgency_level: int
    wait_time_mins: int = 0

class ConsultationData(BaseModel):
    symptoms: str
    diagnosis: str
    prescription: str
    medicine_cost: float

class LoginRequest(BaseModel):
    username: str
    password: str

# --- 5. ALGORITHM ---
def calculate_priority(urgency, wait_time, doctor_load):
    W1, W2, W3 = 10, 2, 5
    return (urgency * W1) + (wait_time * W2) - (doctor_load * W3)

# --- 6. API ENDPOINTS ---
@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username, User.password == data.password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"id": user.id, "name": user.name, "department": user.department, "role": user.role}

@app.get("/doctors")
def get_doctors(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == "Doctor").all()

@app.post("/book-appointment/")
def book_appointment(appt: AppointmentCreate, db: Session = Depends(get_db)):
    new_appt = Appointment(patient_name=appt.patient_name, doctor_id=appt.doctor_id, urgency_level=appt.urgency_level, wait_time_mins=appt.wait_time_mins)
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return {"message": "Appointment booked successfully!", "appointment_id": new_appt.id}

@app.get("/doctor/{doc_id}/queue")
async def get_doctor_queue(doc_id: int):
    conn = sqlite3.connect("hospital.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT a.id as appointment_id, a.patient_name, a.urgency_level, a.status,
               v.blood_pressure, v.temperature, v.weight, v.oxygen_level
        FROM appointments a
        LEFT JOIN vitals v ON a.id = v.appointment_id
        WHERE a.doctor_id = ? AND a.status = 'Waiting for Doctor'
        ORDER BY a.urgency_level DESC, a.id ASC
    """, (doc_id,))
    
    queue = cursor.fetchall()
    conn.close()
    
    return {"smart_queue": [dict(q) for q in queue]}

@app.post("/attend-patient/{appointment_id}")
def attend_patient(appointment_id: int, data: ConsultationData, db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    appt.status = "Completed"
    record = MedicalRecord(appointment_id=appointment_id, symptoms=data.symptoms, diagnosis=data.diagnosis, prescription=data.prescription)
    db.add(record)
    total = 500.0 + data.medicine_cost
    new_bill = Bill(appointment_id=appointment_id, medicine_fee=data.medicine_cost, total_amount=total)
    db.add(new_bill)
    db.commit()
    return {"message": "Consultation complete."}

@app.get("/pharmacy/prescriptions")
def get_prescriptions(db: Session = Depends(get_db)):
    records = db.query(MedicalRecord, Appointment).join(Appointment, MedicalRecord.appointment_id == Appointment.id).order_by(MedicalRecord.created_at.desc()).all()
    return [{"record_id": r.id, "patient_name": a.patient_name, "diagnosis": r.diagnosis, "prescription": r.prescription, "date": r.created_at.strftime("%Y-%m-%d %H:%M")} for r, a in records]

@app.get("/billing/invoices")
def get_bills(db: Session = Depends(get_db)):
    bills = db.query(Bill, Appointment).join(Appointment, Bill.appointment_id == Appointment.id).all()
    return [{"bill_id": b.id, "patient_name": a.patient_name, "consultation_fee": b.consultation_fee, "medicine_fee": b.medicine_fee, "total_amount": b.total_amount, "payment_status": b.payment_status} for b, a in bills]

@app.post("/billing/pay/{bill_id}")
def pay_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    bill.payment_status = "Paid"
    db.commit()
    return {"message": "Payment successful!"}

# --- NURSE / TRIAGE MODULE ---

@app.get("/triage/queue")
async def get_triage_queue():
    """Fetches all patients who have registered but haven't seen the nurse yet."""
    conn = sqlite3.connect("hospital.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM appointments WHERE status = 'Pending Triage'")
    patients = cursor.fetchall()
    conn.close()
    
    return [dict(p) for p in patients]

@app.post("/triage/vitals/{appointment_id}")
async def submit_triage(appointment_id: int, vitals: TriageData):
    """Saves the patient's vitals and moves them to the Doctor's queue."""
    conn = sqlite3.connect("hospital.db")
    cursor = conn.cursor()
    
    try:
        # 1. Insert the vitals into the database
        cursor.execute("""
            INSERT INTO vitals (appointment_id, blood_pressure, temperature, weight, oxygen_level)
            VALUES (?, ?, ?, ?, ?)
        """, (appointment_id, vitals.blood_pressure, vitals.temperature, vitals.weight, vitals.oxygen_level))
        
        # 2. Update the appointment status so the Doctor can now see them
        cursor.execute("""
            UPDATE appointments 
            SET status = 'Waiting for Doctor' 
            WHERE id = ?
        """, (appointment_id,))
        
        conn.commit()
        return {"status": "success", "message": f"Patient #{appointment_id} triaged and sent to doctor."}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()