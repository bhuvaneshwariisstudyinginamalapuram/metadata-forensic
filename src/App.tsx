import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, UploadCloud, FileText, AlertTriangle, 
  CheckCircle, Info, ChevronDown, ChevronUp, 
  Download, Activity, Database, FileDigit,
  EyeOff, Search, Lock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AnalysisResult = {
  file_name: string;
  file_size: number;
  hidden_bytes: number;
  hidden_ratio: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  breakdown: {
    hidden_text: number;
    embedded_files: number;
    base64_blocks: number;
    metadata_score: number;
    comments_size: number;
  };
  findings: string[];
  details: {
    entropyScore: string;
    base64BlockCount: number;
    embeddedObjectCount: number;
    metadataFieldsExtracted: number;
    revisionHistoryCount: number;
  };
  verdict: string;
  timestamp: string;
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setError(null);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setError('Unsupported file type. Please upload a PDF or DOCX file.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }
    setFile(selectedFile);
  };

  const analyzeFile = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze file');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Covert Data Intelligence</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Analyzer Platform</p>
            </div>
          </div>
          {result && (
            <button 
              onClick={resetAnalysis}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              New Scan
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto mt-12"
            >
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                  AI-Powered Covert Document <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    Intelligence Scanner
                  </span>
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                  Detect. Quantify. Assess Hidden Data Risks in Digital Documents.
                </p>
              </div>

              <div 
                className={cn(
                  "relative group rounded-2xl border-2 border-dashed transition-all duration-300 bg-[#1e293b]/50 backdrop-blur-sm",
                  isDragging ? "border-blue-500 bg-blue-500/5" : "border-slate-700 hover:border-slate-500 hover:bg-[#1e293b]/80",
                  error ? "border-red-500/50 bg-red-500/5" : ""
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className={cn("w-10 h-10", isDragging ? "text-blue-400" : "text-slate-400")} />
                  </div>
                  
                  {file ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3 text-lg font-medium text-white">
                        <FileText className="w-5 h-5 text-blue-400" />
                        {file.name}
                      </div>
                      <p className="text-sm text-slate-400 font-mono">{formatBytes(file.size)}</p>
                      <button
                        onClick={analyzeFile}
                        disabled={isAnalyzing}
                        className="mt-6 inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing Document...
                          </>
                        ) : (
                          <>
                            <Search className="w-5 h-5" />
                            Start Forensic Scan
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-white mb-2">Drag & Drop Document</h3>
                      <p className="text-slate-400 mb-6">or click to browse from your computer</p>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors border border-slate-700"
                      >
                        Select File
                      </button>
                    </>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".pdf,.docx" 
                    className="hidden" 
                  />
                </div>
                
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> PDF, DOCX</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Max 10MB</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure & Ephemeral</span>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Top Row: Summary & Risk Score */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* File Summary Card */}
                <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Info className="w-4 h-4" /> File Summary
                  </h3>
                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 text-sm">File Name</span>
                      <span className="col-span-2 text-slate-200 text-sm font-medium truncate" title={result.file_name}>
                        {result.file_name}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 text-sm">File Type</span>
                      <span className="col-span-2 text-slate-200 text-sm font-medium uppercase">
                        {result.file_name.split('.').pop()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 text-sm">File Size</span>
                      <span className="col-span-2 text-slate-200 text-sm font-mono">
                        {formatBytes(result.file_size)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500 text-sm">Scan Time</span>
                      <span className="col-span-2 text-slate-200 text-sm font-mono">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <button className="mt-6 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700">
                    <Download className="w-4 h-4" /> Download Report
                  </button>
                </div>

                {/* Risk Score Display (Centerpiece) */}
                <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6 shadow-xl lg:col-span-2 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Background Glow */}
                  <div className={cn(
                    "absolute inset-0 opacity-10 blur-3xl rounded-full",
                    result.risk_level === 'HIGH' ? "bg-red-500" :
                    result.risk_level === 'MEDIUM' ? "bg-amber-500" : "bg-green-500"
                  )} />
                  
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider absolute top-6 left-6 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Threat Assessment
                  </h3>

                  <div className="relative w-48 h-48 mt-8 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        className="text-slate-800"
                      />
                      <motion.circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="8" 
                        strokeDasharray="283"
                        initial={{ strokeDashoffset: 283 }}
                        animate={{ strokeDashoffset: 283 - (283 * result.risk_score) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={cn(
                          result.risk_level === 'HIGH' ? "text-red-500" :
                          result.risk_level === 'MEDIUM' ? "text-amber-500" : "text-green-500"
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-white font-mono tracking-tighter">
                        {Math.round(result.risk_score)}
                      </span>
                      <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">Score</span>
                    </div>
                  </div>

                  <div className="mt-6 text-center z-10">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase border",
                      result.risk_level === 'HIGH' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      result.risk_level === 'MEDIUM' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                      "bg-green-500/10 text-green-400 border-green-500/20"
                    )}>
                      {result.risk_level === 'HIGH' && <AlertTriangle className="w-4 h-4" />}
                      {result.risk_level === 'MEDIUM' && <AlertTriangle className="w-4 h-4" />}
                      {result.risk_level === 'LOW' && <CheckCircle className="w-4 h-4" />}
                      {result.risk_level} RISK
                    </div>
                    <p className="text-slate-400 text-sm mt-3 font-mono">
                      AI Confidence: <span className="text-slate-200">{result.confidence}%</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Row: Quantification & Findings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hidden Data Quantification Panel */}
                <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4" /> Data Quantification
                    </h3>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold text-white">
                        {formatBytes(result.hidden_bytes)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {result.hidden_ratio.toFixed(2)}% of total file
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <ProgressBar 
                      label="Hidden Text" 
                      value={result.breakdown.hidden_text} 
                      total={result.hidden_bytes || 1} 
                      color="bg-blue-500" 
                    />
                    <ProgressBar 
                      label="Embedded Files" 
                      value={result.breakdown.embedded_files} 
                      total={result.hidden_bytes || 1} 
                      color="bg-purple-500" 
                    />
                    <ProgressBar 
                      label="Base64 Encoded" 
                      value={result.breakdown.base64_blocks} 
                      total={result.hidden_bytes || 1} 
                      color="bg-amber-500" 
                    />
                    <ProgressBar 
                      label="Comments & Revisions" 
                      value={result.breakdown.comments_size} 
                      total={result.hidden_bytes || 1} 
                      color="bg-emerald-500" 
                    />
                  </div>
                </div>

                {/* AI Findings Panel */}
                <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" /> Heuristic Findings
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {result.findings.length > 0 ? (
                      result.findings.map((finding, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{finding.replace('⚠ ', '')}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                        <CheckCircle className="w-8 h-8 text-green-500/50" />
                        <p>No significant anomalies detected.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Verdict Box */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileDigit className="w-4 h-4" /> Official AI Verdict
                </h3>
                <p className="text-slate-200 leading-relaxed text-lg">
                  {result.verdict}
                </p>
              </div>

              {/* Technical Details Section */}
              <TechnicalDetails details={result.details} />

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 font-mono">{formatBytes(value)}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function TechnicalDetails({ details }: { details: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4" /> Technical Telemetry
        </h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800"
          >
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <DetailItem label="Max Entropy Score" value={details.entropyScore} />
              <DetailItem label="Base64 Blocks" value={details.base64BlockCount} />
              <DetailItem label="Embedded Objects" value={details.embeddedObjectCount} />
              <DetailItem label="Metadata Fields" value={details.metadataFieldsExtracted} />
              <DetailItem label="Revision Count" value={details.revisionHistoryCount} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-mono text-slate-200">{value}</div>
    </div>
  );
}

