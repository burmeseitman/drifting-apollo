from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.vector_service import VectorService
import os
import shutil
import uuid
import PyPDF2

router = APIRouter()
vector_db = VectorService()

UPLOAD_DIR = "uploads"
SUPPORTED_EXTENSIONS = {".pdf", ".txt"}

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

    raise HTTPException(status_code=415, detail="Unsupported file type. Only PDF and TXT are allowed.")


def _cleanup_upload(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # Security: Limit file size (e.g., 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Read a chunk to check size
    contents = await file.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
    
    # Reset file pointer after reading
    await file.seek(0)
    
    original_filename = file.filename or "upload"
    file_extension = os.path.splitext(original_filename)[1].lower()
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Unsupported file type. Only PDF and TXT are allowed.")

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = _extract_text(file_path, file_extension)
        if not text:
            raise HTTPException(status_code=422, detail="No extractable text found in the uploaded file.")

        vector_db.add_document(
            doc_id=file_id,
            text=text,
            metadata={"filename": original_filename, "type": file_extension}
        )
    except HTTPException:
        _cleanup_upload(file_path)
        raise
    except RuntimeError as exc:
        _cleanup_upload(file_path)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        _cleanup_upload(file_path)
        raise HTTPException(status_code=500, detail="Failed to process the uploaded document.") from exc

    return {"message": "File uploaded and indexed successfully", "file_id": file_id}
