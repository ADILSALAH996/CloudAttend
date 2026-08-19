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