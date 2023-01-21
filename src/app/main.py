from typing import List
from pydantic import BaseModel
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

import os
cwd = os.getcwd()
print(cwd)
app = FastAPI()

class Item(BaseModel):
    texts: List[str]

model_name = "msmarco-MiniLM-L12-cos-v5"
model = SentenceTransformer(f'/src/app/{model_name}')

@app.post("/embeddings/create")
def embeddings_create(item: Item):
    embeddings = []
    for text in item.texts:
        embeddings.append(model.encode(text))

    return {"embeddings": [embedding.tolist() for embedding in embeddings]}
