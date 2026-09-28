"""Resume routes: `POST /v1/resumes` and `POST /v1/resumes/{id}/extraction`."""

from collections.abc import Callable, Coroutine
from typing import Annotated, Any, cast
from uuid import UUID

from fastapi import APIRouter, File, Request, Response, UploadFile
from fastapi.routing import APIRoute

from autoapplier.api.auth import CurrentUser
from autoapplier.api.errors import ApiProblem
from autoapplier.api.schemas.problem import Problem
from autoapplier.api.schemas.resumes import ResumeOut
from autoapplier.domain.resume_files import RESUME_MAX_BYTES
from autoapplier.services.resumes import ResumeNotFound, ResumeNotRetryable, ResumeRejected
from autoapplier.wiring import Container

MAX_REQUEST_BYTES = 6 * 1024 * 1024  # file limit plus multipart overhead

_REJECTION_STATUS = {
    "resume.too_large": 413,
    "resume.unsupported_type": 422,
    "resume.empty": 422,
}
_REJECTION_TITLE = {
    "resume.too_large": "Resume file is too large",
    "resume.unsupported_type": "Only PDF and DOCX resumes are supported",
    "resume.empty": "Resume file is empty",
}


def _container(request: Request) -> Container:
    return cast(Container, request.app.state.container)


class _SizeGuardRoute(APIRoute):
    """Rejects an oversized `Content-Length` before FastAPI parses the multipart body."""

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        handler = super().get_route_handler()

        async def guarded(request: Request) -> Response:
            header = request.headers.get("content-length")
            if header is not None and header.isdigit() and int(header) > MAX_REQUEST_BYTES:
                raise ApiProblem(413, "request.too_large", "Request body is too large")
            return await handler(request)

        return guarded


router = APIRouter(prefix="/v1", route_class=_SizeGuardRoute)


@router.post(
    "/resumes",
    status_code=202,
    response_model=ResumeOut,
    operation_id="upload_resume",
    responses={
        401: {"model": Problem},
        413: {"model": Problem},
        422: {"model": Problem},
    },
)
async def upload_resume(
    request: Request, user: CurrentUser, file: Annotated[UploadFile, File()]
) -> ResumeOut:
    data = await file.read(RESUME_MAX_BYTES + 1)
    try:
        record = await _container(request).resumes.upload(
            user_id=user.user_id, file_name=file.filename or "", data=data
        )
    except ResumeRejected as rejected:
        raise ApiProblem(
            _REJECTION_STATUS[rejected.code], rejected.code, _REJECTION_TITLE[rejected.code]
        ) from None
    return ResumeOut.from_record(record)


@router.post(
    "/resumes/{resume_id}/extraction",
    status_code=202,
    response_model=ResumeOut,
    operation_id="retry_resume_extraction",
    responses={401: {"model": Problem}, 404: {"model": Problem}, 409: {"model": Problem}},
)
async def retry_resume_extraction(
    request: Request, user: CurrentUser, resume_id: UUID
) -> ResumeOut:
    try:
        record = await _container(request).resumes.retry(user_id=user.user_id, resume_id=resume_id)
    except ResumeNotFound:
        raise ApiProblem(404, "resume.not_found", "Resume not found") from None
    except ResumeNotRetryable:
        raise ApiProblem(
            409, "resume.not_retryable", "Resume extraction cannot be retried right now"
        ) from None
    return ResumeOut.from_record(record)
