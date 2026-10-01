import os
import io
import shutil
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pypdf import PdfReader

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI,
)
from langchain_community.vectorstores import FAISS
from langchain_classic.chains.question_answering import load_qa_chain
from langchain_classic.prompts import PromptTemplate

load_dotenv()

app = FastAPI(title="PDF Question Answering API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FAISS_INDEX_PATH = "faiss_index"

class ChatMessage(BaseModel):
    role: str
    text: str

class AskRequest(BaseModel):
    question: str
    history: List[ChatMessage] = []

def get_pdf_text(pdf_bytes_list: List[bytes]) -> str:
    text = ""
    for b in pdf_bytes_list:
        reader = PdfReader(io.BytesIO(b))
        for page in reader.pages:
            text += page.extract_text() or ""
    return text

def get_chunks(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n", ".", " "],
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    return splitter.split_text(text)

def get_vector_store(chunks: List[str]):
    embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")
    vector_store = FAISS.from_texts(chunks, embedding=embeddings)
    vector_store.save_local(FAISS_INDEX_PATH)
    return vector_store

def get_qa_chain():
    prompt_template = """
    You are an intelligent, conversational document assistant.
    Answer the user's question as thoroughly and clearly as possible based on the provided document context and conversational history.
    
    If the question refers to previous context (like "what did you say earlier", "elaborate on point 2", or pronouns), use the Chat History to understand what the user is referring to.
    If the factual answer is not available in the provided document context, say:
    "The answer is not available in the provided document."
    Do not make up facts or hallucinate details beyond the documents.

    Format your response cleanly:
    - Use clear headings (###) and bullet points (-) where appropriate.
    - Put blank lines between paragraphs and items.
    - Never clump the entire answer into a single dense paragraph.

    Chat History:
    {chat_history}

    Document Context:
    {context}

    Current Question:
    {question}

    Answer:
    """
    model = ChatGoogleGenerativeAI(model="gemini-3.8-flash")
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "chat_history", "question"],
    )
    return load_qa_chain(model, chain_type="stuff", prompt=prompt)

@app.get("/api/status")
def status():
    indexed = os.path.exists(FAISS_INDEX_PATH)
    return {
        "status": "ready" if indexed else "no_documents",
        "has_index": indexed
    }

@app.post("/api/upload")
async def upload(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    
    pdf_bytes_list = []
    file_names = []
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"'{f.filename}' is not a valid PDF file.")
        content = await f.read()
        pdf_bytes_list.append(content)
        file_names.append(f.filename)

    raw_text = get_pdf_text(pdf_bytes_list)
    if not raw_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from the uploaded PDF(s). They might be scans or empty."
        )

    chunks = get_chunks(raw_text)
    get_vector_store(chunks)

    return {
        "message": f"Successfully processed {len(files)} PDF(s) into {len(chunks)} chunks.",
        "files": file_names,
        "chunk_count": len(chunks)
    }

@app.post("/api/ask")
def ask(request: AskRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not os.path.exists(FAISS_INDEX_PATH):
        raise HTTPException(
            status_code=400,
            detail="No document index found. Please upload and process PDF documents first."
        )

    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")
        vectorstore = FAISS.load_local(
            FAISS_INDEX_PATH,
            embeddings,
            allow_dangerous_deserialization=True,
        )
        docs = vectorstore.similarity_search(request.question, k=4)
        chain = get_qa_chain()

        formatted_history = "\n".join([
            f"{'User' if m.role == 'user' else 'Assistant'}: {m.text}"
            for m in request.history[-6:]
        ]) if request.history else "No previous conversation."

        response = chain.invoke(
            {
                "input_documents": docs,
                "chat_history": formatted_history,
                "question": request.question,
            }
        )

        return {
            "answer": response.get("output_text", ""),
            "sources_count": len(docs)
        }
    except Exception as e:
        print("Error while processing question:", e)

        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing your request. Please try again."
        )

@app.post("/api/clear")
def clear():
    if os.path.exists(FAISS_INDEX_PATH):
        shutil.rmtree(FAISS_INDEX_PATH)
    return {"message": "Document index cleared successfully."}
