---
name: Trim UPDATE draft body
overview: Remove duplicate "Original message" and "Dedup reasoning" from the Jira draft comment body by changing the Python drafter only; the UI already shows the Teams message and italic dedup footer, and `Decision.dedup_reasoning` remains populated for display and storage.
todos:
  - id: drafter-trim
    content: Trim draft_comment body; drop match_reasoning param in drafter.py
    status: completed
  - id: pipeline-call
    content: Update pipeline.py draft_comment() call
    status: completed
  - id: test-drafter
    content: Adjust test_drafter.py for new comment shape
    status: completed
  - id: verify-tests
    content: Run pytest (drafter + full agent tests)
    status: completed
isProject: false
---

# Trim redundant UPDATE draft comment content

## Root cause

[`agent/app/services/drafter.py`](agent/app/services/drafter.py) builds `draft_comment.body` with trailing blocks:

```67:73:agent/app/services/drafter.py
    body = (
        f"New signal from Teams: {request.core_request or message.text.strip()}\n\n"
        f"{client_line}\n"
        f"Reported-by: {message.sender_name} at {message.created_at.isoformat()}\n"
        f"Dedup reasoning: {match_reasoning}\n\n"
        f"Original message:\n> {message.text.strip()}"
    )
```

[`ui/src/components/DecisionCard.tsx`](ui/src/components/DecisionCard.tsx) already renders the Teams message in `card-msg` and dedup explanation at the bottom from `decision.dedup_reasoning` (lines 93–109 and 144–148), so the same text appears twice on the card.

## Implementation

1. **`draft_comment` in [`agent/app/services/drafter.py`](agent/app/services/drafter.py)**  
   - Stop appending `Dedup reasoning: …` and `Original message: …` to `body`.  
   - Keep: “New signal…”, `client_line`, `Reported-by` line (still useful context on Jira).  
   - Remove the `match_reasoning` parameter from the function signature (it will only be redundant after this change).

2. **Call site in [`agent/app/services/pipeline.py`](agent/app/services/pipeline.py)**  
   - Update the `draft_comment(...)` invocation to drop `match_reasoning=match.reasoning`.  
   - Leave `dedup_reasoning=match.reasoning` on the `Decision` unchanged so the footer and DB row stay the same.

3. **Tests in [`agent/tests/unit/test_drafter.py`](agent/tests/unit/test_drafter.py)**  
   - Replace `test_draft_comment_includes_dedup_reasoning` with a test that asserts the comment still contains the signal, client, and reporter lines, and **does not** contain the old dedup/original-message blocks (e.g. assert `"Dedup reasoning:"` not in `comment.body`, `"Original message:"` not in `comment.body`).

4. **No UI changes**  
   - The card layout already matches the desired UX; trimming the backend-produced string fixes both the UI preview and what gets posted to Jira on Submit.

## Verification

Run `pytest agent/tests/unit/test_drafter.py -q` and full `make test` (or `pytest` + `vitest`) to ensure no other expectations reference the old comment shape.
