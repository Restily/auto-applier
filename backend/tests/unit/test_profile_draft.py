"""Unit tests for ProfileDraft normalization (limits mirror the SQL and zod definitions)."""

from typing import Any

import pytest

from autoapplier.domain.profile import (
    PROFILE_LIMITS,
    ProfileDraft,
    normalize_draft,
    profile_draft_json_schema,
)

RAW: dict[str, Any] = {
    "full_name": "  Alex Ivanov ",
    "contact_email": "alex@example.test",
    "phone": "+1 555 0100",
    "location": "Berlin",
    "headline": "Backend engineer",
    "target_titles": ["Backend Engineer"],
    "skills": ["Python", "SQL"],
    "years_experience": "6_10",
    "experience": [
        {
            "title": "Engineer",
            "company": "Acme",
            "start": "2019-03",
            "end": None,
            "current": True,
            "description": "Built things",
        }
    ],
    "education": [{"institution": "TU Berlin", "degree": "BSc", "field": "CS", "end_year": 2014}],
    "languages": [{"name": "English", "level": "fluent"}],
    "links": {"linkedin": "https://linkedin.com/in/alex", "portfolio": None},
}


def test_fixture_draft_normalizes_to_expected_fields() -> None:
    draft = normalize_draft(RAW)

    assert isinstance(draft, ProfileDraft)
    assert draft.full_name == "Alex Ivanov"
    assert draft.years_experience == "6_10"
    assert draft.experience[0].start == "2019-03"
    assert draft.experience[0].current is True
    assert draft.education[0].end_year == 2014
    assert draft.languages[0].level == "fluent"
    assert draft.links.linkedin == "https://linkedin.com/in/alex"


def test_invalid_email_and_url_dropped() -> None:
    draft = normalize_draft(
        {
            **RAW,
            "contact_email": "not-an-email",
            "links": {"linkedin": "javascript:x", "portfolio": "nope"},
        }
    )

    assert draft.contact_email is None
    assert draft.links.linkedin is None
    assert draft.links.portfolio is None


def test_titles_and_skills_deduped_case_insensitive() -> None:
    draft = normalize_draft(
        {**RAW, "target_titles": ["Dev", "dev", " DEV "], "skills": ["Python", "python", "Go"]}
    )

    assert draft.target_titles == ["Dev"]
    assert draft.skills == ["Python", "Go"]


def test_lists_truncated_to_limits() -> None:
    draft = normalize_draft(
        {
            **RAW,
            "target_titles": [f"t{i}" for i in range(PROFILE_LIMITS["titles_max"] + 1)],
            "skills": [f"s{i}" for i in range(PROFILE_LIMITS["skills_max"] + 1)],
            "experience": [{"title": f"e{i}"} for i in range(PROFILE_LIMITS["experience_max"] + 1)],
            "education": [
                {"institution": f"i{i}"} for i in range(PROFILE_LIMITS["education_max"] + 1)
            ],
            "languages": [{"name": f"l{i}"} for i in range(PROFILE_LIMITS["languages_max"] + 1)],
        }
    )

    assert len(draft.target_titles) == PROFILE_LIMITS["titles_max"]
    assert len(draft.skills) == PROFILE_LIMITS["skills_max"]
    assert len(draft.experience) == PROFILE_LIMITS["experience_max"]
    assert len(draft.education) == PROFILE_LIMITS["education_max"]
    assert len(draft.languages) == PROFILE_LIMITS["languages_max"]


@pytest.mark.parametrize("field", ["full_name", "phone", "location", "headline"])
def test_strings_truncated_to_profile_limits(field: str) -> None:
    n = PROFILE_LIMITS[field]

    kept = normalize_draft({field: "a" * n})
    cut = normalize_draft({field: "a" * (n + 1)})

    assert getattr(kept, field) == "a" * n
    assert getattr(cut, field) == "a" * n


def test_entry_strings_and_items_truncated() -> None:
    draft = normalize_draft(
        {
            "target_titles": ["t" * (PROFILE_LIMITS["title_item"] + 1)],
            "skills": ["s" * (PROFILE_LIMITS["skill_item"] + 1)],
            "experience": [
                {
                    "title": "x" * (PROFILE_LIMITS["entry_text"] + 1),
                    "description": "d" * (PROFILE_LIMITS["description"] + 1),
                }
            ],
            "languages": [{"name": "n" * (PROFILE_LIMITS["language_name"] + 1)}],
        }
    )

    assert len(draft.target_titles[0]) == PROFILE_LIMITS["title_item"]
    assert len(draft.skills[0]) == PROFILE_LIMITS["skill_item"]
    assert len(draft.experience[0].title) == PROFILE_LIMITS["entry_text"]
    assert draft.experience[0].description is not None
    assert len(draft.experience[0].description) == PROFILE_LIMITS["description"]
    assert len(draft.languages[0].name) == PROFILE_LIMITS["language_name"]


def test_email_and_url_length_limits() -> None:
    long_email = "a" * (PROFILE_LIMITS["contact_email"]) + "@example.test"
    long_url = "https://example.test/" + "a" * PROFILE_LIMITS["url"]

    draft = normalize_draft({"contact_email": long_email, "links": {"linkedin": long_url}})

    assert draft.contact_email is None
    assert draft.links.linkedin is None


def test_wrong_shapes_default_without_raising() -> None:
    draft = normalize_draft(
        {
            "full_name": 42,
            "target_titles": "oops",
            "skills": [1, None, "ok"],
            "years_experience": "forever",
            "experience": [{"title": "T", "start": "March 2019", "end": "2020-13"}, "junk", 5],
            "education": {"a": 1},
            "languages": [{"name": "En", "level": "godlike"}],
            "links": "x",
        }
    )

    assert draft.full_name is None
    assert draft.target_titles == []
    assert draft.skills == ["ok"]
    assert draft.years_experience is None
    assert len(draft.experience) == 1
    assert draft.experience[0].start is None
    assert draft.experience[0].end is None
    assert draft.education == []
    assert draft.languages[0].level is None
    assert draft.links.linkedin is None
    assert normalize_draft({}).skills == []


def test_non_mapping_raises_value_error() -> None:
    with pytest.raises(ValueError, match="mapping"):
        normalize_draft(["not", "a", "mapping"])  # type: ignore[arg-type]


def _check_strict(node: Any) -> None:
    if isinstance(node, dict):
        if node.get("type") == "object":
            assert node["additionalProperties"] is False
            assert set(node["required"]) == set(node["properties"])
        for value in node.values():
            _check_strict(value)
    elif isinstance(node, list):
        for value in node:
            _check_strict(value)


def test_json_schema_is_strict() -> None:
    schema = profile_draft_json_schema()

    assert schema["type"] == "object"
    assert "$ref" not in str(schema)
    assert "$defs" not in schema
    _check_strict(schema)


@pytest.mark.parametrize("bad", ["http://[x", "https://[::1", "http://[", "https://exa mple.test"])
def test_malformed_urls_are_dropped_not_raised(bad: str) -> None:
    draft = normalize_draft({"full_name": "A", "links": {"linkedin": bad, "portfolio": bad}})

    assert draft.links.linkedin is None
    assert draft.links.portfolio is None
    assert draft.full_name == "A"
