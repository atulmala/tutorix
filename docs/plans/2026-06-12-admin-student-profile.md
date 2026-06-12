---
title: Admin student profile (mirror tutor flow)
status: done
jira: null
overview: Admin student list names link to read-only profile pages with parent, address, education, and onboarding timeline sections.
---

# Admin student profile (mirror tutor flow)

Implemented admin student detail mirroring tutor flow.

## Delivered

- `adminStudentDetail` GraphQL query + `StudentDetailService`
- `GET_ADMIN_STUDENT_DETAIL` client query
- `@tutorix/student-detail-ui` with `StudentDetailView`
- Web-admin `/students/:studentId` route + clickable names in list
- `buildStudentOnboardingTimeline` in shared-utils
