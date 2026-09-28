"""ProfileDraft: what resume extraction proposes for a candidate profile.

`normalize_draft` turns untrusted LLM output into a valid draft: it trims,
drops malformed values, dedupes and truncates to `PROFILE_LIMITS`. The limits
and enums are duplicated in SQL (checks and trigger) and in zod; each side is
tested at N and N+1.
"""

import re
from collections.abc import Mapping
from typing import Any, Final, Literal, get_args
from urllib.parse import urlparse

from pydantic import BaseModel, Field

YearsExperience = Literal["lt_1", "1_2", "3_5", "6_10", "10_plus"]
LanguageLevel = Literal["native", "fluent", "advanced", "intermediate", "basic"]

PROFILE_LIMITS: Final[Mapping[str, int]] = {
    "full_name": 200,
    "contact_email": 320,
    "phone": 50,
    "location": 200,
    "headline": 300,
    "url": 500,
    "work_authorization_other": 200,
    "title_item": 100,
    "titles_max": 10,
    "skill_item": 60,
    "skills_max": 100,
    "entry_text": 200,
    "language_name": 100,
    "description": 2000,
    "experience_max": 50,
    "education_max": 20,
    "languages_max": 20,
}

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class ExperienceEntry(BaseModel):
    title: str
    company: str | None = None
    start: str | None = None  # "YYYY-MM"
    end: str | None = None  # "YYYY-MM"
    current: bool = False
    description: str | None = None


class EducationEntry(BaseModel):
    institution: str
    degree: str | None = None
    field: str | None = None
    end_year: int | None = None


class LanguageEntry(BaseModel):
    name: str
    level: LanguageLevel | None = None


class ProfileLinks(BaseModel):
    linkedin: str | None = None
    portfolio: str | None = None


class ProfileDraft(BaseModel):
    full_name: str | None = None
    contact_email: str | None = None
    phone: str | None = None
    location: str | None = None
    headline: str | None = None
    target_titles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    years_experience: YearsExperience | None = None
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    languages: list[LanguageEntry] = Field(default_factory=list)
    links: ProfileLinks = Field(default_factory=ProfileLinks)


def _text(value: Any, limit: int) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()[:limit].strip()
    return trimmed or None


def _email(value: Any) -> str | None:
    text = _text(value, PROFILE_LIMITS["contact_email"] + 1)
    if text is None or len(text) > PROFILE_LIMITS["contact_email"] or not _EMAIL_RE.match(text):
        return None
    return text


def _url(value: Any) -> str | None:
    text = _text(value, PROFILE_LIMITS["url"] + 1)
    if text is None or len(text) > PROFILE_LIMITS["url"]:
        return None
    parsed = urlparse(text)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or " " in text:
        return None
    return text


def _month(value: Any) -> str | None:
    return value if isinstance(value, str) and _MONTH_RE.match(value) else None


def _enum(value: Any, allowed: tuple[str, ...]) -> str | None:
    return value if isinstance(value, str) and value in allowed else None


def _unique_strings(value: Any, item_limit: int, max_items: int) -> list[str]:
    if not isinstance(value, list):
        return []
    seen: set[str] = set()
    result: list[str] = []
    for item in value:
        text = _text(item, item_limit)
        if text is None or text.casefold() in seen:
            continue
        seen.add(text.casefold())
        result.append(text)
    return result[:max_items]


def _dicts(value: Any) -> list[Mapping[str, Any]]:
    return [item for item in value if isinstance(item, Mapping)] if isinstance(value, list) else []


def _experience(value: Any) -> list[ExperienceEntry]:
    limit = PROFILE_LIMITS["entry_text"]
    entries: list[ExperienceEntry] = []
    for item in _dicts(value):
        title = _text(item.get("title"), limit)
        if title is None:
            continue
        entries.append(
            ExperienceEntry(
                title=title,
                company=_text(item.get("company"), limit),
                start=_month(item.get("start")),
                end=_month(item.get("end")),
                current=item.get("current") is True,
                description=_text(item.get("description"), PROFILE_LIMITS["description"]),
            )
        )
    return entries[: PROFILE_LIMITS["experience_max"]]


def _education(value: Any) -> list[EducationEntry]:
    limit = PROFILE_LIMITS["entry_text"]
    entries: list[EducationEntry] = []
    for item in _dicts(value):
        institution = _text(item.get("institution"), limit)
        if institution is None:
            continue
        year = item.get("end_year")
        entries.append(
            EducationEntry(
                institution=institution,
                degree=_text(item.get("degree"), limit),
                field=_text(item.get("field"), limit),
                end_year=year
                if isinstance(year, int) and not isinstance(year, bool) and 1900 <= year <= 2100
                else None,
            )
        )
    return entries[: PROFILE_LIMITS["education_max"]]


def _languages(value: Any) -> list[LanguageEntry]:
    entries: list[LanguageEntry] = []
    for item in _dicts(value):
        name = _text(item.get("name"), PROFILE_LIMITS["language_name"])
        if name is None:
            continue
        level = _enum(item.get("level"), get_args(LanguageLevel))
        entries.append(LanguageEntry(name=name, level=level))
    return entries[: PROFILE_LIMITS["languages_max"]]


def normalize_draft(raw: Mapping[str, Any]) -> ProfileDraft:
    """Build a valid `ProfileDraft` from untrusted data; never raises on wrong shapes."""
    if not isinstance(raw, Mapping):
        raise ValueError("profile draft must be a mapping")
    links_raw = raw.get("links")
    links = links_raw if isinstance(links_raw, Mapping) else {}
    years = _enum(raw.get("years_experience"), get_args(YearsExperience))
    return ProfileDraft(
        full_name=_text(raw.get("full_name"), PROFILE_LIMITS["full_name"]),
        contact_email=_email(raw.get("contact_email")),
        phone=_text(raw.get("phone"), PROFILE_LIMITS["phone"]),
        location=_text(raw.get("location"), PROFILE_LIMITS["location"]),
        headline=_text(raw.get("headline"), PROFILE_LIMITS["headline"]),
        target_titles=_unique_strings(
            raw.get("target_titles"), PROFILE_LIMITS["title_item"], PROFILE_LIMITS["titles_max"]
        ),
        skills=_unique_strings(
            raw.get("skills"), PROFILE_LIMITS["skill_item"], PROFILE_LIMITS["skills_max"]
        ),
        years_experience=years,
        experience=_experience(raw.get("experience")),
        education=_education(raw.get("education")),
        languages=_languages(raw.get("languages")),
        links=ProfileLinks(
            linkedin=_url(links.get("linkedin")), portfolio=_url(links.get("portfolio"))
        ),
    )


def _obj(properties: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


def _nullable(json_type: str, **extra: Any) -> dict[str, Any]:
    return {"type": [json_type, "null"], **extra}


def _enum_schema(values: tuple[str, ...]) -> dict[str, Any]:
    return {"type": ["string", "null"], "enum": [*values, None]}


def profile_draft_json_schema() -> dict[str, Any]:
    """Strict JSON Schema for LLM structured output (all keys required, optional ones nullable)."""
    return _obj(
        {
            "full_name": _nullable("string"),
            "contact_email": _nullable("string"),
            "phone": _nullable("string"),
            "location": _nullable("string"),
            "headline": _nullable("string"),
            "target_titles": {"type": "array", "items": {"type": "string"}},
            "skills": {"type": "array", "items": {"type": "string"}},
            "years_experience": _enum_schema(get_args(YearsExperience)),
            "experience": {
                "type": "array",
                "items": _obj(
                    {
                        "title": {"type": "string"},
                        "company": _nullable("string"),
                        "start": _nullable("string"),
                        "end": _nullable("string"),
                        "current": {"type": "boolean"},
                        "description": _nullable("string"),
                    }
                ),
            },
            "education": {
                "type": "array",
                "items": _obj(
                    {
                        "institution": {"type": "string"},
                        "degree": _nullable("string"),
                        "field": _nullable("string"),
                        "end_year": _nullable("integer"),
                    }
                ),
            },
            "languages": {
                "type": "array",
                "items": _obj(
                    {"name": {"type": "string"}, "level": _enum_schema(get_args(LanguageLevel))}
                ),
            },
            "links": _obj({"linkedin": _nullable("string"), "portfolio": _nullable("string")}),
        }
    )
