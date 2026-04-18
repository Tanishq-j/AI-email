"""
monitor.py — Read-Only Escalation Monitor Router
=================================================
Zero-disturbance: this router ONLY reads from the database.
No writes, no side effects, no interaction with agent logic.

Mount in main.py:
    from app.routers.monitor import router as monitor_router
    app.include_router(monitor_router)
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/v1/monitor", tags=["Escalation Monitor"])

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/email_intelligence"
)

# ── Response Schema ────────────────────────────────────────────────────────────

class EscalationRecord(BaseModel):
    id: int
    scheduling_status: Optional[str]
    urgency_score: Optional[float]
    summary: Optional[str]
    subject: Optional[str]
    sender_email: Optional[str]
    classification: Optional[str]
    created_at: Optional[datetime]

class EscalationsResponse(BaseModel):
    count: int
    escalations: List[EscalationRecord]

# ── Helper: read-only DB connection ───────────────────────────────────────────

def get_readonly_conn():
    """
    Opens a read-only connection by setting the transaction to READ ONLY.
    Completely isolated from any write operations.
    """
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn.set_session(readonly=True, autocommit=True)
    return conn

# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.get("/escalations", response_model=EscalationsResponse)
def get_escalations(limit: int = 15):
    """
    Returns the latest `limit` records from email_actions, ordered by most recent.
    Extracts urgency_score, summary, subject, sender_email, and classification
    from the JSONB payload column — the exact fields n8n and the agent write.

    Read-only. Zero side effects.
    """
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    try:
        conn = get_readonly_conn()
        cur  = conn.cursor()
        cur.execute(
            """
            SELECT
                id,
                scheduling_status,
                created_at,
                COALESCE(payload->>'classification', 'Unknown')   AS classification,
                COALESCE(payload->>'sender_email', '')            AS sender_email,
                COALESCE(payload->>'subject', '')                 AS subject,
                COALESCE(
                    payload->'analysis'->>'summary',
                    payload->>'short_summary',
                    payload->>'content'
                )                                                 AS summary,
                COALESCE(
                    payload->>'urgency_score',
                    payload->'analysis'->>'urgency_score'
                )                                                 AS urgency_score
            FROM email_actions
            ORDER BY id DESC
            LIMIT %s
            """,
            (limit,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    records = []
    for row in rows:
        try:
            score = float(row["urgency_score"]) if row["urgency_score"] is not None else None
        except (ValueError, TypeError):
            score = None

        records.append(EscalationRecord(
            id=row["id"],
            scheduling_status=row["scheduling_status"],
            urgency_score=score,
            summary=row["summary"],
            subject=row["subject"],
            sender_email=row["sender_email"],
            classification=row["classification"],
            created_at=row["created_at"],
        ))

    return EscalationsResponse(count=len(records), escalations=records)


@router.get("/health")
def monitor_health():
    """Quick health check — verifies DB connectivity without returning data."""
    try:
        conn = get_readonly_conn()
        conn.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB unreachable: {str(e)}")
