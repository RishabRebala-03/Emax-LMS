// TestBuilder.tsx
import React, { useState } from 'react';
import './TestBuilder.css';
import { apiPost } from "../services/api";
import DocumentUploadModal, { ParsedQuestion } from './DocumentUploadModal';
import { renderQuestionHtml } from '../utils/renderQuestionHtml';

interface Question {
  id: string;
  type: 'mcq' | 'multiple' | 'text';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  section: string;
  marks: number;
}

interface Section {
  id: string;
  name: string;
}

interface TestBuilderProps {
  onBack: () => void;
}

const TestBuilder: React.FC<TestBuilderProps> = ({ onBack }) => {
  const [testName, setTestName] = useState('');
  const [duration, setDuration] = useState(60);
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [sections, setSections] = useState<Section[]>([
    { id: 'general', name: 'General' }
  ]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newSection, setNewSection] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({
    type: 'mcq' as 'mcq' | 'multiple' | 'text',
    question: '',
    options: ['', ''],
    correctAnswer: '',
    correctAnswers: [] as string[],
    section: sections[0]?.id || '',
    marks: 1,
  });

  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({
    type: 'mcq' as 'mcq' | 'multiple' | 'text',
    question: '',
    options: ['', ''],
    correctAnswer: '',
    correctAnswers: [] as string[],
    section: '',
    marks: 1,
  });

  const startInlineEdit = (q: Question) => {
    setInlineEditingId(q.id);
    const isArrayAns = Array.isArray(q.correctAnswer);
    setInlineForm({
      type: q.type,
      question: q.question,
      options: q.options && q.options.length > 0 ? [...q.options] : ['', ''],
      correctAnswer: isArrayAns ? (q.correctAnswer?.[0] || '') : ((q.correctAnswer as string) || ''),
      correctAnswers: isArrayAns ? (q.correctAnswer as string[]) : (q.correctAnswer ? [q.correctAnswer as string] : []),
      section: q.section,
      marks: q.marks || 1,
    });
  };

  const saveInlineEdit = (id: string) => {
    if (!inlineForm.question.trim()) {
      alert("Question statement cannot be empty");
      return;
    }
    if (inlineForm.type === 'mcq' || inlineForm.type === 'multiple') {
      const validOpts = inlineForm.options.filter(o => o.trim());
      if (validOpts.length < 2) {
        alert("Please add at least 2 options");
        return;
      }
    }

    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      return {
        ...q,
        type: inlineForm.type,
        question: inlineForm.question,
        section: inlineForm.section,
        marks: inlineForm.marks,
        options: (inlineForm.type === 'mcq' || inlineForm.type === 'multiple')
          ? inlineForm.options.filter(o => o.trim())
          : [],
        correctAnswer: inlineForm.type === 'mcq' 
          ? inlineForm.correctAnswer
          : (inlineForm.type === 'multiple' ? inlineForm.correctAnswers : inlineForm.correctAnswer)
      };
    }));

    setInlineEditingId(null);
  };


  const handleImportParsedQuestions = (importedQuestions: ParsedQuestion[], importedSections: string[]) => {
    let updatedSections = [...sections];

    // Ensure all imported section names exist in state
    importedSections.forEach(secName => {
      if (!secName) return;
      const exists = updatedSections.some(s => s.name.toLowerCase() === secName.toLowerCase());
      if (!exists) {
        updatedSections.push({
          id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: secName
        });
      }
    });

    setSections(updatedSections);

    // Map questions to use section IDs
    const mappedQuestions: Question[] = importedQuestions.map(q => {
      const matchingSection = updatedSections.find(s => s.name.toLowerCase() === (q.section || 'General').toLowerCase());
      const sectionId = matchingSection ? matchingSection.id : updatedSections[0]?.id || 'general';

      return {
        id: q.id || Date.now().toString() + Math.random(),
        type: q.type,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        section: sectionId,
        marks: q.marks || 1
      };
    });

    setQuestions(prev => [...prev, ...mappedQuestions]);
  };

  const addSection = () => {
    const name = newSection.trim();
    if (!name) return;
    const exists = sections.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    setSections([...sections, { id: Date.now().toString(), name }]);
    setNewSection('');
  };

  const addOption = () => {
    setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] });
  };

  const removeOption = (index: number) => {
    const removedOption = questionForm.options[index];
    const newOptions = questionForm.options.filter((_, i) => i !== index);
    setQuestionForm({
      ...questionForm,
      options: newOptions,
      correctAnswers: questionForm.correctAnswers.filter(a => a !== removedOption),
      correctAnswer: questionForm.correctAnswer === removedOption ? '' : questionForm.correctAnswer,
    });
  };

  const addQuestion = () => {
    if (questionForm.type === 'mcq' || questionForm.type === 'multiple') {
      const validOptions = questionForm.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        alert('Please add at least 2 options');
        return;
      }
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: questionForm.type,
      question: questionForm.question,
      section: questionForm.section,
      marks: questionForm.marks,
    };

    if (questionForm.type === 'mcq' || questionForm.type === 'multiple') {
      newQuestion.options = questionForm.options.filter(opt => opt.trim());
    }

    if (questionForm.type === 'mcq') {
      newQuestion.correctAnswer = questionForm.correctAnswer;
    } else if (questionForm.type === 'multiple') {
      newQuestion.correctAnswer = questionForm.correctAnswers;
    } else {
      newQuestion.correctAnswer = questionForm.correctAnswer;
    }

    setQuestions([...questions, newQuestion]);
    setQuestionForm({
      type: 'mcq',
      question: '',
      options: ['', ''],
      correctAnswer: '',
      correctAnswers: [],
      section: sections[0]?.id || '',
      marks: 1,
    });
    setShowQuestionForm(false);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const toggleCorrectAnswer = (option: string) => {
    const current = questionForm.correctAnswers;
    if (current.includes(option)) {
      setQuestionForm({ ...questionForm, correctAnswers: current.filter(a => a !== option) });
    } else {
      setQuestionForm({ ...questionForm, correctAnswers: [...current, option] });
    }
  };

  const getQuestionsBySection = (sectionId: string) => {
    return questions.filter(q => q.section === sectionId);
  };

  const handleSaveTest = async () => {
    if (!testName.trim()) { alert("Test name is required"); return; }
    if (questions.length === 0) { alert("Add at least one question before saving the test"); return; }
    if (passingPercentage < 1 || passingPercentage > 100) {
      alert("Passing score must be between 1 and 100");
      return;
    }

    try {
      const sectionNames = sections.map(s => s.name);
      const questionsWithSectionNames = questions.map(q => {
        const sectionObj = sections.find(s => s.id === q.section);
        return { ...q, section: sectionObj ? sectionObj.name : q.section };
      });

      await apiPost("/admin/exams", {
        testName,
        duration,
        passingPercentage,
        sections: sectionNames,
        questions: questionsWithSectionNames,
      });

      alert("Test saved successfully");
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to save test");
    }
  };

  return (
    <div className="test-builder page-with-topbar">
      <div className="page-header">
        <h2>Create New Test</h2>
        <button className="secondary-btn" onClick={onBack}>
          ← Back to Tests
        </button>
      </div>

      {/* ── Test Details ── */}
      <div className="form-card">
        <h3>Test Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Test Name *</label>
            <input
              type="text"
              value={testName}
              onChange={e => setTestName(e.target.value)}
              placeholder="Enter test name"
            />
          </div>
          <div className="form-group">
            <label>Duration (minutes) *</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              placeholder="60"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Passing Score (%) *</label>
            <input
              type="number"
              value={passingPercentage}
              onChange={e => setPassingPercentage(Number(e.target.value))}
              placeholder="40"
              min="1"
              max="100"
            />
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="section-management">
          <h4>Sections</h4>
          <div className="section-tags">
            {sections.map(section => (
              <div key={section.id} className="section-chip">
                {editingSectionId === section.id ? (
                  <input
                    className="section-edit-input"
                    value={section.name}
                    autoFocus
                    onChange={e => setSections(sections.map(s =>
                      s.id === section.id ? { ...s, name: e.target.value } : s
                    ))}
                    onBlur={() => setEditingSectionId(null)}
                    onKeyDown={e => { if (e.key === 'Enter') setEditingSectionId(null); }}
                  />
                ) : (
                  <span className="section-name">{section.name}</span>
                )}
                <div className="section-actions">
                  <button type="button" className="icon-btn" title="Edit section"
                    onClick={() => setEditingSectionId(section.id)}>
                    ✏️
                  </button>
                  <button type="button" className="icon-btn danger" title="Delete section"
                    onClick={() => {
                      const remaining = sections.filter(s => s.id !== section.id);
                      setSections(remaining);
                      setQuestions(questions.filter(q => q.section !== section.id));
                      setQuestionForm(prev => ({
                        ...prev,
                        section: prev.section === section.id ? (remaining[0]?.id || '') : prev.section,
                      }));
                    }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="add-section">
            <input
              type="text"
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              placeholder="New section name"
              onKeyDown={e => { if (e.key === 'Enter') addSection(); }}
            />
            <button className="primary-btn" onClick={addSection}>Add Section</button>
          </div>
        </div>
      </div>

      {/* ── Questions ── */}
      <div className="questions-section">
        <div className="section-header">
          <h3>Questions ({questions.length})</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="secondary-btn"
              onClick={() => setShowUploadModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}
            >
              <span>📤</span> Upload Document
            </button>
            <button className="primary-btn" onClick={() => setShowQuestionForm(!showQuestionForm)}>
              {showQuestionForm ? 'Cancel' : '+ Add Question'}
            </button>
          </div>
        </div>

        {showUploadModal && (
          <DocumentUploadModal
            onClose={() => setShowUploadModal(false)}
            onImport={handleImportParsedQuestions}
            existingSections={sections}
          />
        )}

        {showQuestionForm && (
          <div className="question-form">
            <div className="form-row">
              <div className="form-group">
                <label>Question Type *</label>
                <select value={questionForm.type}
                  onChange={e => setQuestionForm({ ...questionForm, type: e.target.value as any })}>
                  <option value="mcq">Single Choice (MCQ)</option>
                  <option value="multiple">Multiple Correct Answers</option>
                  <option value="text">Text Answer</option>
                </select>
              </div>
              <div className="form-group">
                <label>Section *</label>
                <select value={questionForm.section}
                  onChange={e => setQuestionForm({ ...questionForm, section: e.target.value })}>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Marks *</label>
                <input type="number" value={questionForm.marks} min="1"
                  onChange={e => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label>Question *</label>
              <textarea value={questionForm.question} rows={3}
                onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
                placeholder="Enter your question" />
            </div>

            {(questionForm.type === 'mcq' || questionForm.type === 'multiple') && (
              <div className="options-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Options * (minimum 2)</label>
                  <button type="button" className="primary-btn"
                    onClick={addOption} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                    + Add Option
                  </button>
                </div>
                {questionForm.options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input type="text" value={option} placeholder={`Option ${index + 1}`}
                      onChange={e => handleOptionChange(index, e.target.value)} />
                    {questionForm.type === 'mcq' ? (
                      <input type="radio" name="correct"
                        checked={questionForm.correctAnswer === option}
                        onChange={() => setQuestionForm({ ...questionForm, correctAnswer: option })} />
                    ) : (
                      <input type="checkbox"
                        checked={questionForm.correctAnswers.includes(option)}
                        onChange={() => toggleCorrectAnswer(option)} />
                    )}
                    <span className="option-label">Correct</span>
                    {questionForm.options.length > 2 && (
                      <button type="button" className="icon-btn danger"
                        onClick={() => removeOption(index)} title="Remove option"
                        style={{ marginLeft: '0.5rem' }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {questionForm.type === 'text' && (
              <div className="form-group">
                <label>Model Answer (for reference)</label>
                <textarea value={questionForm.correctAnswer} rows={3}
                  onChange={e => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                  placeholder="Enter model answer" />
              </div>
            )}

            <div className="form-actions">
              <button className="primary-btn" onClick={addQuestion}>Add Question</button>
            </div>
          </div>
        )}

        {sections.map(section => {
          const sectionQuestions = getQuestionsBySection(section.id);
          if (sectionQuestions.length === 0) return null;
          return (
            <div key={section.id} className="section-block">
              <h4>{section.name} ({sectionQuestions.length} questions)</h4>
              <div className="questions-list">
                {sectionQuestions.map((q, index) => {
                  const isEditingInline = inlineEditingId === q.id;

                  if (isEditingInline) {
                    return (
                      <div key={q.id} className="question-card inline-editing-card" style={{ borderLeft: '0.25rem solid #2563eb', background: '#f8fafc', padding: '1.25rem' }}>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label>Question Type</label>
                            <select
                              value={inlineForm.type}
                              onChange={e => setInlineForm({ ...inlineForm, type: e.target.value as any })}
                            >
                              <option value="mcq">Single Choice (MCQ)</option>
                              <option value="multiple">Multiple Correct Answers</option>
                              <option value="text">Text Answer</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Section</label>
                            <select
                              value={inlineForm.section}
                              onChange={e => setInlineForm({ ...inlineForm, section: e.target.value })}
                            >
                              {sections.map(sec => (
                                <option key={sec.id} value={sec.id}>{sec.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Marks</label>
                            <input
                              type="number"
                              min="1"
                              value={inlineForm.marks}
                              onChange={e => setInlineForm({ ...inlineForm, marks: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <label>Question Statement</label>
                          <textarea
                            rows={3}
                            value={inlineForm.question}
                            onChange={e => setInlineForm({ ...inlineForm, question: e.target.value })}
                            style={{ width: '100%', fontFamily: 'inherit', padding: '0.5rem' }}
                          />
                        </div>

                        {(inlineForm.type === 'mcq' || inlineForm.type === 'multiple') && (
                          <div className="options-section" style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <label style={{ fontWeight: 600 }}>Options</label>
                              <button
                                type="button"
                                className="primary-btn"
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                                onClick={() => setInlineForm({ ...inlineForm, options: [...inlineForm.options, ''] })}
                              >
                                + Add Option
                              </button>
                            </div>
                            {inlineForm.options.map((opt, optIdx) => (
                              <div key={optIdx} className="option-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <input
                                  type="text"
                                  value={opt}
                                  placeholder={`Option ${optIdx + 1}`}
                                  onChange={e => {
                                    const nextOpts = [...inlineForm.options];
                                    nextOpts[optIdx] = e.target.value;
                                    setInlineForm({ ...inlineForm, options: nextOpts });
                                  }}
                                  style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                                />
                                {inlineForm.type === 'mcq' ? (
                                  <input
                                    type="radio"
                                    name={`inline-correct-${q.id}`}
                                    checked={inlineForm.correctAnswer === opt}
                                    onChange={() => setInlineForm({ ...inlineForm, correctAnswer: opt })}
                                  />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={inlineForm.correctAnswers.includes(opt)}
                                    onChange={() => {
                                      const current = inlineForm.correctAnswers;
                                      const next = current.includes(opt)
                                        ? current.filter(a => a !== opt)
                                        : [...current, opt];
                                      setInlineForm({ ...inlineForm, correctAnswers: next });
                                    }}
                                  />
                                )}
                                <span className="option-label" style={{ fontSize: '0.8rem' }}>Correct</span>
                                {inlineForm.options.length > 2 && (
                                  <button
                                    type="button"
                                    className="icon-btn danger"
                                    onClick={() => {
                                      const removed = inlineForm.options[optIdx];
                                      const nextOpts = inlineForm.options.filter((_, i) => i !== optIdx);
                                      setInlineForm({
                                        ...inlineForm,
                                        options: nextOpts,
                                        correctAnswer: inlineForm.correctAnswer === removed ? '' : inlineForm.correctAnswer,
                                        correctAnswers: inlineForm.correctAnswers.filter(a => a !== removed)
                                      });
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {inlineForm.type === 'text' && (
                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label>Model Answer</label>
                            <textarea
                              rows={2}
                              value={inlineForm.correctAnswer}
                              onChange={e => setInlineForm({ ...inlineForm, correctAnswer: e.target.value })}
                              style={{ width: '100%', padding: '0.5rem' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => setInlineEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => saveInlineEdit(q.id)}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={q.id} className="question-card">
                      <div className="question-header">
                        <span className="question-number">Q{index + 1}</span>
                        <span className="question-type">{q.type.toUpperCase()}</span>
                        <span className="question-marks">{q.marks} marks</span>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', marginLeft: 'auto' }}
                          onClick={() => startInlineEdit(q)}
                        >
                          ✏️ Edit
                        </button>
                        <button className="delete-icon" onClick={() => deleteQuestion(q.id)} style={{ marginLeft: '0.4rem' }}>✕</button>
                      </div>
                      <p className="question-text prewrap">{renderQuestionHtml(q.question)}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="options-list">
                          {q.options.map((opt, i) => (
                            <li key={i} className={
                              (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt)) ||
                              q.correctAnswer === opt ? 'correct-option' : ''
                            }>
                              {renderQuestionHtml(opt)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}


        {questions.length === 0 && !showQuestionForm && (
          <div className="empty-state">
            No questions added yet. Click "Add Question" to start building your test.
          </div>
        )}
      </div>

      {questions.length > 0 && (
        <div className="form-actions">
          <button className="primary-btn large" onClick={handleSaveTest}>Save Test</button>
        </div>
      )}
    </div>
  );
};

export default TestBuilder;