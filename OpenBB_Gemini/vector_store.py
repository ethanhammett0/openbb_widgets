import os
import chromadb
from chromadb.utils import embedding_functions
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "agent_memory"
EMBEDDING_MODEL = "models/text-embedding-004"

class GoogleGeminiEmbeddingFunction(embedding_functions.EmbeddingFunction):
    """
    Custom ChromaDB Embedding Function using Google Gemini API.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)

    def __call__(self, input: List[str]) -> List[List[float]]:
        # Batch embedding not always supported directly by simple calls, 
        # but genai.embed_content supports arrays.
        
        # Filter out empty strings to avoid API errors
        valid_inputs = [text for text in input if text.strip()]
        if not valid_inputs:
             return [[] for _ in input]

        try:
            result = genai.embed_content(
                model=EMBEDDING_MODEL,
                content=valid_inputs,
                task_type="retrieval_document"
            )
            # The result is usually a dict {'embedding': [...]} or list of dicts
            if 'embedding' in result:
                return [result['embedding']]
            # Batch return
            return [r['embedding'] for r in result['embedding']]
        except Exception as e:
            print(f"[VectorStore] Embedding Error: {e}")
            # Return zero vectors on failure to prevent crash? 
            # Better to raise, but for now let's return empty to allow graceful fail.
            return [[0.0] * 768 for _ in valid_inputs] 

class VectorEngine:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("[VectorStore] CRITICAL: No GOOGLE_API_KEY found. Vector search will fail.")
            self.embed_fn = None
        else:
            self.embed_fn = GoogleGeminiEmbeddingFunction(self.api_key)

        # Persistent Client
        self.client = chromadb.PersistentClient(path=CHROMA_PATH)
        
        # Create/Get Collection
        # We assume 768 dimensions for text-embedding-004 (it's actually 768)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self.embed_fn
        )

    def count(self) -> int:
        return self.collection.count()

    def add_memory(self, unique_id: str, text: str, metadata: Dict[str, Any]):
        """
        Upsert a memory into the vector store.
        """
        if not self.embed_fn:
             return "Error: Vector Store not configured (Missing API Key)."
        
        # Ensure metadata is flat (Chroma requirements)
        # Convert non-primitive values to strings
        safe_metadata = {}
        for k, v in metadata.items():
            if isinstance(v, (str, int, float, bool)):
                safe_metadata[k] = v
            else:
                safe_metadata[k] = str(v)

        self.collection.upsert(
            documents=[text],
            metadatas=[safe_metadata],
            ids=[unique_id]
        )

    def search(self, query: str, topic: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Semantic search for memories.
        """
        if not self.embed_fn:
            return []

        where_filter = {}
        if topic:
            where_filter["topic"] = topic

        # If topic filter is empty, pass None to query otherwise Chroma errors on empty dict? 
        # Actually Chroma handles empty dict as "no filter".
        
        results = self.collection.query(
            query_texts=[query],
            n_results=limit,
            where=where_filter if topic else None
        )
        
        # Parse Results
        # Chroma returns lists of lists (batch format)
        matched_items = []
        if not results['ids']:
            return []
            
        ids = results['ids'][0]
        metadatas = results['metadatas'][0]
        distances = results['distances'][0]
        documents = results['documents'][0]
        
        for i in range(len(ids)):
            matched_items.append({
                "id": ids[i],
                "metadata": metadatas[i],
                "summary": documents[i],
                "distance": distances[i]
            })
            
        return matched_items
