# Legacy session-data format

The old hub used one JSON object per practice session. Complete examples are in
`../sessions/` and the machine-readable schema is `session.schema.json`.

## Session fields

| Field | Meaning |
| --- | --- |
| `id` | Stable unique ID. It formed the direct-link query value: `?session=ID`. |
| `title` | Student-facing activity title and the value sent to Google Forms. |
| `category` | Exactly `Vocabulary`, `Grammar`, or `Literature`. |
| `description` | Short summary shown before practice begins. |
| `directions` | Student directions shown on the start screen. |
| `durationMinutes` | Timed-session length, validated from 1 through 60 minutes. |
| `listed` | Whether the session appeared on the hub homepage. Direct links still opened unlisted sessions. |
| `submissionInstruction` | Legacy result-submission message. The final runtime hard-coded the Google Form instruction instead; see the limitations in `../MIGRATION-NOTES.md`. |
| `questions` | Ordered array of question objects. The runtime randomized them into a shuffle bag. |

The legacy format did **not** contain a separate `course` field. `category` was
the only grouping field. English Practice Lab should add a stable course value
such as `Freshman English` or `AP Literature` instead of trying to infer course
from the title.

## Question fields

| Field | Meaning |
| --- | --- |
| `id` | Unique question ID within the session. |
| `prompt` | Question or sentence displayed to the student. |
| `choices` | Two through four answer choices. |
| `correctIndex` | Zero-based position of the correct answer in `choices`. |
| `explanation` | Required instructional explanation shown after the answer. |
| `reviewTopic` | Optional skill label used for the final review and performance-by-skill sections. |

## Current limitations of the format

- It represents multiple-choice questions only.
- It limits questions to two through four choices.
- It has no course, unit, standard, difficulty, tags, vocabulary word bank, or
  short-answer question type.
- Correctness is represented by a positional index, so reordering `choices`
  requires updating `correctIndex`.
- Session and question IDs are validated for uniqueness only within the loaded
  library/session; their string style is not otherwise strictly enforced.
