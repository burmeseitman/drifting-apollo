from datetime import datetime, timezone
import os
import shutil
import uuid

import PyPDF2
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.config import settings
from app.core.logging import log_security_event
from app.models.user import User
from app.security.auth import get_current_user, require_admin
from app.services.llm_guard_service import LLMGuardService, LLMGuardUnavailableError
from app.services.vector_service import VectorService

router = APIRouter()
vector_db = VectorService()
llm_guard = LLMGuardService()

UPLOAD_DIR = "uploads"
SUPPORTED_EXTENSIONS = {".pdf", ".txt"}
PROMPT_INJECTION_THRESHOLD = 0.92

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


def _extract_text(file_path: str, file_extension: str) -> str:
    if file_extension == ".pdf":
        pages = []
        with open(file_path, "rb") as file_handle:
            reader = PyPDF2.PdfReader(file_handle)
            for page in reader.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    pages.append(page_text)
        return "\n".join(pages).strip()

    if file_extension == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file_handle:
            return file_handle.read().strip()

    raise HTTPException(status_code=415, detail="Only PDF and TXT files are supported.")


def _cleanup_upload(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)


def _document_path(doc_id: str, file_extension: str) -> str:
    return os.path.join(UPLOAD_DIR, f"{doc_id}{file_extension}")


def _document_blocks_guard(result) -> bool:
    return result.score("PromptInjection") >= PROMPT_INJECTION_THRESHOLD or result.score("InvisibleText") > 0


def _sanitize_document_text(text: str, filename: str) -> str:
    if not llm_guard.is_enabled():
        return text

    try:
        result = llm_guard.analyze_text_chunks(text, scanners_suppress=["TokenLimit"])
    except LLMGuardUnavailableError as exc:
        log_security_event(
            "LLM Guard document scan unavailable",
            details=f"{filename}: {exc}",
        )
        if settings.llm_guard_fail_closed:
            raise HTTPException(status_code=503, detail="Safety service unavailable.") from exc

        return text

    if _document_blocks_guard(result):
        log_security_event(
            "Upload blocked by LLM Guard",
            details=f"{filename}: {result.scanners}",
        )
        raise HTTPException(status_code=422, detail="This file was blocked by safety checks.")

    return result.sanitized_text


def _serialize_document(doc_id: str, metadata: dict | None) -> dict:
    metadata = metadata or {}
    file_extension = metadata.get("type", "")
    file_path = _document_path(doc_id, file_extension) if file_extension else ""

    uploaded_at = metadata.get("uploaded_at")
    if not uploaded_at and file_path and os.path.exists(file_path):
        uploaded_at = datetime.fromtimestamp(
            os.path.getmtime(file_path),
            tz=timezone.utc,
        ).isoformat()

    file_size = os.path.getsize(file_path) if file_path and os.path.exists(file_path) else None

    return {
        "id": doc_id,
        "filename": metadata.get("filename", doc_id),
        "type": file_extension,
        "uploaded_at": uploaded_at,
        "file_size": file_size,
        "indexed": True,
    }


@router.get("/documents")
async def list_documents(_: User = Depends(get_current_user)):
    try:
        results = vector_db.list_documents()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    ids = results.get("ids", [])
    metadatas = results.get("metadatas", [])

    documents = [
        _serialize_document(doc_id, metadata)
        for doc_id, metadata in zip(ids, metadatas)
    ]
    documents.sort(
        key=lambda item: item["uploaded_at"] or "",
        reverse=True,
    )

    return {
        "documents": documents,
        "count": len(documents),
    }

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
):
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    contents = await file.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="This file is too large. The limit is 10 MB.")

    await file.seek(0)

    original_filename = file.filename or "upload"
    file_extension = os.path.splitext(original_filename)[1].lower()
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Only PDF and TXT files are supported.")

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = _extract_text(file_path, file_extension)
        if not text:
            raise HTTPException(status_code=422, detail="We couldn't read any text from that file.")

        text = _sanitize_document_text(text, original_filename)
        if not text.strip():
            raise HTTPException(status_code=422, detail="This file did not contain usable text after safety checks.")

        vector_db.add_document(
            doc_id=file_id,
            text=text,
            metadata={
                "filename": original_filename,
                "type": file_extension,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    except HTTPException:
        _cleanup_upload(file_path)
        raise
    except RuntimeError as exc:
        _cleanup_upload(file_path)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        _cleanup_upload(file_path)
        raise HTTPException(status_code=500, detail="We couldn't process that file.") from exc

    return {"message": "File uploaded successfully.", "file_id": file_id}
