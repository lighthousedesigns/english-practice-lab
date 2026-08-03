#!/usr/bin/env python3
"""Validate every canonical session recursively and build the browser library."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SESSIONS_DIRECTORY = PROJECT_ROOT / "sessions"
OUTPUT_FILE = PROJECT_ROOT / "docs" / "practice-library.js"
REQUIRED_TEXT_FIELDS = (
    "id",
    "title",
    "course",
    "category",
    "description",
    "directions",
    "submissionInstruction",
)
REQUIRED_QUESTION_TEXT_FIELDS = ("id", "prompt", "explanation")


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def validate_session(session: Any, path: Path) -> list[str]:
    """Return human-readable validation errors for one session object."""
    label = display_path(path)
    errors: list[str] = []
    if not isinstance(session, dict):
        return [f"{label}: the file must contain one JSON object."]

    for field in REQUIRED_TEXT_FIELDS:
        if not isinstance(session.get(field), str) or not session[field].strip():
            errors.append(f"{label}: {field} must be a non-empty string.")

    duration = session.get("durationMinutes")
    if isinstance(duration, bool) or not isinstance(duration, int) or not 1 <= duration <= 60:
        errors.append(f"{label}: durationMinutes must be an integer from 1 through 60.")
    if not isinstance(session.get("listed"), bool):
        errors.append(f"{label}: listed must be true or false.")

    questions = session.get("questions")
    if not isinstance(questions, list) or not questions:
        errors.append(f"{label}: questions must be a non-empty array.")
        return errors

    question_ids: dict[str, int] = {}
    for index, question in enumerate(questions, start=1):
        question_label = f"{label}, question {index}"
        if not isinstance(question, dict):
            errors.append(f"{question_label}: the question must be an object.")
            continue
        for field in REQUIRED_QUESTION_TEXT_FIELDS:
            if not isinstance(question.get(field), str) or not question[field].strip():
                errors.append(f"{question_label}: {field} must be a non-empty string.")

        question_id = question.get("id")
        if isinstance(question_id, str) and question_id.strip():
            if question_id in question_ids:
                errors.append(
                    f"{question_label}: question ID {question_id!r} duplicates question {question_ids[question_id]}."
                )
            else:
                question_ids[question_id] = index

        choices = question.get("choices")
        valid_choices = (
            isinstance(choices, list)
            and 2 <= len(choices) <= 4
            and all(isinstance(choice, str) and choice.strip() for choice in choices)
        )
        if not valid_choices:
            errors.append(f"{question_label}: choices must contain two through four non-empty strings.")

        correct_index = question.get("correctIndex")
        if (
            isinstance(correct_index, bool)
            or not isinstance(correct_index, int)
            or not isinstance(choices, list)
            or not 0 <= correct_index < len(choices)
        ):
            errors.append(f"{question_label}: correctIndex must point to an existing choice.")

        review_topic = question.get("reviewTopic")
        if review_topic is not None and not isinstance(review_topic, str):
            errors.append(f"{question_label}: reviewTopic must be a string when present.")

    return errors


def load_sessions(directory: Path = SESSIONS_DIRECTORY) -> tuple[list[dict[str, Any]], list[str]]:
    """Recursively discover, parse, validate, and sort every JSON session."""
    paths = sorted(directory.rglob("*.json")) if directory.exists() else []
    if not paths:
        return [], [f"{display_path(directory)}: no session JSON files were found."]

    sessions: list[dict[str, Any]] = []
    errors: list[str] = []
    session_sources: dict[str, Path] = {}
    for path in paths:
        try:
            session = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            errors.append(f"{display_path(path)}: could not read valid JSON ({error}).")
            continue

        file_errors = validate_session(session, path)
        errors.extend(file_errors)
        if file_errors or not isinstance(session, dict):
            continue

        session_id = session["id"]
        if session_id in session_sources:
            errors.append(
                f"{display_path(path)}: session ID {session_id!r} is already used by "
                f"{display_path(session_sources[session_id])}."
            )
            continue
        session_sources[session_id] = path
        sessions.append(session)

    sessions.sort(
        key=lambda session: (
            session["course"].casefold(),
            session["category"].casefold(),
            session["title"].casefold(),
            session["id"],
        )
    )
    return sessions, errors


def render_library(sessions: list[dict[str, Any]]) -> str:
    payload = {"version": 2, "sessions": sessions}
    return (
        "// Generated by scripts/build-library.py from sessions/**/*.json.\n"
        "// Do not edit this file manually.\n"
        "window.PRACTICE_LIBRARY = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate sessions and fail if docs/practice-library.js is missing or out of date",
    )
    arguments = parser.parse_args(argv)

    sessions, errors = load_sessions()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    content = render_library(sessions)
    if arguments.check:
        try:
            current = OUTPUT_FILE.read_text(encoding="utf-8")
        except OSError:
            current = ""
        if current != content:
            print("ERROR: docs/practice-library.js is missing or out of date.", file=sys.stderr)
            print("Run: python3 scripts/build-library.py", file=sys.stderr)
            return 1
        print(f"Validated {len(sessions)} sessions; generated library is current.")
        return 0

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(content, encoding="utf-8")
    print(f"Validated {len(sessions)} sessions and wrote {display_path(OUTPUT_FILE)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
