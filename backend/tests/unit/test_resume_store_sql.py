"""Static guard: `PgResumeStore` lists its columns instead of `select *` / `returning *`."""

import inspect

from autoapplier.db import resumes


def test_no_star_projections_in_resume_queries() -> None:
    source = inspect.getsource(resumes).lower()

    assert "select *" not in source
    assert "returning *" not in source
