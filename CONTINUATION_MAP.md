# 🗺️ Continuation Map: SoMailer Pipeline Finalization

This document summarizes the intensive work done to finalize the **Meeting Lifecycle Pipeline** for the SoMailer project.

## 🏗️ Current Architecture Status

### 1. The Sync Override (Critical)
We bypassed the "Time Pending Sync" bottleneck where n8n was failing to update the database correctly.
- **Frontend (`Drafts.jsx`)**: Now proactively calls `/set-time` the moment a slot is confirmed.
- **Backend (`main.py`)**: Uses `COALESCE` in the `/confirm` endpoint to ensure the `scheduled_time` is locked in and never overwritten by `null` values from n8n.
- **Result**: The "Time Pending Sync" bug is **100% Resolved**.

### 2. The Reschedule Loop
- **Get Recipient Info (n8n)**: A new Postgres node was added before the "3-Day Probe" to anchor the `recipient` email from the database.
- **3-Day Probe (n8n)**: Updated to use `$node["Get Recipient Info"]` to prevent `undefined` recipient errors.
- **Save Draft (n8n)**: Now includes the `recipient` in the HTTP Body parameters.

### 3. The Cancellation Flow
- **Mark Cancelled (n8n)**: Corrected from an `insert` operation to an `update` operation using the `email_action_id` to prevent "Duplicate Key" errors.

## 🛠️ Key Utilities Created
- `backend/cleanup_db.py`: Wipes corrupted records for clean testing.
- `backend/repair_cards.py`: Normalizes timestamps for UI alignment.
- `testing files/trigger_meeting_proposal.py`: Used to simulate inbound scheduling requests.

## 🏁 Pending "Last Mile" Tasks
1. **Verification**: Perform one end-to-end loop (Trigger -> Confirm -> Cancel) to verify the "Mark Cancelled" node's manual update.
2. **UI Polish**: Ensure the "Time Pending Sync" fallback text in `Drafts.jsx` is never visible now that the override is in place.
3. **Database Maintenance**: Occasionally run `cleanup_db.py` during testing if stale draft records (sent via n8n directly) accumulate.

## ⚠️ Important Note for new session
All n8n logic is running inside a **Docker Container** (`n8ncontainer`). 
- Changes to `Master Meeting Controller.json` on disk are **NOT** live until imported.
- The user is currently making manual changes in the n8n Studio for reliability.

---
*Mapping generated on 2026-04-17 by Antigravity*
