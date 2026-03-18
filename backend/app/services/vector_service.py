import os

import chromadb

class VectorService:
    def __init__(self, host=None, port=None, collection_name=None):
        self.host = host or os.getenv("CHROMA_HOST", "localhost")
        self.port = int(port or os.getenv("CHROMA_PORT", "8000"))
        self.collection_name = collection_name or os.getenv("CHROMA_COLLECTION", "slaw_docs")
        self.chroma_client = None
        self.collection = None

    def _reset_client(self):
        self.chroma_client = None
        self.collection = None

    def _get_collection(self):
        if self.collection is not None:
            return self.collection

        try:
            if self.chroma_client is None:
                self.chroma_client = chromadb.HttpClient(host=self.host, port=self.port)

            self.collection = self.chroma_client.get_or_create_collection(name=self.collection_name)
            return self.collection
        except Exception as exc:
            self._reset_client()
            raise RuntimeError(
                f"Chroma is unavailable at {self.host}:{self.port}."
            ) from exc

    def is_available(self) -> bool:
        try:
            self._get_collection()
            return True
        except RuntimeError:
            return False

    def add_document(self, doc_id: str, text: str, metadata: dict):
        try:
            self._get_collection().add(
                documents=[text],
                metadatas=[metadata],
                ids=[doc_id]
            )
        except RuntimeError:
            raise
        except Exception as exc:
            self._reset_client()
            raise RuntimeError("Failed to store the document in Chroma.") from exc

    def query_documents(self, query_text: str, n_results: int = 3):
        try:
            return self._get_collection().query(
                query_texts=[query_text],
                n_results=n_results
            )
        except RuntimeError:
            raise
        except Exception as exc:
            self._reset_client()
            raise RuntimeError("Failed to query documents from Chroma.") from exc
