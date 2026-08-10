import React, { useEffect, useState } from "react";
import QuestionPanel from "./QuestionPanel";
import QuestionNavigator from "./QuestionNavigator";
import ResultsPage from "./ResultsPage";
import TestDetails from "./TestDetails";
import TestInstructions from "./TestInstructions";
import "./TestInterface.css";
import { apiPost, apiPut } from "../services/api";

interface Question {
  id: string;
  type: "mcq" | "msq" | "multiple" | "ordering" | "text";
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  section: string;
  marks: number;
}

interface Answer {
  questionId: string;
  answer: string | string[];
  marked: boolean;
}

interface ResultPayload {
  attemptId: string;
  totalMarks: number;
  scoredMarks: number;
  percentage: number;
  passed: boolean;
  percentile: number;
  sectionWise: Record<string, { total: number; scored: number }>;
  questionReview: Array<{
    questionId: string;
    isCorrect: boolean;
    userAnswer: string | string[];
    correctAnswer?: string | string[];
    marks: number;
    section: string;
  }>;
}

interface TestInterfaceProps {
  userId: string;
  examId: string;
  testName: string;
  duration: number;
  passingPercentage?: number;
  questions: Question[];
  onExit: () => void;
}

const TestInterface: React.FC<TestInterfaceProps> = ({
  userId,
  examId,
  testName,
  duration,
  passingPercentage = 40,
  questions,
  onExit,
}) => {
  const getInitialAnswer = (question: Question): string | string[] => {
    if (question.type === "ordering") return [];
    const isMultipleChoice = Array.isArray(question.correctAnswer);
    return isMultipleChoice ? [] : "";
  };

  const [testStep, setTestStep] = useState<"details" | "instructions" | "exam" | "results">("details");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answers, setAnswers] = useState<Answer[]>(
    questions.map((q) => ({
      questionId: q.id,
      answer: getInitialAnswer(q),
      marked: false,
    }))
  );

  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [currentSection, setCurrentSection] = useState<string>(questions[0]?.section || "");
  const sections = Array.from(new Set(questions.map((q) => q.section)));

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // attempt id from backend
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ResultPayload | null>(null);

  // timer
  useEffect(() => {
    if (testStep !== "exam") return;

    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }

    if (timeLeft === 0) {
      // autosubmit
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, testStep]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswer = (answer: string | string[]) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = { ...next[currentQuestionIndex], answer };
      return next;
    });
  };

  const handleMarkForReview = () => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = { ...next[currentQuestionIndex], marked: !next[currentQuestionIndex].marked };
      return next;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const ni = currentQuestionIndex + 1;
      setCurrentQuestionIndex(ni);
      setCurrentSection(questions[ni].section);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const pi = currentQuestionIndex - 1;
      setCurrentQuestionIndex(pi);
      setCurrentSection(questions[pi].section);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
    setCurrentSection(questions[index].section);
  };

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    const first = questions.findIndex((q) => q.section === section);
    if (first !== -1) setCurrentQuestionIndex(first);
  };

  const getQuestionStatus = (index: number) => {
    const a = answers[index];
    if (!a) return "unanswered";
    if (a.marked) return "marked";
    const hasAnswer = Array.isArray(a.answer) ? a.answer.length > 0 : a.answer !== "";
    return hasAnswer ? "answered" : "unanswered";
  };

  const areAllQuestionsAnswered = () => {
    return answers.every((a) => {
      if (Array.isArray(a.answer)) {
        return a.answer.length > 0;
      }
      return a.answer !== "";
    });
  };

  // Create attempt when user enters EXAM step
  const startAttempt = async () => {
    const res = await apiPost<{ attemptId: string }>("/answerer/attempts/start", {
      userId,
      examId,
    });
    setAttemptId(res.attemptId);
  };

  const saveProgress = async () => {
    if (!attemptId) return;
    const timeSpentSec = duration * 60 - timeLeft;

    await apiPut(`/answerer/attempts/${attemptId}/save`, {
      answers,
      timeSpentSec,
    });
  };

  const handleSubmit = async () => {
    try {
      // ensure attempt exists
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const start = await apiPost<{ attemptId: string }>("/answerer/attempts/start", {
          userId,
          examId,
        });
        currentAttemptId = start.attemptId;
        setAttemptId(currentAttemptId);
      }

      const timeSpentSec = duration * 60 - timeLeft;

      const result = await apiPost<ResultPayload>(`/answerer/attempts/${currentAttemptId}/submit`, {
        answers,
        timeSpentSec,
      });

      setSubmitResult(result);
      setTestStep("results");
    } catch (e) {
      console.error(e);
      alert("Failed to submit attempt to backend");
    }
  };

  // Auto-save every 15 seconds during exam
  useEffect(() => {
    if (testStep !== "exam") return;
    const t = setInterval(() => {
      saveProgress().catch(() => {});
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testStep, attemptId, timeLeft, answers]);

  // Screens
  if (testStep === "details") {
    return (
      <TestDetails
        testName={testName}
        questionCount={questions.length}
        duration={duration}
        passingPercentage={passingPercentage || 60}
        onContinue={() => setTestStep("instructions")}
        onBack={onExit}
      />
    );
  }

  if (testStep === "instructions") {
    return (
      <TestInstructions
        testName={testName}
        duration={duration}
        onStart={async () => {
          try {
            await startAttempt();
            setTestStep("exam");
          } catch (e) {
            console.error(e);
            alert("Failed to start attempt");
          }
        }}
        onBack={() => setTestStep("details")}
      />
    );
  }

  if (testStep === "results" && submitResult) {
    return (
      <ResultsPage
        testName={testName}
        questions={questions}
        answers={answers}
        passingPercentage={passingPercentage}
        backendResult={submitResult}
        onBackToDashboard={onExit}
      />
    );
  }

  if (testStep === "results" && !submitResult) {
    return <div style={{ padding: "2rem" }}>Loading results...</div>;
  }

  return (
    <div className="test-interface">
      {/* ===== TOP HEADER (matching TestDetails/Instructions) ===== */}
      <header className="test-header">
        <div className="test-header-left">
          <img
            src="/assets/emax-logo.png"
            alt="Emax Technologies"
            className="topbar-logo"
          />
          <span className="test-portal-title">Online Exam Portal</span>
        </div>

        <div className="test-header-right">
          <span className="user-meta">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })}{" "}
            | Logged in as : {userId}
          </span>
          <div className="test-timer">
            <span>Time remaining:</span>
            <span className={`timer-value ${timeLeft < 300 ? "timer-warning" : ""}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      {/* ===== SUB HEADER ===== */}
      <div className="test-subheader">
        <h3 className="test-title">{testName}</h3>
        <span className="question-info">
          {currentQuestionIndex + 1} of {questions.length}
        </span>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="test-body">
        <div className="question-section">
          <QuestionPanel
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            answer={answers[currentQuestionIndex].answer}
            isMarked={answers[currentQuestionIndex].marked}
            onAnswer={handleAnswer}
            onMarkForReview={handleMarkForReview}
          />
        </div>

        <QuestionNavigator
          questions={questions}
          currentIndex={currentQuestionIndex}
          answers={answers}
          sections={sections}
          currentSection={currentSection}
          onQuestionSelect={handleQuestionSelect}
          onSectionChange={handleSectionChange}
          getQuestionStatus={getQuestionStatus}
        />

        {/* ===== NAVIGATION CONTROLS ===== */}
        <div className="navigation-controls">
          <button
            className="nav-btn secondary"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            &lt; Previous Question
          </button>

          <button
            className={`nav-btn review-btn ${answers[currentQuestionIndex].marked ? "marked" : ""}`}
            onClick={handleMarkForReview}
          >
            {answers[currentQuestionIndex].marked ? "Unmark Review" : "Mark for Review"}
          </button>

          {!isLastQuestion && (
            <button
              className="nav-btn primary"
              onClick={handleNext}
            >
              Next Question &gt;
            </button>
          )}

          {isLastQuestion && !areAllQuestionsAnswered() && (
            <div style={{ color: "#d32f2f", marginTop: "8px", fontSize: "0.9rem" }}>
              ⚠️ Please answer all questions before submitting the test.
            </div>
          )}

          {isLastQuestion && (
            <button
              className="nav-btn submit-btn"
              onClick={handleSubmit}
              disabled={!areAllQuestionsAnswered()}
              title={
                areAllQuestionsAnswered()
                  ? "Submit test"
                  : "Please answer all questions before submitting"
              }
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestInterface;
