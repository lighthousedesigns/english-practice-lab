# Migration notes: Mr. Rea's English Practice Hub to English Practice Lab

## Purpose of this package

This folder preserves the strongest completed work from the browser-based
English Practice Hub without preserving its manual Netlify deployment routine.
The original project was not changed or deleted. No student submissions,
credentials, generated dependency folders, duplicate backups, ZIP archives, or
build output are included.

## Package contents

### `app/index.html`

The complete student interface. It contains the session library, session start
form, one-question-at-a-time practice screen, immediate-feedback area, final
performance-summary card, Google Form submission button, PDF button, and
accessible labels/headings.

### `app/app.js`

The canonical student runtime. It provides:

- library validation and direct-session selection;
- one question at a time;
- a randomized shuffle bag with no immediate repeat across bag boundaries;
- answer checking and immediate correct/incorrect feedback;
- instructional explanations;
- correct, incorrect, attempted, accuracy, current-streak, and longest-streak
  calculations;
- countdown and elapsed-practice-time calculations;
- per-review-topic performance and concepts-to-review summaries;
- refresh-safe active state in `sessionStorage`;
- the final result screen and print/PDF action;
- the working prefilled Google Form integration.

### `app/styles.css`

The complete clean interface styling for students and the teacher editor,
including responsive layouts, accessible focus states, feedback states,
results-card styling, and print rules. There are no separate image, font, or
other external assets.

### `app/practice-library.js`

The old runtime's published-library wrapper:

`window.PRACTICE_LIBRARY = { version: 1, sessions: [...] };`

It contains the finished 30-question Independent or Dependent session and is
included to show exactly how the old static runtime received published data.
The new GitHub Pages project may instead prefer JSON imports or generated data,
but the session content and shape are reusable.

### `app/teacher.html` and `app/teacher.js`

The working browser-based teacher editor. It can add, duplicate, delete, move,
validate, import, and export sessions/questions. It also saves an editing draft
in `localStorage`, opens a one-minute preview, exports an individual session as
JSON, exports a full-library JSON backup, and exports a publishable
`practice-library.js` file.

These files are valuable as a working editor and as a reference for future
authoring tools. The manual replace-and-upload publishing step should not be
preserved in the new architecture.

### `sessions/independent-or-dependent.json`

The finished 30-question grammar session converted from the validated full
library backup into the current individual-session format. It includes 15
independent-clause and 15 dependent-clause questions with explanations and
review-topic labels.

### `sessions/types-of-sentences.json`

The complete finished 15-question Types of Sentences session: five simple,
five compound, and five complex sentence questions with explanations and review
topics. Duplicate copies elsewhere in the old project were deliberately not
included.

### `schema/session.schema.json`

A machine-readable JSON Schema for the legacy individual-session format.

### `schema/SESSION-DATA-FORMAT.md`

A human-readable description of every session and question field, including
the important fact that the legacy schema has `category` but no separate
`course` field.

### `integration/GOOGLE-FORM-FIELD-MAP.md`

The live Google Form endpoint, all eleven actual entry-field IDs, the result
mapping, and the behavior and limitations of the prefilled submission flow.

## Features confirmed working

The following were completed and exercised in the old project:

- The clean student session interface opens locally in a browser.
- Direct session selection and the timed practice flow work.
- Questions appear one at a time with randomized coverage.
- Students receive immediate correct/incorrect feedback and the instructional
  explanation before moving on.
- Attempted, correct, incorrect, accuracy, longest streak, elapsed time, and
  skill-level results appear on the final summary.
- The result card can be printed or saved as PDF.
- Types of Sentences imported and passed the teacher editor's validation and
  preview flow.
- A student dummy account successfully opened the prefilled Google Form,
  submitted it, and produced the intended response workflow.
- Class period is required in the student interface and is mapped to the Form.

## How the old app ran

The project was intentionally framework-free. `index.html` and `teacher.html`
could be opened directly from the filesystem with no server, install, package
manager, or build command. On a hosted static site, `index.html` loaded
`practice-library.js` and then `app.js` using relative paths.

The old deployment process copied the seven static files into a folder named
`UPLOAD THIS FOLDER TO NETLIFY`, zipped or dragged that folder into Netlify,
and manually repeated the upload after changes. That process is obsolete for
English Practice Lab.

## How sessions were created, imported, and exported

1. Open `teacher.html`.
2. Add a new session or select **Import One Session** and choose an individual
   session JSON file.
3. Edit title, ID, category, description, directions, timer, listing status,
   questions, choices, correct answers, explanations, and review topics.
4. Resolve every validation error.
5. Save a browser-local editing draft when useful.
6. Use the one-minute preview to test the activity.
7. Export the current session as a reusable JSON file for the activity bank.
8. Export a full-library JSON backup for recovery.
9. The old publishing flow exported `practice-library.js`, manually replaced
   the hosted copy, and re-uploaded the static folder.

The individual JSON session should remain the durable, portable unit in the new
project. Browser-local drafts should never be the only copy.

## How direct session links worked

The student runtime read the `session` query parameter. A URL ending in
`?session=types-of-sentences` opened that session's start screen directly.
Unlisted sessions were hidden from the homepage but remained available through
their direct links. Session IDs therefore functioned as stable public URL keys
and should not be changed after links are assigned.

This query-string approach is compatible with ordinary static hosting,
including GitHub Pages; it is not Netlify-specific.

## How Google Form submission worked

The Form configuration is embedded in `app/app.js` and documented separately
in `integration/GOOGLE-FORM-FIELD-MAP.md`. At the final screen, the student
selected a button that built a prefilled Google Forms URL containing name,
period, activity, score, accuracy, elapsed time, streak, and session code. The
Form opened in a new tab. The student reviewed the prefilled values and selected
Submit; the hub itself never wrote directly to Google Sheets.

## Known bugs and limitations

- Multiple-choice only: the current schema and editor require two through four
  choices. Vocabulary dropdowns, word banks, fill-ins, and short answers were
  discussed but not implemented.
- No course field: the hub distinguishes Vocabulary, Grammar, and Literature,
  but not Freshman English from AP Literature.
- The Google Form endpoint and field IDs are hard-coded in `app.js` rather than
  supplied through a configuration file or environment-specific build setting.
- Google Form submission is prefill-only. Students can edit values, must click
  Submit themselves, and the hub cannot verify submission or prevent duplicate
  responses.
- The results instruction is hard-coded by `renderResults()`. Although each
  session and the teacher editor contain `submissionInstruction`, a custom value
  does not control the final displayed instruction in the current runtime.
- Class-period normalization only converts a digits-only entry such as `2` to
  `Period 2`. Other wording must exactly match the Google Form option.
- The Form opens with `window.open`; a restrictive pop-up policy may require a
  same-tab or normal-link fallback.
- Active work is stored only in the current tab's `sessionStorage`; it does not
  follow a student between devices or browsers.
- Teacher drafts are stored only in that browser's `localStorage`. File-based
  browser origins can behave inconsistently, so exported JSON is the dependable
  backup.
- When time expires during an unanswered question, the runtime marks the timer
  expired but does not immediately close the session. The student can still
  answer that question and then select View Results.
- Question order is randomized and repeats after a complete shuffle bag. It is
  timed practice, not a fixed-length quiz.
- There is no backend, student authentication, roster integration, secure test
  mode, submission receipt, or teacher-controlled remote data store.
- The Form endpoint and answer data are client-visible. This was acceptable for
  low-stakes practice but is not a test-security design.

## Netlify-specific material not carried forward

The following old material was deliberately excluded:

- `UPLOAD-THIS-TO-NETLIFY.zip` and other ZIP archives;
- the outer folder named `UPLOAD THIS FOLDER TO NETLIFY` as a deployment unit;
- manual drag-and-drop deployment steps and Netlify credit guidance;
- duplicate output folders and duplicate session backups;
- the older standalone Independent or Dependent app, whose functionality is
  superseded by the generalized hub;
- old full-library recovery copies that duplicate the exported session content.

No application logic in the seven canonical static files depends on Netlify.
The relative paths, query-string direct links, and client-side Google Form
integration can be adapted to GitHub Pages.

## Reuse directly

- The two finished individual session JSON files.
- The session/question content model, with a new `course` field added during
  migration.
- Immediate-feedback behavior and instructional explanations.
- Score, accuracy, streak, elapsed-time, shuffle-bag, and review-topic logic.
- Direct links using a stable session ID.
- The Google Form field mapping and prefill construction, preferably moved into
  a dedicated configuration module.
- The accessible student screen structure and responsive CSS when the new app
  remains vanilla HTML/CSS/JavaScript.

## Use as design or migration reference

- `practice-library.js` and its global `window.PRACTICE_LIBRARY` wrapper if the
  new project uses JSON files, modules, or generated indexes.
- The teacher editor's localStorage draft and download-based publishing model.
  The editing interface and validation are useful, but GitHub-backed content
  management should replace manual file replacement.
- The exact homepage categories. The new project should organize activities by
  course as well as category and should preserve direct-link-first assignment.
- The hard-coded results Form configuration and hard-coded submission text.
  Preserve the behavior, but centralize configuration.
- The old branding and wording where English Practice Lab needs a new identity.

## Recommended first migration decisions

1. Add `course` as a first-class session field while preserving `category`.
2. Decide whether sessions will remain individual JSON files committed to the
   repository or be compiled into a generated library index.
3. Keep stable query-string session links or provide redirects if a router is
   introduced.
4. Move the Google Form endpoint and entry IDs into one configuration file.
5. Decide whether the teacher editor remains a local utility or becomes a
   GitHub-aware authoring workflow.
6. Add the planned vocabulary word-bank/dropdown question type as a schema
   version upgrade rather than overloading the legacy multiple-choice format.
