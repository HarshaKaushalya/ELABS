import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

DB_DIR = "./chroma_db"

def get_vectorstore():
    # Use a small sentence transformer model for local embeddings to avoid OpenAI costs
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return Chroma(persist_directory=DB_DIR, embedding_function=embeddings)

def process_document(file_path: str):
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    vectorstore = get_vectorstore()
    vectorstore.add_documents(documents=splits)

def ask_question(question: str) -> str:
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    # We expect Ollama to be running locally or in a container with the 'llama3' model pulled
    # OLLAMA_HOST can be used if it's on a different network (e.g. http://host.docker.internal:11434)
    ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = Ollama(model="llama3", base_url=ollama_base_url)
    
    system_prompt = (
        "You are an expert laboratory assistant. "
        "Use the following pieces of retrieved context from the laboratory manual to answer the student's question. "
        "If the answer is not in the context, say 'I cannot find the answer in the provided laboratory manual.' "
        "Keep the answer concise and helpful.\n\n"
        "Context: {context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    
    try:
        response = rag_chain.invoke({"input": question})
        return response["answer"]
    except Exception as e:
        print(f"Error querying LLM: {e}")
        return "I am currently unable to connect to the AI model. Please ensure Ollama is running."
