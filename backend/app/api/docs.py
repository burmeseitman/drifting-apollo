from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.vector_service import VectorService
import os
import shutil
import uuid
import PyPDF2

router = APIRouter()
vector_db = VectorService()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

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
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = ""
    if file_extension == ".pdf":
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text()
    elif file_extension == ".txt":
        with open(file_path, "r") as f:
            text = f.read()
    else:
        # Simplified for now, can add excel/csv later
        text = "Unsupported format text"

    # Add to vector DB
    vector_db.add_document(
        doc_id=file_id,
        text=text,
        metadata={"filename": file.filename, "type": file_extension}
    )

    return {"message": "File uploaded and indexed successfully", "file_id": file_id}
