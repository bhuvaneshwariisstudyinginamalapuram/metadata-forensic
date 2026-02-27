import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { createRequire } from "module";
import { GoogleGenAI, Type } from "@google/genai";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
const PORT = 3000;

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper function to calculate entropy
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Helper to find base64 strings
function findBase64Blocks(text: string): { count: number; size: number; maxEntropy: number } {
  const base64Regex = /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
  let match;
  let count = 0;
  let size = 0;
  let maxEntropy = 0;

  while ((match = base64Regex.exec(text)) !== null) {
    count++;
    size += match[0].length;
    const entropy = calculateEntropy(match[0]);
    if (entropy > maxEntropy) {
      maxEntropy = entropy;
    }
  }

  return { count, size, maxEntropy };
}

// Analyze DOCX
function analyzeDocx(filePath: string, fileSize: number) {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();
  
  let hiddenTextSize = 0;
  let embeddedFileSize = 0;
  let commentsSize = 0;
  let base64Blocks = { count: 0, size: 0, maxEntropy: 0 };
  let metadataScore = 0;
  let embeddedObjectCount = 0;
  let revisionHistoryCount = 0;
  let metadataFieldsExtracted = 0;
  const findings: string[] = [];

  zipEntries.forEach((entry) => {
    const name = entry.entryName;
    
    // Check for embedded files
    if (name.startsWith("word/embeddings/") || name.startsWith("word/media/")) {
      embeddedFileSize += entry.header.size;
      embeddedObjectCount++;
      if (!findings.includes("⚠ Embedded objects/files found")) {
        findings.push("⚠ Embedded objects/files found");
      }
    }

    // Check comments
    if (name === "word/comments.xml") {
      const content = entry.getData().toString("utf8");
      commentsSize += content.length;
      if (content.length > 500) {
        findings.push("⚠ Significant volume of comments detected");
      }
    }

    // Check revisions/track changes
    if (name === "word/document.xml") {
      const content = entry.getData().toString("utf8");
      const revisions = (content.match(/<w:ins/g) || []).length + (content.match(/<w:del/g) || []).length;
      revisionHistoryCount += revisions;
      if (revisions > 0) {
        findings.push(`⚠ Track changes/revisions found (${revisions} edits)`);
      }

      // Check for hidden text (w:vanish)
      const hiddenMatches = content.match(/<w:vanish\/>.*?<w:t>(.*?)<\/w:t>/g);
      if (hiddenMatches) {
        hiddenMatches.forEach(m => hiddenTextSize += m.length);
        findings.push("⚠ Hidden text (vanish tag) detected");
      }
      // Check for white text
      const whiteTextMatches = content.match(/<w:color w:val="FFFFFF".*?<w:t>(.*?)<\/w:t>/g);
      if (whiteTextMatches) {
        whiteTextMatches.forEach(m => hiddenTextSize += m.length);
        findings.push("⚠ White-colored text detected");
      }

      // Base64 blocks
      const b64 = findBase64Blocks(content);
      base64Blocks.count += b64.count;
      base64Blocks.size += b64.size;
      base64Blocks.maxEntropy = Math.max(base64Blocks.maxEntropy, b64.maxEntropy);
    }

    // Metadata
    if (name === "docProps/core.xml" || name === "docProps/app.xml") {
      const content = entry.getData().toString("utf8");
      metadataFieldsExtracted += (content.match(/<[^>]+>/g) || []).length;
      if (content.includes("creator") || content.includes("lastModifiedBy")) {
        metadataScore += 10;
      }
    }
  });

  if (base64Blocks.count > 0) {
    findings.push(`⚠ High entropy encoded blocks detected (${base64Blocks.count} blocks)`);
  }

  const hiddenBytes = hiddenTextSize + embeddedFileSize + base64Blocks.size + commentsSize;
  const hiddenRatio = Math.min((hiddenBytes / fileSize) * 100, 100);

  return {
    hiddenBytes,
    hiddenRatio,
    breakdown: {
      hidden_text: hiddenTextSize,
      embedded_files: embeddedFileSize,
      base64_blocks: base64Blocks.size,
      metadata_score: metadataScore,
      comments_size: commentsSize,
    },
    findings,
    details: {
      entropyScore: base64Blocks.maxEntropy.toFixed(2),
      base64BlockCount: base64Blocks.count,
      embeddedObjectCount,
      metadataFieldsExtracted,
      revisionHistoryCount,
    }
  };
}

// Analyze PDF
async function analyzePdf(filePath: string, fileSize: number) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  let hiddenTextSize = 0;
  let embeddedFileSize = 0;
  let commentsSize = 0;
  let base64Blocks = { count: 0, size: 0, maxEntropy: 0 };
  let metadataScore = 0;
  let embeddedObjectCount = 0;
  let revisionHistoryCount = 0;
  let metadataFieldsExtracted = Object.keys(data.info || {}).length;
  const findings: string[] = [];

  // Very basic heuristic for PDFs since pdf-parse just extracts text
  const text = data.text;
  
  // Base64 blocks in text
  const b64 = findBase64Blocks(text);
  base64Blocks = b64;
  if (b64.count > 0) {
    findings.push(`⚠ High entropy encoded blocks detected (${b64.count} blocks)`);
  }

  // Metadata anomalies
  if (data.info && (data.info.Creator || data.info.Producer)) {
    metadataScore += 10;
  }
  if (metadataFieldsExtracted > 10) {
    findings.push("⚠ Metadata anomaly detected (excessive fields)");
    metadataScore += 20;
  }

  // Check raw buffer for embedded files (/EmbeddedFiles or /Names)
  const rawString = dataBuffer.toString("binary");
  const embeddedMatches = rawString.match(/\/EmbeddedFiles|\/Names/g);
  if (embeddedMatches) {
    embeddedObjectCount = embeddedMatches.length;
    embeddedFileSize = embeddedObjectCount * 1024; // Rough estimate
    findings.push("⚠ Embedded objects/files found");
  }

  // Check for annotations/comments
  const annotMatches = rawString.match(/\/Annots/g);
  if (annotMatches) {
    commentsSize = annotMatches.length * 256; // Rough estimate
    findings.push("⚠ Annotations/Comments detected");
  }

  // Check for hidden text (e.g. text rendering mode 3)
  const trMatches = rawString.match(/3 Tr/g);
  if (trMatches) {
    hiddenTextSize = trMatches.length * 50; // Rough estimate
    findings.push("⚠ Invisible text rendering detected");
  }

  const hiddenBytes = hiddenTextSize + embeddedFileSize + base64Blocks.size + commentsSize;
  const hiddenRatio = Math.min((hiddenBytes / fileSize) * 100, 100);

  return {
    hiddenBytes,
    hiddenRatio,
    breakdown: {
      hidden_text: hiddenTextSize,
      embedded_files: embeddedFileSize,
      base64_blocks: base64Blocks.size,
      metadata_score: metadataScore,
      comments_size: commentsSize,
    },
    findings,
    details: {
      entropyScore: base64Blocks.maxEntropy.toFixed(2),
      base64BlockCount: base64Blocks.count,
      embeddedObjectCount,
      metadataFieldsExtracted,
      revisionHistoryCount,
    }
  };
}

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.file;
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (ext !== ".pdf" && ext !== ".docx") {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: "Unsupported file type. Only PDF and DOCX are allowed." });
  }

  try {
    let analysis;
    if (ext === ".docx") {
      analysis = analyzeDocx(file.path, file.size);
    } else if (ext === ".pdf") {
      analysis = await analyzePdf(file.path, file.size);
    } else {
      throw new Error("Unsupported file type");
    }

    // Calculate Risk Score
    const { hiddenRatio, breakdown, details } = analysis;
    const embeddedPresence = details.embeddedObjectCount > 0 ? 1 : 0;
    const base64EntropyScore = parseFloat(details.entropyScore);
    const metadataAnomalyScore = breakdown.metadata_score;

    // Use Gemini to analyze the findings and generate a risk score and verdict
    const prompt = `Analyze the following document telemetry and findings to determine the risk of covert data transmission or hidden payloads.
    
    File Name: ${file.originalname}
    File Size: ${file.size} bytes
    Hidden Bytes: ${analysis.hiddenBytes} bytes
    Hidden Ratio: ${hiddenRatio.toFixed(2)}%
    Embedded Objects: ${details.embeddedObjectCount}
    Base64 Blocks: ${details.base64BlockCount}
    Max Entropy Score: ${details.entropyScore}
    Metadata Anomalies: ${metadataAnomalyScore}
    Findings: ${analysis.findings.join(", ")}
    
    Provide a JSON response with the following structure:
    {
      "riskScore": number (0-100, where 100 is highest risk),
      "riskLevel": string ("LOW", "MEDIUM", "HIGH"),
      "confidence": number (0-100, how confident you are in this assessment),
      "verdict": string (A professional, 2-3 sentence forensic verdict summarizing the risk and findings)
    }`;

    let aiResult = {
      riskScore: 0,
      riskLevel: "LOW",
      confidence: 85,
      verdict: "The document appears clean with minimal to no hidden data. No significant anomalies detected. Standard handling procedures apply."
    };

    try {
      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: { type: Type.NUMBER },
              riskLevel: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              verdict: { type: Type.STRING }
            },
            required: ["riskScore", "riskLevel", "confidence", "verdict"]
          }
        }
      });
      
      const parsed = JSON.parse(geminiResponse.text || "{}");
      if (parsed.riskScore !== undefined) aiResult = parsed;
    } catch (e) {
      console.error("Gemini API error, falling back to heuristic scoring", e);
      // Fallback heuristic scoring
      let riskScore = (hiddenRatio * 2) + (embeddedPresence * 20) + (base64EntropyScore * 2) + (metadataAnomalyScore * 0.1);
      if (analysis.findings.length > 0 && riskScore < 10) riskScore += 15;
      riskScore = Math.min(Math.max(riskScore, 0), 100);
      let riskLevel = "LOW";
      if (riskScore >= 70) riskLevel = "HIGH";
      else if (riskScore >= 30) riskLevel = "MEDIUM";
      const confidence = Math.min(80 + (analysis.findings.length * 5), 99);
      let verdict = "";
      if (riskLevel === "HIGH") {
        verdict = `The document contains a significant volume of concealed data representing ${hiddenRatio.toFixed(1)}% of total file size. Embedded binary objects and high-entropy encoded segments strongly indicate potential covert data transmission. Manual forensic review recommended.`;
      } else if (riskLevel === "MEDIUM") {
        verdict = `The document contains moderate indicators of hidden data (${hiddenRatio.toFixed(1)}% of total file size). Some anomalies detected such as comments or metadata irregularities. Proceed with caution.`;
      } else {
        verdict = `The document appears clean with minimal to no hidden data (${hiddenRatio.toFixed(1)}% of total file size). No significant anomalies detected. Standard handling procedures apply.`;
      }
      aiResult = { riskScore, riskLevel, confidence, verdict };
    }

    const response = {
      file_name: file.originalname,
      file_size: file.size,
      hidden_bytes: analysis.hiddenBytes,
      hidden_ratio: hiddenRatio,
      risk_score: aiResult.riskScore,
      risk_level: aiResult.riskLevel,
      confidence: aiResult.confidence,
      breakdown: analysis.breakdown,
      findings: analysis.findings,
      details: analysis.details,
      verdict: aiResult.verdict,
      timestamp: new Date().toISOString()
    };

    // Clean up
    fs.unlinkSync(file.path);

    res.json(response);
  } catch (error) {
    console.error("Analysis error:", error);
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ error: "Failed to analyze file" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
