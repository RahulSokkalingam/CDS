import hashlib
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, select
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# Environment variable for database connection
# Supports PostgreSQL (postgresql://...) or falls back to local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if DATABASE_URL:
    # Render / Heroku Postgres URLs sometimes start with postgres:// instead of postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    db_path = os.path.join(os.path.dirname(__file__), "cds_database.db")
    DATABASE_URL = f"sqlite:///{db_path}"

# Configure SQLAlchemy engine with connection pooling for PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

ADMIN_EMAIL = "admin@email.com"
ADMIN_PASSWORD = "password"
ADMIN_NAME = "CDS Admin"


# ORM Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="normal")
    is_admin = Column(Integer, nullable=False, default=0)
    approved = Column(Integer, nullable=False, default=1)
    created_at = Column(String(100), nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "is_admin": bool(self.is_admin),
            "approved": bool(self.approved),
            "created_at": self.created_at,
        }


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(100), primary_key=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    original_image = Column(Text, nullable=False)
    processed_image = Column(Text, nullable=False)
    has_crack = Column(Integer, nullable=False)
    severity = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    summary = Column(Text, nullable=False)
    defects_json = Column(Text, nullable=False)
    status = Column(String(100), nullable=False, default="Pending Assignment")
    assigned_inspector = Column(String(255), default="Unassigned")
    source = Column(String(100), nullable=False, default="Public Reporter")
    created_at = Column(String(100), nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        defects = json.loads(self.defects_json) if self.defects_json else []
        return {
            "id": self.id,
            "user_email": self.user_email,
            "user_name": self.user_name,
            "location": self.location,
            "originalImage": self.original_image,
            "processedImage": self.processed_image,
            "has_crack": bool(self.has_crack),
            "overallSeverity": self.severity,
            "overallConfidence": self.confidence,
            "summary": self.summary,
            "defects": defects,
            "status": self.status,
            "assigned_inspector": self.assigned_inspector or "Unassigned",
            "source": self.source or "Public Reporter",
            "created_at": self.created_at,
        }


def get_db():
    """Dependency helper to yield a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    # SHA-256 salted password hashing
    salt = "cds_salt_2026_secure"
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def init_db():
    Base.metadata.create_all(bind=engine)
    _seed_default_users()


def _seed_default_users():
    """Ensure the hardcoded admin account and initial demo accounts always exist with valid password hashes."""
    db: Session = SessionLocal()
    try:
        pwd_hash = hash_password(ADMIN_PASSWORD)
        now = datetime.now().isoformat()
        
        # 1. Admin account
        user = db.query(User).filter(User.email == ADMIN_EMAIL.lower().strip()).first()
        if not user:
            admin_user = User(
                email=ADMIN_EMAIL.lower().strip(),
                password_hash=pwd_hash,
                name=ADMIN_NAME,
                role="inspector",
                is_admin=1,
                approved=1,
                created_at=now,
            )
            db.add(admin_user)
        else:
            user.password_hash = pwd_hash
            user.is_admin = 1
            user.approved = 1
            user.role = "inspector"

        # 2. Demo accounts: publicreporter1, manual1, drone1
        demo_accounts = [
            ("publicreporter1@email.com", "publicreporter1", "normal", 0, 1),
            ("manual1@email.com", "manual1", "inspector", 0, 1),
            ("drone1@email.com", "drone1", "drone", 0, 1),
        ]
        for demo_email, demo_name, demo_role, demo_is_admin, demo_approved in demo_accounts:
            existing = db.query(User).filter(User.email == demo_email.lower().strip()).first()
            if not existing:
                u = User(
                    email=demo_email.lower().strip(),
                    password_hash=pwd_hash,
                    name=demo_name,
                    role=demo_role,
                    is_admin=demo_is_admin,
                    approved=demo_approved,
                    created_at=now,
                )
                db.add(u)
            else:
                existing.password_hash = pwd_hash
                existing.approved = demo_approved

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding default users: {e}")
    finally:
        db.close()


def create_user(email: str, password: str, name: str, role: str) -> Dict[str, Any]:
    db: Session = SessionLocal()
    try:
        clean_email = email.lower().strip()
        existing = db.query(User).filter(User.email == clean_email).first()
        if existing:
            raise ValueError("An account with this email address already exists.")

        pwd_hash = hash_password(password)
        now = datetime.now().isoformat()
        approved_val = 0 if role.strip().lower() in ("inspector", "drone") else 1

        new_user = User(
            email=clean_email,
            password_hash=pwd_hash,
            name=name.strip(),
            role=role.strip().lower(),
            is_admin=0,
            approved=approved_val,
            created_at=now,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user.to_dict()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        clean_email = email.lower().strip()
        pwd_hash = hash_password(password)
        user = db.query(User).filter(User.email == clean_email, User.password_hash == pwd_hash).first()

        if not user:
            return None

        if user.role in ("inspector", "drone") and not user.approved:
            raise PermissionError("Your account is pending approval from the admin. Please wait.")

        return user.to_dict()
    finally:
        db.close()


def get_pending_inspectors() -> List[Dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        users = (
            db.query(User)
            .filter(User.role.in_(["inspector", "drone"]), User.approved == 0, User.is_admin == 0)
            .order_by(User.created_at.desc())
            .all()
        )
        return [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "created_at": u.created_at,
            }
            for u in users
        ]
    finally:
        db.close()


def get_all_inspectors() -> List[Dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        users = (
            db.query(User)
            .filter(User.role.in_(["inspector", "drone"]))
            .order_by(User.created_at.desc())
            .all()
        )
        return [u.to_dict() for u in users]
    finally:
        db.close()


def approve_inspector(email: str, approve: bool) -> bool:
    db: Session = SessionLocal()
    try:
        clean_email = email.lower().strip()
        user = (
            db.query(User)
            .filter(User.email == clean_email, User.role.in_(["inspector", "drone"]), User.is_admin == 0)
            .first()
        )
        if not user:
            return False

        if approve:
            user.approved = 1
        else:
            db.delete(user)

        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()


def save_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
    db: Session = SessionLocal()
    try:
        now = datetime.now().isoformat()
        report_id = f"REP-{int(datetime.now().timestamp() * 1000)}"
        defects_str = json.dumps(report_data.get("defects", []))
        has_crack_val = 1 if report_data.get("has_crack", True) else 0
        source = report_data.get("source", "Public Reporter")
        status_val = "Pending Assignment" if has_crack_val else "Clear"

        report = Report(
            id=report_id,
            user_email=report_data.get("user_email", "public@cds.io"),
            user_name=report_data.get("user_name", "Public Reporter"),
            location=report_data.get("location", "Unspecified Location"),
            original_image=report_data.get("originalImage", ""),
            processed_image=report_data.get("processedImage", ""),
            has_crack=has_crack_val,
            severity=report_data.get("overallSeverity", "Low"),
            confidence=float(report_data.get("overallConfidence", 95.0)),
            summary=report_data.get("summary", "No summary available."),
            defects_json=defects_str,
            status=status_val,
            assigned_inspector="Unassigned",
            source=source,
            created_at=now,
        )
        db.add(report)
        db.commit()

        result = report_data.copy()
        result["id"] = report_id
        result["status"] = status_val
        result["assigned_inspector"] = "Unassigned"
        result["source"] = source
        result["created_at"] = now
        return result
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_all_reports(user_email: Optional[str] = None, is_inspector: bool = False) -> List[Dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        query = db.query(Report)
        if not is_inspector and user_email:
            query = query.filter(Report.user_email == user_email.lower().strip())
        reports = query.order_by(Report.created_at.desc()).all()
        return [r.to_dict() for r in reports]
    finally:
        db.close()


def update_report_status(report_id: str, status: str, assigned_inspector: Optional[str] = None) -> bool:
    db: Session = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return False

        report.status = status
        if assigned_inspector:
            report.assigned_inspector = assigned_inspector

        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()


def delete_report(report_id: str) -> bool:
    db: Session = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return False

        db.delete(report)
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()


# Initialize database on import
init_db()
