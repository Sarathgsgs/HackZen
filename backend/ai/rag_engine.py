import os
import shutil
import re
from datetime import datetime, timezone
from uuid import uuid4
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from file_loader import load_text_files, split_text, normalize_tag


class RAGEngine:
    def __init__(
        self,
        persist_dir: str,
        collection_name: str,
        embedding_model: str,
        disable_embeddings: bool = False,
        use_chroma: bool = True,
    ):
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model
        self.embedding_model = None
        self.disable_embeddings = disable_embeddings
        self.use_chroma = use_chroma
        self.documents = []
        self.upload_registry = {}
        self.client = None
        self.collection = None

        if self.use_chroma:
            os.makedirs(self.persist_dir, exist_ok=True)
            try:
                self.client = chromadb.PersistentClient(
                    path=self.persist_dir, settings=Settings(allow_reset=True)
                )
                self.collection = self.client.get_or_create_collection(
                    name=self.collection_name
                )
            except Exception:
                self._rebuild_chroma_store()

    def _rebuild_chroma_store(self):
        if os.path.isdir(self.persist_dir):
            shutil.rmtree(self.persist_dir, ignore_errors=True)
        os.makedirs(self.persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=self.persist_dir, settings=Settings(allow_reset=True)
        )
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name
        )

    def ingest_directory(self, data_dir: str):
        if self.disable_embeddings or not self.use_chroma:
            self.documents = load_text_files(data_dir)
            return
        if self.embedding_model is None:
            self.embedding_model = SentenceTransformer(self.embedding_model_name)

        documents = load_text_files(data_dir)
        self.documents = documents
        if not documents:
            return

        ids = []
        texts = []
        metadatas = []

        for doc in documents:
            chunks = split_text(doc["text"], chunk_size=800, overlap=100)
            for i, chunk in enumerate(chunks):
                ids.append(f"{doc['id']}_chunk_{i}")
                texts.append(chunk)
                metadatas.append(
                    {
                        "source": doc["source"],
                        "chunk": i,
                        "hackathon": doc.get("hackathon", ""),
                        "hackathon_norm": doc.get("hackathon_norm", ""),
                    }
                )

        if ids and self.collection is not None:
            try:
                embeddings = self.embedding_model.encode(texts).tolist()
                self.collection.add(
                    ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings
                )
            except Exception:
                # Keep app functional even if vector indexing fails; keyword fallback still works.
                pass

    def ingest_uploaded_text(self, text: str, source: str, hackathon: str):
        if not text or not text.strip():
            return {"doc_id": "", "chunks_indexed": 0}

        hackathon_norm = normalize_tag(hackathon)
        doc = {
            "id": f"upload_{uuid4().hex}",
            "text": text.strip(),
            "source": source,
            "hackathon": hackathon,
            "hackathon_norm": hackathon_norm,
            "uploaded": True,
        }
        self.documents.append(doc)

        chunks = split_text(doc["text"], chunk_size=800, overlap=100)
        if not chunks:
            return {"doc_id": doc["id"], "chunks_indexed": 0}

        chunk_ids = [f"{doc['id']}_chunk_{i}" for i in range(len(chunks))]
        uploaded_item = {
            "doc_id": doc["id"],
            "filename": source,
            "hackathon": hackathon,
            "hackathon_norm": hackathon_norm,
            "chunks_indexed": len(chunks),
            "chunk_ids": chunk_ids,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.upload_registry[doc["id"]] = uploaded_item

        if self.disable_embeddings or not self.use_chroma or self.collection is None:
            return {"doc_id": doc["id"], "chunks_indexed": len(chunks)}

        if self.embedding_model is None:
            self.embedding_model = SentenceTransformer(self.embedding_model_name)

        metadatas = [
            {
                "source": doc["source"],
                "chunk": i,
                "hackathon": doc["hackathon"],
                "hackathon_norm": doc["hackathon_norm"],
                "uploaded": True,
            }
            for i in range(len(chunks))
        ]

        try:
            embeddings = self.embedding_model.encode(chunks).tolist()
            self.collection.add(
                ids=chunk_ids,
                documents=chunks,
                metadatas=metadatas,
                embeddings=embeddings,
            )
        except Exception:
            pass

        return {"doc_id": doc["id"], "chunks_indexed": len(chunks)}

    def retrieve(
        self,
        query: str,
        top_k: int = 4,
        hackathon: str = "",
        uploaded_only: bool = False,
    ):
        if self.disable_embeddings or not self.use_chroma or self.collection is None:
            return []
        if self.embedding_model is None:
            self.embedding_model = SentenceTransformer(self.embedding_model_name)

        query_embedding = self.embedding_model.encode([query]).tolist()
        where = {"hackathon_norm": hackathon} if hackathon else {}
        if uploaded_only:
            where["uploaded"] = True
        where = where or None
        results = self.collection.query(
            query_embeddings=query_embedding, n_results=top_k, where=where
        )

        matches = []
        for i in range(len(results.get("ids", [[]])[0])):
            matches.append(
                {
                    "id": results["ids"][0][i],
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                }
            )
        return matches

    def keyword_search(
        self,
        query: str,
        top_k: int = 4,
        hackathon: str = "",
        uploaded_only: bool = False,
    ):
        if not self.documents:
            return []

        base_terms = [
            t for t in re.findall(r"[a-zA-Z0-9]+", query.lower()) if len(t) > 2
        ]
        query_terms = set()
        for term in base_terms:
            query_terms.add(term)
            # basic singular/plural normalization for better matching ("themes" <-> "theme")
            if term.endswith("s") and len(term) > 3:
                query_terms.add(term[:-1])
            else:
                query_terms.add(f"{term}s")

        if not query_terms:
            return []

        results = []
        for doc in self.documents:
            if hackathon and doc.get("hackathon_norm") != hackathon:
                continue
            if uploaded_only and not doc.get("uploaded"):
                continue
            chunks = split_text(doc["text"], chunk_size=800, overlap=100)
            for i, chunk in enumerate(chunks):
                chunk_l = chunk.lower()
                score = 0
                for term in query_terms:
                    # count exact term and loose starts-with term matches to catch variants
                    score += chunk_l.count(term)
                    score += len(re.findall(rf"\b{re.escape(term)}\w*\b", chunk_l))
                # Prefer uploaded docs when mixed with static docs.
                if doc.get("uploaded"):
                    score += 2
                if score > 0:
                    results.append(
                        {
                            "id": f"{doc['id']}_chunk_{i}",
                            "text": chunk,
                            "metadata": {
                                "source": doc["source"],
                                "chunk": i,
                                "hackathon": doc.get("hackathon", ""),
                                "hackathon_norm": doc.get("hackathon_norm", ""),
                                "score": score,
                            },
                        }
                    )

        results.sort(key=lambda x: x["metadata"]["score"], reverse=True)
        return results[:top_k]

    def list_uploaded_documents(self, hackathon: str = ""):
        items = list(self.upload_registry.values())
        if hackathon:
            items = [item for item in items if item.get("hackathon_norm") == hackathon]
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [
            {
                "doc_id": item["doc_id"],
                "filename": item["filename"],
                "hackathon": item["hackathon"],
                "chunks_indexed": item["chunks_indexed"],
                "created_at": item["created_at"],
            }
            for item in items
        ]

    def get_uploaded_corpus(self, hackathon: str = "", max_chars: int = 6000):
        texts = []
        total = 0
        for doc in self.documents:
            if not doc.get("uploaded"):
                continue
            if hackathon and doc.get("hackathon_norm") != hackathon:
                continue
            chunk = doc.get("text", "")
            if not chunk:
                continue
            remaining = max_chars - total
            if remaining <= 0:
                break
            texts.append(chunk[:remaining])
            total += len(chunk[:remaining])
        return "\n\n".join(texts).strip()

    def get_base_corpus(self, hackathon: str = "", max_chars: int = 6000):
        texts = []
        total = 0
        for doc in self.documents:
            if doc.get("uploaded"):
                continue
            if hackathon and doc.get("hackathon_norm") != hackathon:
                continue
            chunk = doc.get("text", "")
            if not chunk:
                continue
            remaining = max_chars - total
            if remaining <= 0:
                break
            texts.append(chunk[:remaining])
            total += len(chunk[:remaining])
        return "\n\n".join(texts).strip()

    def delete_uploaded_document(self, doc_id: str):
        item = self.upload_registry.get(doc_id)
        if not item:
            return False

        self.documents = [d for d in self.documents if d.get("id") != doc_id]

        if self.use_chroma and self.collection is not None:
            try:
                self.collection.delete(ids=item.get("chunk_ids", []))
            except Exception:
                pass

        del self.upload_registry[doc_id]
        return True

    def delete_uploaded_documents_for_hackathon(self, hackathon: str = ""):
        deleted = []
        for item in list(self.upload_registry.values()):
            if hackathon and item.get("hackathon_norm") != hackathon:
                continue
            if self.delete_uploaded_document(item["doc_id"]):
                deleted.append(item["filename"])
        return deleted

    def reset(self):
        if not self.use_chroma or self.client is None:
            return
        try:
            self.client.reset()
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name
            )
        except Exception:
            self._rebuild_chroma_store()
