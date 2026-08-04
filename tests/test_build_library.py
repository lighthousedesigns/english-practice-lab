import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "build-library.py"
SPEC = importlib.util.spec_from_file_location("build_library", SCRIPT_PATH)
assert SPEC and SPEC.loader
BUILD_LIBRARY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD_LIBRARY)


class BuildLibraryTests(unittest.TestCase):
    def test_repository_sessions_are_valid_and_recursively_discovered(self):
        sessions, errors = BUILD_LIBRARY.load_sessions()
        self.assertEqual(errors, [])
        self.assertEqual(
            {session["id"] for session in sessions},
            {
                "independent-or-dependent",
                "prototype-classification-question-type",
                "types-of-sentences",
            },
        )

    def test_nested_future_course_and_category_need_no_code_change(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            nested = root / "future-course" / "future-category"
            nested.mkdir(parents=True)
            session = {
                "id": "future-session",
                "title": "Future Session",
                "course": "A Future Course",
                "category": "A Future Category",
                "description": "Description",
                "directions": "Directions",
                "durationMinutes": 5,
                "listed": True,
                "submissionInstruction": "Submit results.",
                "questions": [
                    {
                        "id": "q1",
                        "prompt": "Prompt",
                        "choices": ["Yes", "No"],
                        "correctIndex": 0,
                        "explanation": "Explanation",
                    }
                ],
            }
            (nested / "future-session.json").write_text(json.dumps(session), encoding="utf-8")

            sessions, errors = BUILD_LIBRARY.load_sessions(root)

            self.assertEqual(errors, [])
            self.assertEqual([item["id"] for item in sessions], ["future-session"])

    def test_mixed_question_types_and_classification_references_are_validated(self):
        session = {
            "id": "mixed-session",
            "title": "Mixed Session",
            "course": "Course",
            "category": "Category",
            "description": "Description",
            "directions": "Directions",
            "durationMinutes": 5,
            "listed": False,
            "submissionInstruction": "Do not submit.",
            "questions": [
                {
                    "id": "legacy-multiple-choice",
                    "prompt": "Choose.",
                    "choices": ["Yes", "No"],
                    "correctIndex": 0,
                    "explanation": "Yes.",
                },
                {
                    "id": "classification",
                    "type": "classification",
                    "prompt": "Sort.",
                    "categories": [
                        {"id": "one", "label": "One"},
                        {"id": "two", "label": "Two"},
                    ],
                    "items": [
                        {"id": "a", "text": "A", "correctCategoryId": "one"},
                        {"id": "b", "text": "B", "correctCategoryId": "two"},
                    ],
                    "explanation": "Sorted.",
                },
            ],
        }

        self.assertEqual(BUILD_LIBRARY.validate_session(session, Path("mixed.json")), [])

        session["questions"][1]["items"][0]["correctCategoryId"] = "missing"
        errors = BUILD_LIBRARY.validate_session(session, Path("mixed.json"))
        self.assertTrue(any("does not match a category ID" in error for error in errors))

        session["questions"][1]["type"] = "word-bank"
        errors = BUILD_LIBRARY.validate_session(session, Path("mixed.json"))
        self.assertTrue(any("type must be one of" in error for error in errors))

    def test_duplicate_session_ids_are_rejected_across_folders(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = json.loads(
                (
                    Path(__file__).resolve().parents[1]
                    / "sessions"
                    / "freshman-english"
                    / "grammar"
                    / "types-of-sentences.json"
                ).read_text(encoding="utf-8")
            )
            for folder in (root / "one", root / "two"):
                folder.mkdir(parents=True)
                (folder / "session.json").write_text(json.dumps(source), encoding="utf-8")

            sessions, errors = BUILD_LIBRARY.load_sessions(root)

            self.assertEqual(len(sessions), 1)
            self.assertTrue(any("already used" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
