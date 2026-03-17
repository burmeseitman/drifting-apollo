import chromadb
from chromadb.config import Settings
import os

class VectorService:
    def __init__(self):
        # In a real docker setup, this would point to the chroma container
        self.chroma_client = chromadb.HttpClient(host='localhost', port=8000)
        self.collection = self.chroma_client.get_or_create_collection(name="slaw_docs")

    def add_document(self, doc_id: str, text: str, metadata: dict):
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[doc_id]
        )

    def query_documents(self, query_text: str, n_results: int = 3):
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        return results
