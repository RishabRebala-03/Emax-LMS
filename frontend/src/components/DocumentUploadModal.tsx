import React, { useState, useRef } from 'react';
import './DocumentUploadModal.css';
import { API_BASE, apiPostForm } from '../services/api';
import { renderQuestionHtml } from '../utils/renderQuestionHtml';

export interface ParsedQuestion {
  id: string;
  type: 'mcq' | 'multiple' | 'text';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  section: string;
  marks: number;
}

interface DocumentUploadModalProps {
  onClose: () => void;
  onImport: (questions: ParsedQuestion[], sections: string[]) => void;
  existingSections: { id: string; name: string }[];
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  onClose,
  onImport,
  existingSections,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parsedSections, setParsedSections] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [overrideSection, setOverrideSection] = useState<string>('');
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setParsedQuestions([]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
      setParsedQuestions([]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) return;

    setParsing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await apiPostForm<{
        questions: ParsedQuestion[];
        sections: string[];
        filename: string;
        totalParsed: number;
      }>('/admin/exams/parse-questions', formData);

      if (!res.questions || res.questions.length === 0) {
        setError('No questions could be extracted from this document. Please check the format or try a sample template.');
        setParsedQuestions([]);
      } else {
        setParsedQuestions(res.questions);
        setParsedSections(res.sections || ['General']);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) return;

    let finalQuestions = parsedQuestions.map((q, idx) => ({
      ...q,
      id: Date.now().toString() + '-' + idx,
      section: overrideSection ? overrideSection : (q.section || 'General')
    }));

    let finalSections = [...parsedSections];
    if (overrideSection && !finalSections.includes(overrideSection)) {
      finalSections.push(overrideSection);
    }

    onImport(finalQuestions, finalSections);
    onClose();
  };

  const downloadTemplate = (format: 'txt' | 'csv' | 'json') => {
    window.open(`${API_BASE}/admin/exams/sample-template/${format}`, '_blank');
  };

  const mcqCount = parsedQuestions.filter(q => q.type === 'mcq').length;
  const multiCount = parsedQuestions.filter(q => q.type === 'multiple').length;
  const textCount = parsedQuestions.filter(q => q.type === 'text').length;
  const imgCount = parsedQuestions.filter(q => q.question?.includes('<img')).length;

  // Per-section breakdown
  const sectionCounts: Record<string, number> = {};
  parsedQuestions.forEach(q => {
    const sec = q.section || 'General';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
  });

  const previewLimit = 5;
  const visibleQuestions = showAllQuestions ? parsedQuestions : parsedQuestions.slice(0, previewLimit);

  return (
    <div className="doc-upload-overlay" onClick={onClose}>
      <div className="doc-upload-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-upload-header">
          <h3>Import Questions from Document</h3>
          <button className="doc-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="doc-upload-body">
          <p className="doc-upload-desc">
            Upload your test document (<strong>.txt</strong>, <strong>.docx</strong>, <strong>.pdf</strong>, <strong>.csv</strong>, or <strong>.json</strong>).
            The parser will extract questions, option choices, and map correct answers automatically.
          </p>

          <div className="template-download-bar">
            <span>Download Sample Format:</span>
            <button type="button" className="template-badge" onClick={() => downloadTemplate('txt')}>📄 TXT Template</button>
            <button type="button" className="template-badge" onClick={() => downloadTemplate('csv')}>📊 CSV Template</button>
            <button type="button" className="template-badge" onClick={() => downloadTemplate('json')}>｛｝ JSON Template</button>
          </div>

          <div
            className={`file-dropzone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".txt,.docx,.doc,.pdf,.csv,.json"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="selected-file-info">
                <span className="file-icon">📄</span>
                <div className="file-meta">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  className="change-file-btn"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setParsedQuestions([]);
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="dropzone-placeholder">
                <span className="upload-icon">☁️</span>
                <p className="drop-title">Drag & drop your test file here, or <span>Browse</span></p>
                <p className="drop-sub">Supports PDF, Word (DOCX), Plain Text (TXT), CSV, and JSON</p>
              </div>
            )}
          </div>

          {error && <div className="doc-upload-error">⚠️ {error}</div>}

          {selectedFile && parsedQuestions.length === 0 && !parsing && (
            <button
              type="button"
              className="primary-btn parse-btn"
              onClick={handleUploadAndParse}
            >
              Parse Questions & Answers
            </button>
          )}

          {parsing && (
            <div className="parsing-loader">
              <span className="spinner"></span>
              <span>Parsing document and mapping answers...</span>
            </div>
          )}

          {parsedQuestions.length > 0 && (
            <div className="parsed-summary-card">
              <div className="summary-title">
                ✅ Successfully Parsed {parsedQuestions.length} Questions
              </div>
              <div className="summary-badges">
                <span className="summary-chip mcq">Single Choice (MCQ): {mcqCount}</span>
                <span className="summary-chip multi">Multiple Correct: {multiCount}</span>
                <span className="summary-chip text">Text Answer: {textCount}</span>
                {imgCount > 0 && <span className="summary-chip img">📷 With Images: {imgCount}</span>}
              </div>

              {Object.keys(sectionCounts).length > 1 && (
                <div className="section-breakdown">
                  <span className="breakdown-label">Per Section:</span>
                  {Object.entries(sectionCounts).map(([sec, count]) => (
                    <span key={sec} className="summary-chip section">{sec}: {count}</span>
                  ))}
                </div>
              )}

              <div className="section-assign-row">
                <label>Target Section for Imported Questions:</label>
                <select
                  value={overrideSection}
                  onChange={e => setOverrideSection(e.target.value)}
                >
                  <option value="">Use Sections Detected from File ({parsedSections.join(', ')})</option>
                  {existingSections.map(s => (
                    <option key={s.id} value={s.name}>{s.name} (Existing Section)</option>
                  ))}
                </select>
              </div>

              <div className="parsed-preview-list">
                <h4>Parsed Questions Preview</h4>
                {visibleQuestions.map((q, i) => (
                  <div key={i} className="parsed-preview-item">
                    <div className="preview-header">
                      <span className="preview-qnum">Q{(showAllQuestions ? i : i) + 1}</span>
                      <span className="preview-type">{q.type.toUpperCase()}</span>
                      <span className="preview-marks">{q.marks || 1}m</span>
                      <span className="preview-sec">{overrideSection || q.section}</span>
                    </div>
                    <p className="preview-text">{renderQuestionHtml(q.question)}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="preview-options">
                        {q.options.map((opt, idx) => {
                          const isCorrect = Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.includes(opt)
                            : q.correctAnswer === opt;
                          return (
                            <span key={idx} className={`preview-opt ${isCorrect ? 'correct' : ''}`}>
                              {isCorrect ? '✓ ' : ''}{renderQuestionHtml(opt)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {parsedQuestions.length > previewLimit && (
                  <button
                    type="button"
                    className="toggle-preview-btn"
                    onClick={() => setShowAllQuestions(!showAllQuestions)}
                  >
                    {showAllQuestions
                      ? '▲ Show Less'
                      : `▼ Show All ${parsedQuestions.length} Questions`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="doc-upload-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          {parsedQuestions.length > 0 && (
            <button type="button" className="primary-btn" onClick={handleConfirmImport}>
              Import {parsedQuestions.length} Questions into Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
