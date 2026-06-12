---
title: Profile picture in top bar (web then mobile)
status: in-progress
jira: null
overview: Phase 1 adds tappable circular profile avatar to web top bar with presigned S3 upload. Phase 2 mirrors on mobile NavHeader with camera + gallery.
---

# Profile picture in top bar (web then mobile)

See [.cursor/plans/profile_pic_header_bc51d0da.plan.md](/.cursor/plans/profile_pic_header_bc51d0da.plan.md) for full plan details.

## Phase 1 — Web (done)

- GraphQL + WebUser profile picture fields
- Shared upload helper + HeaderProfileAvatar
- AppHeader avatar before logout (no name)
- StudentHomePage refactor + tests

## Phase 2 — Mobile (pending)

- NavHeader avatar + camera/gallery picker
