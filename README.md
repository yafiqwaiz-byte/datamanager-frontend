# DataManager Frontend

Version: 1.5.0 (in development) — 2026-07-06

This React frontend is the user/staff/admin portal for the DataManager backend. It was bootstrapped with Create React App and implements the UI for forms, OCR uploads, letter generation, PO aging dashboards, and staff workflows.

## Quick Start

Install dependencies and start the dev server:

```bash
npm install
npm start
```

Open http://localhost:3000 to view the app. Set `REACT_APP_API_BASE_URL` in your environment or `.env` to point to the backend API.

## Implemented Pages

- `SignIn`, `SignUp`, `ForgotPassword`, `CompleteProfile`
- User pages: `UserHome`, `UserFormPage`, `UserDataPage`, `UserOcrPage`, `UserOcrLetterPage`, `UserLetterStatus`
- Staff pages: `StaffHome`, `StaffFetchData`, `StaffUploadPage`, `StaffTemplates`, `StaffTemplateLetterUpload`, `StaffPOAging`, `StaffLetterQueue`, `StaffLetterReview`
- Admin page: `AdminDashboard`
- Utility pages: `FormRenderer`, `FieldMapperReview`, `GeneratedLetter`, `OcrSelectionPage`, `NorthenTNBStation`, `DashboardSuggest`

## Main Components

- `StaffLayout` — application shell used by staff pages (topbar + navigation)
- `AuthCircuitGrid` — authentication entry UI
- `POAgingDashboard` — visualizes PO aging metrics and percentile marks
- `TemplateFormModal` — modal UI for creating/updating DOCX letter templates

## Services (API clients)

- `authService.js` — authentication: login, logout, token handling (access + refresh cookie)
- `letterApi.js` — endpoints for letter generation, template upload and export
- `templateService.js` — template management API

These services call backend REST endpoints and handle JSON and multipart/form-data where needed.

## Styles & Design

All page-specific styles are under `src/styles/` and include:

- `Auth.css`, `AdminDashboard.css`, `Dashboard.css`, `POAgingDashboard.css`, `GeneratedLetter.css`, `NorthenTNBStation.css`, `OcrUpload.css`, `OcrSelectionPage.css`, `TemplateUpload.css`, `TemplateFormModal.css`, `StaffLayout.css`, `StaffUploadPage.css`, `StaffLetterQueue.css`, `StaffLetterReview.css`, `Stafffetchdata.css`, `FieldMapperReview.css`, `UserLetterStatus.css`

Design notes:
- Responsive two-column staff layout with a top navigation bar (`StaffLayout`).
- Reusable modal and form components for template management and form rendering.
- PO Aging visualizations use charts (implemented via front-end charting library) and table views for drill-down.
- Map view for TNB Northern stations using GeoJSON/leaflet on `NorthenTNBStation` page.

## Folder Structure (selected)

```
src/
├── components/      # Reusable UI components (StaffLayout, TemplateFormModal, POAgingDashboard...)
├── pages/           # Route pages (SignIn, UserHome, StaffHome, AdminDashboard...)
├── services/        # API client modules (authService, templateService, letterApi)
├── styles/          # Page and component CSS files
├── App.js           # Route definitions and top-level layouts
└── index.js         # App bootstrap
```

## Integration Notes

- The frontend expects authentication to use access tokens with a refresh cookie flow. `authService` handles storing tokens and triggering refresh flows.
- File uploads (templates, images, OCR files) use multipart requests; `FileUploadController` and letter endpoints on the backend support these.
- The PO Aging dashboard reads from the `POAgingController` endpoints and renders percentile marks and filters.

## Testing & Build

- Run tests: `npm test`
- Build for production: `npm run build`

## Upcoming Frontend Work

- Finish and polish form renderer interactions and validation flows.
- Add integration tests that exercise end-to-end flows with the backend (auth, upload, OCR, letter generation).
- Improve accessibility and keyboard navigation for modal dialogs and tables.
- Add feature toggles for AI-assisted suggestions in mapping workflows.


