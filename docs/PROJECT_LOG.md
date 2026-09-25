# CloudAttend Project Log

---

## Milestone M1 - Project Foundation

**Date:** 30 July 2026

### Completed
- Created the CloudAttend project folder
- Organized the initial folder structure
- Created README.md
- Created .gitignore
- Initialized a Git repository
- Learned Git basics
- Created the first commit

### Git Commands Learned
- git init
- git status
- git add .
- git commit -m "Initial project structure"
- git log --oneline

### Notes
- Git tracks files, not empty folders.
- A commit is a snapshot of the project.

---

## Milestone M2 - GitHub Integration

**Date:** 30 July 2026

### Completed
- Created a GitHub repository
- Connected the local repository to GitHub
- Renamed the default branch from master to main
- Uploaded the project to GitHub successfully

### Git Commands Learned
- git remote add origin <repository-url>
- git remote -v
- git branch -M main
- git push -u origin main

### Notes
- The connection between the local repository and GitHub is created only once.
- Future uploads only require:
  - git status
  - git add .
  - git commit -m "message"
  - git push

### Status
✅ CloudAttend is now available on GitHub.


# M3 - Landing Page Development

## Completed

- Built the CloudAttend public landing page.
- Created a professional SaaS-style navigation bar.
- Added hero section with:
  - Project introduction
  - Teacher Portal button
  - Student Portal button
  - QR attendance preview card
- Added Features section:
  - QR Attendance
  - Secure Access
  - AWS Cloud Powered
- Added How It Works section with four steps:
  1. Create a Session
  2. Generate QR Code
  3. Students Scan
  4. Attendance Recorded
- Added Why CloudAttend section explaining the project's advantages.
- Added Get Started CTA section.
- Added professional footer.
- Added responsive layouts for feature sections.
- Added hover effects and consistent spacing.
- Fixed HTML section nesting and horizontal overflow issues.
- Removed unnecessary public pages such as:
  - features.html
  - about.html
  - contact.html

## Architecture Decision

The project will use:

Public Website
→ index.html

Application Pages
→ Teacher Login
→ Student Login
→ Teacher Dashboard
→ Student Dashboard
→ Attendance

The public landing page will remain a single page instead of creating separate
Features, About, and Contact pages.

## Design Direction

- Professional SaaS-style interface
- Blue, white, gray and green color palette
- Clean spacing and typography
- Minimal use of effects
- Portfolio-quality UI
- No unnecessary gradients or excessive visual elements

## Concepts Learned

- HTML page structure
- Semantic sections
- Navigation
- CSS Flexbox
- CSS Grid
- Responsive design
- Buttons and hover states
- Cards
- Section layouts
- Page structure and navigation planning
- Git workflow

## Status

M3 Completed


## M4.1 — Teacher Login UI

### Completed
- Created the teacher login page at `frontend/pages/teacher-login.html`
- Added CloudAttend branding and consistent visual styling
- Added teacher email and password fields
- Added browser-level required field validation
- Added responsive login layout for smaller screens
- Added navigation to Student Login
- Added navigation back to the CloudAttend landing page
- Kept authentication logic separate for later AWS Cognito integration

### Concepts Learned
- HTML form structure
- Labels and form inputs
- Password input types
- Required field validation
- CSS form styling
- Responsive login layouts
- Linking pages within the project

### Architecture Decision
The login UI is intentionally separated from authentication logic. Real teacher authentication will later be implemented using Amazon Cognito instead of storing or validating passwords manually in the frontend.

### Status
M4.1 — Teacher Login UI Completed

### M8.6 — Teacher Attendance Reports
- Connected View Reports to class attendance API
- Added dynamic attendance report modal
- Displays sessions, present, absent, and attendance percentage
- Filters out classes with no enrolled students
- Uses teacher's assigned classes dynamically
- Tested successfully with B1 data

### M8.8 — Student Attendance Session Details
- Added clickable recent attendance records
- Added student session details modal
- Displays session time and attendance marked time separately
- Displays attendance status and student information
- Reused existing session details API
- Verified UTC to IST time conversion
- Tested successfully



---

## M7 — Timetable & Live Class System

**Date:** 25 September 2026

### Completed

- Implemented read-only timetable architecture using PostgreSQL.
- Added `class_schedules` with class, batch, subject, faculty, day, time, room and schedule type.
- Added timetable APIs for:
  - All schedules
  - Batch schedules
  - Faculty schedules
  - Class schedules
- Connected the Teacher Dashboard to the teacher's faculty timetable.
- Added timetable class status handling:
  - Upcoming
  - Active
  - Completed
- Restricted Teacher attendance start to the scheduled class.
- Connected attendance sessions to `schedule_id`.
- Implemented schedule-based active attendance session lookup.
- Implemented Student live-session detection using 5-second polling.
- Added Student `Attendance Available` state for active scheduled sessions.
- Connected Student live sessions to the existing QR scanner.
- Implemented QR-based attendance marking.
- Added visible QR expiry countdown.
- QR validity is limited to 5 minutes.
- Implemented Teacher session stopping.
- Verified stopped sessions are no longer detected as active.
- Verified duplicate attendance is rejected.
- Verified invalid QR tokens are rejected.
- Verified expired QR tokens are rejected.
- Verified attendance records are stored in PostgreSQL.
- Completed end-to-end Teacher → Student → QR → Attendance workflow testing.

### API / Backend Changes

- Added `schedule_id` to attendance session creation.
- Added schedule-based active session endpoint:
  - `GET /attendance/sessions/active/schedule/{schedule_id}`
- Updated schedule creation to include `class_id`.
- Added scheduled-class validation for attendance sessions.
- Added QR expiry validation.

### Frontend Changes

- Teacher Dashboard now passes the timetable `schedule_id` when starting attendance.
- Student Dashboard polls for active attendance sessions every 5 seconds.
- Student Dashboard displays `Attendance Available` when an active session exists.
- Added QR countdown timer based on backend `qr_expires_at`.
- Added QR expiration display.

### Testing

- Teacher timetable tested successfully.
- Student timetable tested successfully.
- Active class detection tested successfully.
- Attendance session creation tested successfully.
- Student live-session detection tested successfully.
- QR scanning tested successfully.
- Attendance marking tested successfully.
- Duplicate attendance returned `409 Conflict`.
- Invalid QR returned `404 Not Found`.
- Expired QR returned `400 Bad Request`.
- Stopped session returned no active session.
- PostgreSQL attendance record verified.

### Concepts Learned

- Timetable-driven application logic
- Foreign-key relationships
- Schedule-based business rules
- Polling
- QR token validation
- Session lifecycle management
- Attendance validation
- PostgreSQL data verification
- Frontend/backend integration
- UTC and local-time handling
- Incremental API testing with Swagger

### Architecture Decision

The timetable remains the source of truth for scheduled classes.

Teacher attendance sessions are created only for the corresponding timetable entry.

Student live-session detection uses polling initially rather than WebSockets.

WebSockets will not be introduced until there is a clear requirement for them.

### Status

M7 — Timetable & Live Class System Completed