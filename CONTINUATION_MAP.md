# 🗺️ Continuation Map: SoMailer Tiered Escalation & Monitoring

This document summarizes the intensive work done to implement and verify the **Intelligence Escalation Pipeline** and the **Escalation Monitor Dashboard**.

## 🏗️ Architecture Status: Phase 5 (Current)

### 1. Tiered Escalation Pipeline (v2.0)
The legacy escalation logic was replaced with a hardened **Post Urgent_Fire_v2** workflow.
- **Logic Hardening**: Rebuilt the workflow inside n8n with `Switch v3.4` and `Postgres v2.4` nodes.
- **Schema Contracts**: Enforced `parseInt(rawId, 10)` in all nodes to prevent `null` primary key errors.
- **Verification Suite**: Created four tiered test scripts (`test_tier1_urgent_fire.py` to `test_tier4_urgent_fire.py`) that auto-detect the latest valid DB entry and verify:
  - **Tier 1 (30%)**: Slack notification.
  - **Tier 2 (60%)**: @on-call Slack.
  - **Tier 3 (78%)**: Slack + Twilio SMS + Jira Bug.
  - **Tier 4 (92%)**: Slack (+@channel) + Twilio Voice Call + Emergency Jira.

### 2. Escalation Monitor Dashboard
An isolated, read-only monitoring interface was built for live visibility.
- **Backend (`routers/monitor.py`)**: A read-only FastAPI router that extracts urgency scores and summaries from the JSONB payload. It uses `SET TRANSACTION READ ONLY` for 100% safety.
- **Frontend (`EscalationMonitor.jsx`)**: A polling React component with:
  - **Status Indicators**: Pulsing Red for `critical_escalation`, Blue for `flagged_low`, etc.
  - **Live Counts**: Automatic tally of incidents by status in the header.
  - **Animations**: Framer Motion transitions for incoming real-time alerts.

### 3. System Reset & Cleanup
- **Database Slate**: All testing emails (260+ records) have been wiped.
- **ID Reset**: Primary keys are reset to start from **1**.
- **Ready for Team**: The system is in a clean state, ready to receive and process real teammate emails.

## 🛠️ Key Files & Entry Points
- `backend/app/routers/monitor.py`: Backend monitor logic.
- `frontend/src/components/EscalationMonitor.jsx`: Logic for the Monitoring UI.
- `n8n/Post Urgent_Fire_v2.json`: The source of truth for tiered escalation.
- `testing files/test_tierX_urgent_fire.py`: High-fidelity tests for and-to-end escalation verification.

## 🏁 Pending / Next Steps
1. **Teammate Live Verification**: Now that the DB is clear, observe the first real teammate emails arrive on the **Escalation Monitor** tab.
2. **Jira Defaults**: If specific Jira priorities are needed (beyond instance defaults), they must be re-enabled in the n8n Jira node dropdowns.
3. **Voice Call Script**: Verify the Twilio Voice "Message" field in the n8n node has been updated with the expression provided in the previous session.

## ⚠️ Infrastructure Note
- **Backend (Port 8000)**: Running in background.
- **Frontend (Port 5173)**: Running in background.
- **Database/Redis**: Running via Docker Compose.
- **n8n**: Running via `n8ncontainer`.

---
*Mapping updated on 2026-04-18 by Antigravity*
