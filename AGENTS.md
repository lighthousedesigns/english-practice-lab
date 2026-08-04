# Project instructions

## Purpose

Mr. Rea’s English Practice Lab is a static GitHub Pages application for direct-link English practice activities. Students normally open a specific `?session=ID` assignment rather than browse a session hub. Keep the application usable locally in a browser without student accounts, a backend, or a database.

## Canonical sources

- JSON files anywhere beneath `sessions/` are the canonical authored activities. Edit question content there.
- `docs/practice-library.js` is generated output. Never edit it manually; regenerate it with `python3 scripts/build-library.py`.
- Treat each session’s internal `id` as a permanent public key once its link has been shared. Do not rename, reuse, or casually replace stable IDs.
- `schema/session.schema.json` documents the session format. Change it deliberately when adding a real format capability, and keep generator and runtime validation aligned.

## Folder and architecture rules

- `legacy-reference/` is an untouched migration archive. Read it for historical context, but do not modify or publish from it.
- Organize `sessions/` by course and category for teacher convenience. Folder names do not control student-facing metadata or links.
- Keep `scripts/build-library.py` recursively discovering every `.json` file beneath `sessions/`.
- Courses and categories are open-ended. Never hard-code the current course or category names into the generator or core application.
- `docs/` is the complete GitHub Pages website. Keep the existing small vanilla HTML/CSS/JavaScript architecture unless a different architecture is explicitly requested and justified.
- Keep the generated site usable by opening `docs/index.html` directly, without requiring a development server.
- Do not change the GitHub Pages publishing source from `main` and `/docs` unless explicitly requested.

## Student experience

- Preserve direct links in the form `?session=ID`, including clear neutral-root and invalid-session states.
- Preserve one-question-at-a-time practice, immediate feedback and explanations, score, accuracy, streak, elapsed time, refresh recovery, timeout completion, results, session code, printing/PDF, and Google Form prefilling.
- Keep the interface clean, accessible, responsive, and Chromebook-friendly.
- Do not turn the neutral root screen into a browsable activity hub or add cross-session navigation unless explicitly requested. The compatibility `listed` field does not change this behavior.
- Keep shared product branding and Google Form settings centralized in `docs/config.js`; do not copy product branding into session JSON files.

## Google Form and privacy

- Preserve the existing Form URL and entry-field mapping unless the user supplies or authorizes verified replacements. Never invent Form entry IDs.
- Do not add student data, responses, credentials, tokens, private Sheet information, or other secrets to the repository.
- Do not submit test responses to the live Google Form unless the submission is explicitly intended.

## Change workflow

1. Read `PROJECT-STRUCTURE.md`, `QUESTION-TYPES.md`, and the relevant current source, schema, configuration, and tests before editing. Use an existing supported question type before inventing new interaction code.
2. For activity changes, edit canonical JSON beneath `sessions/`, not `docs/practice-library.js`.
3. After session changes, run `python3 scripts/build-library.py` and include the regenerated library with the canonical changes.
4. Whenever an activity is created, deleted, renamed, or its stable `id` changes, update `ACTIVITY-LINKS.md` from the canonical session files in the same change.
5. Run all relevant checks. The normal baseline is:

   ```sh
   python3 scripts/build-library.py --check
   python3 -m unittest discover -s tests
   node tests/runtime-smoke-test.js
   ```

6. When behavior or sessions change, verify the affected `?session=ID` links and the neutral and invalid states as appropriate.
7. Update `PROJECT-STRUCTURE.md` when the repository structure or normal workflow materially changes.
8. Report exactly which files changed, which checks ran, and whether direct-link behavior remains intact.

## Scope discipline

- Prefer small, focused changes that preserve established behavior and authored content.
- Do not add frameworks, backends, authentication, databases, build systems, or new dependencies unless clearly justified and explicitly requested.
- Do not redevelop the teacher editor unless explicitly requested.
- Preserve unrelated user changes and do not commit unless asked.
