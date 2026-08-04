# Supported question types

This file is the authoring contract for reusable question interactions in Mr. Rea’s English Practice Lab. Before creating activity content, use one of the supported types below whenever it meets the instructional need. Question type is set on each question, so one session may mix types.

Every completed question produces a common result record with `questionId`, `type`, `pointsEarned`, `pointsPossible`, `correct`, `firstAttemptCorrect`, `attemptCount`, `reviewTopic`, and `answeredAt`. Type-specific response details are added to that record. Overall score, accuracy, skill summaries, final results, and Google Form values use the sum of points earned and points possible.

## Multiple-choice

- Official type identifier: `multiple-choice`
- Appropriate uses: selecting one best response, identifying a clause or sentence type, checking definitions, and other prompts with one correct choice.
- Backward compatibility: `type` is optional. A question without `type` is treated as `multiple-choice`.

### Fields

Required:

- `id`: non-empty question ID unique within the session.
- `prompt`: text shown to the student.
- `choices`: two through four non-empty answer strings.
- `correctIndex`: zero-based index of the correct choice.
- `explanation`: instructional feedback shown after the response.

Optional:

- `type`: use `multiple-choice` for an explicit declaration, or omit it for backward compatibility.
- `reviewTopic`: skill label used in the final performance-by-skill summary. If omitted, the runtime uses `General review`.

### Complete example

```json
{
  "id": "sentence-type-1",
  "type": "multiple-choice",
  "prompt": "The rain stopped, and the players returned to the field.",
  "choices": [
    "Simple",
    "Compound",
    "Complex"
  ],
  "correctIndex": 1,
  "explanation": "The sentence has two independent clauses joined by the coordinating conjunction “and.”",
  "reviewTopic": "Compound sentences"
}
```

### Scoring, feedback, and retry

The response is checked immediately and produces either 1 of 1 point or 0 of 1 points. The correct answer and explanation appear after the answer. There is no retry within the same presentation; practice continues with the next randomly selected question. A later repeat of the question is a new result record.

### Accessibility and Chromebook expectations

Choices are native buttons and work with mouse, touch, trackpad, Tab, Shift+Tab, Enter, and Space. Focus moves to the feedback action after an answer. Layout collapses to one column on smaller screens.

### Result data and known limitations

The common record also includes `choiceIndex` and `correctIndex`. Only one correct choice is supported. Choice-level partial credit and multiple-select responses are not supported.

## Classification

- Official type identifier: `classification`
- Appropriate uses: sorting clauses, sentences, examples, traits, or terms into two through six named categories.
- Recommended size: use concise item text and enough items to make the item-level score meaningful without overwhelming a Chromebook screen.

### Fields

Required:

- `id`: non-empty question ID unique within the session.
- `type`: exactly `classification`.
- `prompt`: classification task shown to the student.
- `categories`: two through six objects. Each has a non-empty `id` unique within the question and a non-empty student-facing `label`.
- `items`: two through twelve objects. Each has a non-empty `id` unique within the question, non-empty `text`, and `correctCategoryId` matching a category ID in the same question.
- `explanation`: instructional summary shown when correction is complete.

Optional:

- `reviewTopic`: skill label used in the final performance-by-skill summary. If omitted, the runtime uses `General review`.

Category and item IDs are response keys. Keep them stable after a session is shared, especially when students could restore an in-progress session after a content update.

### Complete example

```json
{
  "id": "classify-clauses-1",
  "type": "classification",
  "prompt": "Sort each clause by whether it expresses a complete thought.",
  "categories": [
    {
      "id": "independent",
      "label": "Independent Clause"
    },
    {
      "id": "dependent",
      "label": "Dependent Clause"
    }
  ],
  "items": [
    {
      "id": "item-1",
      "text": "The auditorium doors opened at seven",
      "correctCategoryId": "independent"
    },
    {
      "id": "item-2",
      "text": "Because the auditorium doors opened at seven",
      "correctCategoryId": "dependent"
    },
    {
      "id": "item-3",
      "text": "Our team practiced after school",
      "correctCategoryId": "independent"
    },
    {
      "id": "item-4",
      "text": "Although our team practiced after school",
      "correctCategoryId": "dependent"
    }
  ],
  "explanation": "Independent clauses express complete thoughts. Dependent clauses begin with subordinating words and need an independent clause to complete their meaning.",
  "reviewTopic": "Independent and dependent clauses"
}
```

### Interaction, scoring, feedback, and retry

Students can drag an item to a category or select an item and then activate a category. All items must be placed before `Check Classification` is enabled.

The first check determines the recorded score: each correctly classified item earns 1 point and each item is worth 1 point. Correct items are marked and locked. Incorrect items are marked but remain movable. The student moves the incorrect items and selects `Check Corrections` until all are correct. Later correction improves understanding but does not replace the recorded first-check score. The final explanation reports the first-check points and then allows the student to continue.

`correct` and `firstAttemptCorrect` are true only when every item was correct on the first check. `attemptCount` is the number of checks used to finish the question.

### Accessibility and Chromebook expectations

- Dragging is optional and is never the only completion method.
- Item controls and category targets are keyboard focusable. Use Tab or Shift+Tab to move, Enter or Space to select an item, and Enter or Space on a category to place it.
- Selected, placed, correct, and incorrect states use text/ARIA information and high-contrast borders/backgrounds rather than color alone.
- A live status message reports selection, placement progress, and correction instructions.
- Category columns collapse to one column on narrow Chromebook, tablet, and phone screens. Touch actions use the select-then-category path because browser HTML dragging is inconsistent on touchscreens.
- Progress is saved to session storage after every selection, placement, clear, and check, so refreshing the same tab restores an unfinished classification.

### Result data and known limitations

The common record also includes:

- `completedCorrections`: whether the student corrected every item before continuing or time/session end.
- `placements`: final mapping from item ID to selected category ID.
- `itemResults`: one entry per item with `itemId`, final `categoryId`, `correctCategoryId`, and `firstAttemptCorrect`.

Current limitations:

- Every item belongs to exactly one category.
- Categories and item order are authored; they are not randomized inside a classification question.
- Item-level explanations and custom per-question retry policies are not supported; use the question-level `explanation` and the standard correction policy.
- Native HTML drag-and-drop is intended for mouse or trackpad. Touch and assistive-technology users should use the fully supported select-then-category interaction.
