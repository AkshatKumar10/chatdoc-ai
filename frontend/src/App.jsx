import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function App() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasIndex, setHasIndex] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! Upload one or more PDF files from the sidebar, click 'Process Documents', and ask any questions."
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [statusText, setStatusText] = useState("");

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAsking]);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      const data = await res.json();
      setHasIndex(data.has_index);
    } catch {
      setHasIndex(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    setStatusText("Extracting and vectorizing document text...");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to process PDFs");
      }

      setHasIndex(true);
      setStatusText(data.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `Successfully indexed ${files.length} PDF(s). You can now ask questions based on their content.`
        }
      ]);
    } catch (err) {
      setStatusText(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendQuestion = async (e) => {
    e?.preventDefault();
    const q = inputQuestion.trim();
    if (!q || isAsking) return;

    if (!hasIndex) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: q },
        { role: "bot", text: "Please upload and process at least one PDF first before asking questions." }
      ]);
      setInputQuestion("");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInputQuestion("");
    setIsAsking(true);

    const previousHistory = messages
      .filter((m) => !m.text.startsWith("Error:") && !m.text.startsWith("Please upload"))
      .slice(-6);

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: previousHistory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to get an answer.");
      }

      setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
    } catch (err) {
      console.error("Ask error:", err);

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Something went wrong while processing your request. Please try again."
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleClearIndex = async () => {
    try {
      await fetch(`${API_BASE}/api/clear`, { method: "POST" });
      setHasIndex(false);
      setFiles([]);
      setStatusText("Index reset.");
      setMessages([
        {
          role: "bot",
          text: "Document index cleared. Upload fresh PDFs to start asking questions."
        }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-slate-950 text-slate-100">
      <aside className="w-full md:w-80 lg:w-96 bg-slate-900/90 border-r border-slate-800 p-6 flex flex-col gap-6 flex-shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
            📄
          </div>
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              ChatDoc AI
            </h2>
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="group relative border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 text-center bg-slate-800/40 hover:bg-slate-800/70 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-purple-500/10"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</div>
          <div className="text-sm font-semibold text-slate-200 mb-1">
            Choose PDF files
          </div>
          <div className="text-xs text-slate-400">
            Click to browse multiple documents
          </div>
        </div>

        {files.length > 0 && (
          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-800/70 border border-slate-700/60 px-3 py-2 rounded-lg text-xs"
              >
                <span className="truncate max-w-[190px] text-slate-300 font-medium">
                  {file.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={!files.length || isProcessing}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing PDFs...</span>
            </>
          ) : (
            "Process Documents"
          )}
        </button>

        {hasIndex && (
          <button
            onClick={handleClearIndex}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
          >
            Reset / Clear Index
          </button>
        )}

        {statusText && (
          <p className="text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/50">
            {statusText}
          </p>
        )}

        <div
          className={`mt-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${hasIndex
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
            : "bg-amber-950/40 border-amber-500/30 text-amber-400"
            }`}
        >
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${hasIndex ? "bg-emerald-400" : "bg-amber-400"
              }`}
          />
          <span>{hasIndex ? "Index Ready for QA" : "Awaiting PDFs"}</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
        <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">Document Assistant</h1>
            <p className="text-xs text-slate-400">Ask questions and extract insights from your PDFs</p>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-sm ${msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/20"
                  }`}
              >
                {msg.role === "user" ? "👤" : "✨"}
              </div>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-purple-500/10 whitespace-pre-wrap"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none markdown-body"
                  }`}
              >
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex gap-3 max-w-[85%] self-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-sm text-white shadow-sm shadow-purple-500/20">
                ✨
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </section>

        <footer className="p-4 md:p-6 bg-slate-900/40 border-t border-slate-800/80 backdrop-blur-md">
          <form
            onSubmit={handleSendQuestion}
            className="flex items-center bg-slate-900 border border-slate-700/80 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 rounded-2xl px-4 py-2.5 shadow-lg shadow-black/20 transition-all duration-200"
          >
            <input
              type="text"
              className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
              placeholder={
                hasIndex
                  ? "Ask any question about your uploaded document(s)..."
                  : "Upload and process PDFs to start asking..."
              }
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isAsking}
              className="ml-2 w-9 h-9 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center text-sm shadow-md shadow-purple-600/20 transition-transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Send question"
            >
              ➤
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
