# Google Form results integration

## Form endpoint

`https://docs.google.com/forms/d/e/1FAIpQLScknuZPKiVto0siaxJHnY7RacZociqH6USG5PKFbqoKQ2kSGg/viewform`

This is a public form endpoint, not a password or API credential. The mapping
is hard-coded near the top of `../app/app.js` in `resultsForm`.

## Confirmed field mapping

| Hub result | Google Form field |
| --- | --- |
| Last name | `entry.309227154` |
| First name | `entry.60527458` |
| Class period | `entry.1018386785` |
| Practice session title | `entry.1086419845` |
| Questions attempted | `entry.1542252984` |
| Correct | `entry.2031693750` |
| Incorrect | `entry.2142268151` |
| Accuracy percentage | `entry.470351220` |
| Elapsed practice time | `entry.1586600608` |
| Longest correct streak | `entry.742419434` |
| Eight-character session code | `entry.1642617159` |

## Submission flow

1. `renderResults()` displays the final performance summary.
2. The student selects **Submit Results to Google Form**.
3. `submitResults()` creates a new `URL` for the endpoint above.
4. It adds `usp=pp_url` and every `entry.NUMBER=value` pair with
   `URLSearchParams`.
5. `formatClassPeriod()` changes a number such as `2` to `Period 2` so it can
   match the form option.
6. The code opens the prefilled Google Form in a new tab.
7. The student reviews the editable prefilled fields and manually selects
   **Submit**. Google Forms then records the response in its linked Sheet.

## Integration cautions

- The hub does not submit directly and does not receive confirmation that the
  student submitted the form.
- Prefilled values are editable by the student; this was intentionally accepted
  because the activities were low-stakes practice rather than secure tests.
- Deleting or recreating a Google Form question can change its `entry` ID.
  Generate a new prefilled link and update the mapping after structural form
  changes.
- Dropdown values must match the Form's option text. The legacy code expects
  class periods in the form `Period 2`.
- A browser or district policy could block the new tab. A future implementation
  can use same-tab navigation or a normal anchor as a fallback.
- The Form URL and entry IDs are visible in client-side source. Do not treat
  them as authentication or anti-tampering controls.
