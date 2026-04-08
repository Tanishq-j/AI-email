---
name: email_intelligence
description: Processes incoming corporate emails directly, prioritizing critical updates to user.
---

# Email Intelligence

This skill governs the behavior for parsing and prioritizing emails for the Smart Email Assistant infrastructure.

## Rules
- Assess each incoming message's priority using the Gemini API.
- Filter out out-of-office, low priority, and list-serve communications.
- Escalate emails matching projects listed in `priority_projects`.
- Respect `working_hours` and `no_interrupt_list` from the data registry.
