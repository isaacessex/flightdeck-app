# Changelog

All notable changes to FLIGHTDECK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup for local development
- Complete configuration files for development and deployment
- Documentation for setup, deployment, and troubleshooting

## [1.0.0] - 2026-03-13

### Added
- Core placement management system with status workflow (DRAFT → PENDING → QUOTED → FIRM ORDER → BOUND → DECLINED → NTU)
- Support for aviation product codes: HL, HW, PA, LOL, HD, UAS
- Lineslip management with binding authority functionality
- Contact Manager with support for:
  - Brokers with permissions system
  - Producing Brokers with commission tracking
  - Underwriters
  - Insureds (company-level entities)
  - Cedents (company-level entities)
- Authorised Producing Brokers feature in LineslipForm with cyan-themed checkbox selection
- Automated PDF generation for:
  - Binding Slip (green accent)
  - EOC Covering Letter (amber accent, separate templates for insurance/reinsurance)
  - Claims Notification Procedures (purple accent)
- Email notification system using Resend API with branded HTML templates
- Email notifications trigger at four status transitions: PENDING, QUOTED, FIRM ORDER, BOUND
- Reports and analytics dashboard with placement tracking
- User authentication with broker/underwriter role separation
- British Racing Green (#004225) design system with Inter font
- Supabase backend integration with Edge Functions
- Key-value store for data persistence

### Changed
- Contact Manager now displays "N/A" for Cedent and Insured NAME and EMAIL columns (company-level entities)
- Removed bulk upload Insureds button from Contact Manager
- Cleaned up debug buttons from main interface ("Delete All Placements" and "View Stored HW Lineslip Wordings")
- Contact Manager header now shows only "Add Contact" button for cleaner interface

### Technical Details
- Built with React 18, TypeScript, and Tailwind CSS v4
- Backend powered by Supabase (Edge Functions, Auth, Storage, Database)
- PDF generation using jsPDF
- Email delivery via Resend API
- External integrations: JetAPI, AeroDataBox, ScoreChain (optional)
- Three-tier architecture: Frontend → Server → Database
- Document generation uses `resolvePlaceholder` to inject live placement data
- Status-dependent PDF behavior based on placement workflow stage

---

## Version History Guide

### Version Number Format: MAJOR.MINOR.PATCH

- **MAJOR**: Incompatible API changes or major redesigns
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, backwards-compatible

### Change Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed in future versions
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

---

## How to Update This Changelog

When making changes to FLIGHTDECK:

1. Add entries under `[Unreleased]` section
2. Use appropriate category (Added, Changed, Fixed, etc.)
3. Write clear, user-focused descriptions
4. Include issue/PR numbers if applicable
5. When releasing a version:
   - Change `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`
   - Create new `[Unreleased]` section above it

Example entry:
```markdown
### Fixed
- Fixed placement status transition from FIRM ORDER to BOUND (#123)
- Corrected PDF generation for multi-aircraft placements (#124)
```

---

[Unreleased]: https://github.com/yourorg/flightdeck/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourorg/flightdeck/releases/tag/v1.0.0
