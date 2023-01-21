from sentence_transformers import SentenceTransformer
# modelName = "multi-qa-MiniLM-L6-cos-v1"
# modelName = "MiniLM-L6-H384-uncased"
# modelName = "MiniLM-L12-H384-uncased"
# modelName = "msmarco-MiniLM-L6-cos-v5"
# modelName = "msmarco-MiniLM-L12-cos-v5"

# model = SentenceTransformer('sentence-transformers/multi-qa-MiniLM-L6-cos-v1')
# model = SentenceTransformer('microsoft/MiniLM-L6-H384-uncased')
# model = SentenceTransformer('microsoft/MiniLM-L12-H384-uncased')
# model = SentenceTransformer('sentence-transformers/msmarco-MiniLM-L6-cos-v5')
# model = SentenceTransformer('sentence-transformers/msmarco-MiniLM-L12-cos-v5')

from sentence_transformers import SentenceTransformer
# Todo: load model from env
modelName = "msmarco-MiniLM-L12-cos-v5"
model = SentenceTransformer('sentence-transformers/msmarco-MiniLM-L12-cos-v5')
model.save(f"/src/app/{modelName}")
