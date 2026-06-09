import React, { useEffect, useState } from 'react';
import './QuestionPanel.css';

interface Question {
  id: string;
  type: 'mcq' | 'msq' | 'multiple' | 'ordering' | 'text';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  section: string;
  marks: number;
}

interface QuestionPanelProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  answer: string | string[];
  isMarked: boolean;
  onAnswer: (answer: string | string[]) => void;
  onMarkForReview: () => void;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  questionNumber,
  answer,
  onAnswer,
}) => {
  const isMultipleChoice = Array.isArray(question.correctAnswer);

  const [orderedItems, setOrderedItems] = useState<string[]>(() => {
    if (question.type === 'ordering') {
      if (Array.isArray(answer) && answer.length > 0) return answer as string[];
      return question.options ? [...question.options] : [];
    }
    return [];
  });

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (question.type === 'ordering') {
      if (Array.isArray(answer) && answer.length > 0) {
        setOrderedItems(answer as string[]);
      } else {
        setOrderedItems(question.options ? [...question.options] : []);
      }
    }
  }, [answer, question.id, question.options, question.type]);

  const handleOptionClick = (option: string) => {
    if (isMultipleChoice) {
      const currentAnswers = Array.isArray(answer) ? answer : [];
      if (currentAnswers.includes(option)) {
        onAnswer(currentAnswers.filter((a) => a !== option));
      } else {
        onAnswer([...currentAnswers, option]);
      }
      return;
    }

    onAnswer(option);
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const updated = [...orderedItems];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setDragIndex(index);
    setOrderedItems(updated);
    onAnswer(updated);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="question-panel">
      <div className="question-header">
        <span className="question-number">{questionNumber}.</span>
        <p className="question-text prewrap">{question.question}</p>
      </div>

      {question.options && question.type !== 'ordering' && question.type !== 'text' && !isMultipleChoice && (
        <div className="options-list">
          {question.options.map((option, index) => (
            <label key={index} className="option-item-label">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={answer === option}
                onChange={() => handleOptionClick(option)}
                className="option-radio"
              />
              <span className="option-text">{option}</span>
            </label>
          ))}
        </div>
      )}

      {question.options && question.type !== 'ordering' && question.type !== 'text' && isMultipleChoice && (
        <>
          <p className="note-text">Note: There are multiple correct answers to this question.</p>
          <div className="options-list">
            {question.options.map((option, index) => {
              const isSelected = Array.isArray(answer) && answer.includes(option);
              return (
                <label key={index} className="option-item-label">
                  <input
                    type="checkbox"
                    name={`question-${question.id}`}
                    value={option}
                    checked={isSelected}
                    onChange={() => handleOptionClick(option)}
                    className="option-checkbox"
                  />
                  <span className="option-text">{option}</span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {question.type === 'ordering' && (
        <>
          <p className="note-text">Note: Drag and drop the options to arrange them in the correct order.</p>
          <div className="options-list ordering-list">
            {orderedItems.map((item, index) => (
              <div
                key={item}
                className={`ordering-item ${dragIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="ordering-handle">::</span>
                <span className="ordering-index">{index + 1}.</span>
                <span className="option-text">{item}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {question.type === 'text' && (
        <textarea
          className="text-answer"
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={6}
        />
      )}
    </div>
  );
};

export default QuestionPanel;
