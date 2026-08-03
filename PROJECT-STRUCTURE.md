# Mr. Rea’s English Practice Lab project structure

Mr. Rea’s English Practice Lab is a static, direct-link assignment website. Students do not need an account in the application, and the site does not need a database or application server. Activities are not presented in a browsable homepage library; each assignment opens through its stable `?session=ID` link.

## `legacy-reference/`

This is an unchanged archive of the strongest completed work from the earlier English Practice Hub. It contains the old student application, teacher editor, styles, published-library wrapper, two finished sessions, legacy schema documentation, migration notes, and the Google Form field map. Use it to understand previous behavior or recover a design decision. Do not edit it as part of normal development, and do not publish from it.

## `sessions/`

This folder contains the canonical authored activities. Each activity is one JSON file, and this is the only place where question content should be edited.

Organize files in course and category folders so teachers can find them easily. For example:

```text
sessions/
  freshman-english/
    grammar/
      independent-or-dependent.json
      types-of-sentences.json
    vocabulary/
    literature/
  ap-literature/
    literary-analysis/
    vocabulary/
    text-specific/
```

Git does not preserve empty folders, so create a course or category folder when its first session is ready.

Folder names are for teacher organization only. The `course` and `category` values inside a session supply the label displayed on the activity. The internal `id` is the permanent public key used in direct links. Moving a file to another folder does not change its link. Do not change an existing ID after a link has been assigned.

Course and category names are open-ended. Adding a new course or category requires only a new folder and valid session files; the build script and website do not contain a fixed list of names.

## `schema/`

`schema/session.schema.json` is the machine-readable description of a valid session. It documents required session metadata and the current multiple-choice question format. Update the schema deliberately when the data format gains a new capability.

## `scripts/build-library.py`

The build script recursively finds every `.json` file anywhere below `sessions/`. It validates the required metadata, questions, choices, answer indexes, and IDs; rejects duplicate session IDs across folders; sorts the activities consistently; and generates the browser-readable library.

Run it from the repository root:

```sh
python3 scripts/build-library.py
```

Use check mode to validate all sessions and confirm the generated file is current without changing files:

```sh
python3 scripts/build-library.py --check
```

## `docs/`

This is the complete GitHub Pages website. GitHub Pages should be configured to publish the `/docs` folder from the repository's main branch. `docs/index.html` can also be opened directly in a browser for local practice. Opening the site without a valid `session` parameter shows a neutral instruction to use the activity link assigned by the teacher; it does not list activities.

`docs/config.js` contains the shared product name, public Google Form endpoint, entry-field mapping, and default submission instruction. The product name is applied by `docs/app.js` to every activity and site state; do not add it to individual session files. `docs/app.js` contains the student practice behavior, and `docs/styles.css` contains the visual and print styles.

`docs/practice-library.js` is generated from the canonical files in `sessions/`. Never edit it manually. Always regenerate it with `scripts/build-library.py` and commit it together with the session changes that produced it.

## Repeatable activity workflow

1. Choose or create the appropriate teacher-organization folders beneath `sessions/`. Folder names do not become website metadata automatically.
2. Copy a valid session JSON file as a starting point. Give a new activity a unique, URL-safe `id`; set its student-facing `course`, `category`, title, description, directions, duration, compatibility `listed` value, submission fallback, and questions. Never reuse another activity's ID. The current direct-link website does not use `listed` to create a homepage.
3. Run `python3 scripts/build-library.py`. Resolve every reported error. This updates `docs/practice-library.js`.
4. Run `python3 -m unittest discover -s tests`, `node tests/runtime-smoke-test.js`, and `python3 scripts/build-library.py --check`.
5. Open `docs/index.html` locally and confirm that it asks for the teacher-assigned activity link rather than listing sessions. Test the new direct link with `?session=SESSION-ID`, confirm the course/category label, complete several questions, confirm feedback and explanations, let the timer expire once, verify the final score and other metrics, refresh to test recovery, check print/PDF layout, and confirm the Google Form opens with all result fields prefilled. Do not submit test data to the live Form unless that test response is intentional.
6. Commit the new or changed file under `sessions/` and the regenerated `docs/practice-library.js` together. Push the repository's publishing branch. GitHub Pages will publish the contents of `/docs`.
7. Share a direct link in this form: `https://ACCOUNT.github.io/REPOSITORY/?session=SESSION-ID`. Keep the ID unchanged for the life of that link. Every activity is assigned through its direct link regardless of its compatibility `listed` value.

Following this process keeps the activity collection open-ended: any number of future courses, categories, folders, and valid session files can be added without changing the application's core code.
