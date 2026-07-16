import React, { useEffect, useMemo, useRef, useState } from 'react';
import './TestResults.css';
import { apiGet } from '../services/api';
import {
  filterResultTests,
  filterTestResults,
  formatDurationBand,
  formatPassRateBand,
  formatScoreBand,
  formatTimeSpentBand,
  type DateFilter,
  type DurationBand,
  type PassRateBand,
  type ScoreBand,
  type TestAttemptsFilter,
  type TestResultsSort,
  type TimeSpentBand,
  type UserSort,
} from '../utils/filterUtils';

interface Test {
  id: string;
  name: string;
  duration: number;
  questions: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
}

interface UserResult {
  id: string;
  userId: string;
  userName: string;
  collegeName?: string;
  percentage: number;
  scoredMarks: number;
  totalMarks: number;
  passed: boolean;
  submittedAt: string;
  timeSpentSec: number;
}

interface QuestionReview {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string | string[];
  correctAnswer?: string | string[];
  marks: number;
  section: string;
}

interface DetailedResult {
  attemptId: string;
  userId: string;
  userName: string;
  examName: string;
  totalMarks: number;
  scoredMarks: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  timeSpentSec: number;
  sectionWise: Record<string, { total: number; scored: number }>;
  questionReview: QuestionReview[];
}

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
  correctAnswer?: string | string[];
  section: string;
  marks: number;
}

interface ValueHelpOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface ValueHelpFieldProps {
  label: string;
  placeholder: string;
  value: string;
  options: ValueHelpOption[];
  onChange: (value: string) => void;
  allowFreeText?: boolean;
  compact?: boolean;
}

type View = 'tests' | 'users' | 'details';

const ValueHelpField: React.FC<ValueHelpFieldProps> = ({
  label,
  placeholder,
  value,
  options,
  onChange,
  allowFreeText = false,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((option) => {
      const haystack = [option.label, option.value, ...(option.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [options, query]);

  const displayLabel = useMemo(() => {
    const match = options.find((option) => option.value === value);
    return match?.label || value;
  }, [options, value]);

  return (
    <div ref={wrapperRef} className={`value-help-field ${compact ? 'compact' : ''}`}>
      <label className="value-help-label">{label}</label>
      <div className={`value-help-trigger-row ${open ? 'open' : ''}`} onClick={() => setOpen(true)}>
        <input
          className="value-help-input"
          type="text"
          value={allowFreeText ? value : displayLabel}
          placeholder={placeholder}
          readOnly={!allowFreeText}
          onChange={(e) => allowFreeText && onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen(true);
            }
            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <span className="value-help-chevron" aria-hidden="true">▾</span>
      </div>

      {open && (
        <div className="value-help-popover">
          <div className="value-help-header">
            <span className="value-help-title">{label}</span>
            <span className="value-help-hint">Search and select a value</span>
          </div>
          <input
            className="value-help-search"
            type="text"
            value={query}
            placeholder={`Search ${label.toLowerCase()} values...`}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="value-help-list">
            {filteredOptions.length === 0 && <div className="value-help-empty">No matching values</div>}
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`value-help-option ${option.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span className="value-help-option-label">{option.label}</span>
                {option.keywords && option.keywords.length > 0 && (
                  <span className="value-help-option-meta">{option.keywords.join(' • ')}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TestResults: React.FC = () => {
  const [view, setView] = useState<View>('tests');
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [detailedResult, setDetailedResult] = useState<DetailedResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [testSearch, setTestSearch] = useState('');
  const [testAttemptsFilter, setTestAttemptsFilter] = useState<TestAttemptsFilter>('all');
  const [testPassRateBand, setTestPassRateBand] = useState<PassRateBand>('all');
  const [testDurationBand, setTestDurationBand] = useState<DurationBand>('all');
  const [testSortBy, setTestSortBy] = useState<TestResultsSort>('recent');
  const [showTestFilters, setShowTestFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<UserSort>('score-high');
  const [minPercent, setMinPercent] = useState<number>(0);
  const [maxPercent, setMaxPercent] = useState<number>(100);
  const [scoreBandFilter, setScoreBandFilter] = useState<ScoreBand>('all');
  const [timeSpentBand, setTimeSpentBand] = useState<TimeSpentBand>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [minTimeSpentMinutes, setMinTimeSpentMinutes] = useState<number>(0);
  const [maxTimeSpentMinutes, setMaxTimeSpentMinutes] = useState<number>(0);
  const [showUserFilters, setShowUserFilters] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    setFilteredResults(
      filterTestResults(userResults, {
        search: searchQuery,
        status: filterStatus,
        college: collegeFilter,
        sortBy,
        minPercent,
        maxPercent,
        scoreBand: scoreBandFilter,
        timeSpentBand,
        dateFilter,
        minScore,
        minTimeSpentMinutes,
        maxTimeSpentMinutes,
      })
    );
  }, [
    userResults,
    searchQuery,
    filterStatus,
    collegeFilter,
    sortBy,
    minPercent,
    maxPercent,
    scoreBandFilter,
    timeSpentBand,
    dateFilter,
    minScore,
    minTimeSpentMinutes,
    maxTimeSpentMinutes,
  ]);

  const loadTests = async () => {
    try {
      const res = await apiGet<{ tests: any[] }>('/admin/results/tests');
      const testsData = res.tests.map((t: any) => ({
        id: t.id,
        name: t.name,
        duration: t.duration,
        questions: t.questions,
        totalAttempts: t.totalAttempts || 0,
        avgScore: t.avgScore || 0,
        passRate: t.passRate || 0,
      }));
      setTests(testsData);
    } catch (e) {
      console.error('Failed to load tests:', e);
    }
  };

  const loadUserResults = async (testId: string) => {
    try {
      const res = await apiGet<{ results: any[] }>(`/admin/results/tests/${testId}/users`);
      const results = res.results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName || r.userId,
        collegeName: r.collegeName || '',
        percentage: r.percentage,
        scoredMarks: r.scoredMarks,
        totalMarks: r.totalMarks,
        passed: r.passed,
        submittedAt: r.submittedAt,
        timeSpentSec: r.timeSpentSec,
      }));
      setUserResults(results);
    } catch (e) {
      console.error('Failed to load user results:', e);
    }
  };

  const loadDetailedResult = async (resultId: string, testId: string) => {
    try {
      const [resultRes, testRes] = await Promise.all([
        apiGet<{ result: any }>(`/admin/results/${resultId}`),
        apiGet<{ test: any }>(`/admin/exams/${testId}`),
      ]);

      const result = resultRes.result;
      const test = testRes.test;

      setDetailedResult({
        attemptId: result.attemptId,
        userId: result.userId,
        userName: result.userName || result.userId,
        examName: test.testName,
        totalMarks: result.totalMarks,
        scoredMarks: result.scoredMarks,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt,
        timeSpentSec: result.timeSpentSec || 0,
        sectionWise: result.sectionWise || {},
        questionReview: result.questionReview || [],
      });

      setQuestions(test.questions || []);
    } catch (e) {
      console.error('Failed to load detailed result:', e);
    }
  };

  const filteredTests = useMemo(() => {
    return filterResultTests(tests, {
      search: testSearch,
      attempts: testAttemptsFilter,
      passRateBand: testPassRateBand,
      durationBand: testDurationBand,
      sortBy: testSortBy,
    });
  }, [tests, testSearch, testAttemptsFilter, testPassRateBand, testDurationBand, testSortBy]);

  const activeUserFilterCount = [
    searchQuery,
    filterStatus !== 'all',
    collegeFilter !== 'all',
    scoreBandFilter !== 'all',
    timeSpentBand !== 'all',
    dateFilter !== 'all',
    minPercent > 0,
    maxPercent < 100,
    minScore > 0,
    minTimeSpentMinutes > 0,
    maxTimeSpentMinutes > 0,
    sortBy !== 'score-high',
  ].filter(Boolean).length;

  const activeTestFilterCount = [
    testSearch,
    testAttemptsFilter !== 'all',
    testPassRateBand !== 'all',
    testDurationBand !== 'all',
    testSortBy !== 'recent',
  ].filter(Boolean).length;

  const userSearchOptions = useMemo<ValueHelpOption[]>(() => {
    const unique = Array.from(
      new Set(
        userResults.flatMap((r) => [
          r.userName,
          r.userId,
          r.collegeName,
          r.passed ? 'Passed' : 'Failed',
          formatScoreBand(r.percentage),
          formatTimeSpentBand(r.timeSpentSec),
          `${Math.round(r.percentage)}%`,
        ])
      )
    );

    return unique
      .filter(Boolean)
      .slice(0, 24)
      .map((item) => ({ value: item, label: item }));
  }, [userResults]);

  const collegeOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Colleges' },
    ...Array.from(new Set(userResults.map((r) => r.collegeName).filter(Boolean) as string[]))
      .sort()
      .map((college) => ({ value: college, label: college })),
  ];

  const testSearchOptions = useMemo<ValueHelpOption[]>(() => {
    const unique = Array.from(
      new Set(
        tests.flatMap((t) => [
          t.name,
          `${t.questions} questions`,
          `${t.duration} min`,
          t.totalAttempts > 0 ? 'with attempts' : 'without attempts',
          formatPassRateBand(t.passRate),
          formatDurationBand(t.duration),
        ])
      )
    );

    return unique
      .filter(Boolean)
      .slice(0, 24)
      .map((item) => ({ value: item, label: item }));
  }, [tests]);

  const statusOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Status' },
    { value: 'passed', label: 'Passed', keywords: ['success', 'qualified'] },
    { value: 'failed', label: 'Failed', keywords: ['not passed', 'unsuccessful'] },
  ];

  const scoreBandOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Score Bands' },
    { value: 'topper', label: 'Topper', keywords: ['85+', 'high score'] },
    { value: 'strong', label: 'Strong', keywords: ['70+', 'good score'] },
    { value: 'average', label: 'Average', keywords: ['50+', 'mid score'] },
    { value: 'at-risk', label: 'At Risk', keywords: ['below 50', 'needs attention'] },
  ];

  const timeBandOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Time Bands' },
    { value: 'quick', label: 'Quick Finishers', keywords: ['under 15 min'] },
    { value: 'balanced', label: 'Balanced Pace', keywords: ['15 to 45 min'] },
    { value: 'slow', label: 'Slow Finishers', keywords: ['over 45 min'] },
  ];

  const dateOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Submission Dates' },
    { value: 'today', label: 'Submitted Today' },
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
  ];

  const userSortOptions: ValueHelpOption[] = [
    { value: 'score-high', label: 'Highest Score' },
    { value: 'score-low', label: 'Lowest Score' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'date', label: 'Most Recent' },
    { value: 'time-fast', label: 'Fastest Completion' },
    { value: 'time-slow', label: 'Slowest Completion' },
  ];

  const attemptsOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Attempts' },
    { value: 'with-attempts', label: 'With Attempts' },
    { value: 'without-attempts', label: 'Without Attempts' },
  ];

  const passRateOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Pass Rates' },
    { value: 'excellent', label: 'Excellent Pass Rate', keywords: ['80% and above'] },
    { value: 'good', label: 'Good Pass Rate', keywords: ['60% to 79%'] },
    { value: 'watch', label: 'Needs Attention', keywords: ['40% to 59%'] },
    { value: 'poor', label: 'Low Pass Rate', keywords: ['below 40%'] },
  ];

  const durationOptions: ValueHelpOption[] = [
    { value: 'all', label: 'All Durations' },
    { value: 'short', label: 'Short Tests', keywords: ['30 min or less'] },
    { value: 'medium', label: 'Medium Tests', keywords: ['31 to 60 min'] },
    { value: 'long', label: 'Long Tests', keywords: ['over 60 min'] },
  ];

  const testSortOptions: ValueHelpOption[] = [
    { value: 'recent', label: 'Most Active' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'attempts', label: 'Most Attempts' },
    { value: 'avg-score', label: 'Best Average Score' },
    { value: 'pass-rate', label: 'Best Pass Rate' },
  ];

  const handleTestSelect = async (test: Test) => {
    setSelectedTest(test);
    await loadUserResults(test.id);
    setView('users');
  };

  const handleUserSelect = async (user: UserResult) => {
    setSelectedUser(user);
    await loadDetailedResult(user.id, selectedTest!.id);
    setView('details');
  };

  const resetUserFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setCollegeFilter('all');
    setSortBy('score-high');
    setMinPercent(0);
    setMaxPercent(100);
    setScoreBandFilter('all');
    setTimeSpentBand('all');
    setDateFilter('all');
    setMinScore(0);
    setMinTimeSpentMinutes(0);
    setMaxTimeSpentMinutes(0);
  };

  const resetTestFilters = () => {
    setTestSearch('');
    setTestAttemptsFilter('all');
    setTestPassRateBand('all');
    setTestDurationBand('all');
    setTestSortBy('recent');
  };

  const handleBackToTests = () => {
    setView('tests');
    setSelectedTest(null);
    setUserResults([]);
    resetUserFilters();
  };

  const exportToCSV = () => {
    if (!selectedTest || filteredResults.length === 0) return;

    const headers = ['Rank', 'Name', 'User ID', 'Score', 'Total Marks', 'Percentage', 'Status', 'Score Band', 'Time Spent', 'Submitted At'];
    const rows = filteredResults.map((r, idx) => [
      idx + 1,
      r.userName,
      r.userId,
      r.scoredMarks,
      r.totalMarks,
      r.percentage.toFixed(2) + '%',
      r.passed ? 'Passed' : 'Failed',
      formatScoreBand(r.percentage),
      formatTime(r.timeSpentSec),
      formatDate(r.submittedAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTest.name.replace(/\s+/g, '_')}_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAllToCSV = () => {
    if (!selectedTest || userResults.length === 0) return;

    const headers = ['Rank', 'Name', 'User ID', 'Score', 'Total Marks', 'Percentage', 'Status', 'Score Band', 'Time Spent', 'Submitted At'];
    const sorted = [...userResults].sort((a, b) => b.percentage - a.percentage);
    const rows = sorted.map((r, idx) => [
      idx + 1,
      r.userName,
      r.userId,
      r.scoredMarks,
      r.totalMarks,
      r.percentage.toFixed(2) + '%',
      r.passed ? 'Passed' : 'Failed',
      formatScoreBand(r.percentage),
      formatTime(r.timeSpentSec),
      formatDate(r.submittedAt),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTest.name.replace(/\s+/g, '_')}_ALL_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToUsers = () => {
    setView('users');
    setSelectedUser(null);
    setDetailedResult(null);
    setQuestions([]);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';

    try {
      let date: Date;
      if (dateStr.endsWith('Z')) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr + (dateStr.includes('T') ? 'Z' : 'T00:00:00Z'));
      }

      if (isNaN(date.getTime())) return dateStr;

      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  if (view === 'tests') {
    return (
      <div className="test-results-container">
        <div className="results-header">
          <div className="results-header-top">
            <div className="results-header-title-block">
              <h2>Test Results</h2>
              <p className="subtitle">Value-help search and searchable filters for test-level analytics</p>
            </div>
            <button className={`results-filter-toggle ${showTestFilters ? 'active' : ''}`} onClick={() => setShowTestFilters((prev) => !prev)}>
              <span className="results-filter-toggle-icon" aria-hidden="true">{showTestFilters ? '-' : '+'}</span>
              <span className="results-filter-toggle-label">{showTestFilters ? 'Hide Filters' : 'Show Filters'}</span>
              {activeTestFilterCount > 0 && <span className="results-filter-toggle-count">{activeTestFilterCount}</span>}
            </button>
          </div>
        </div>

        <div className="filters-header-row legacy-hidden">
          <button className={`results-filter-toggle ${showTestFilters ? 'active' : ''}`} onClick={() => setShowTestFilters((prev) => !prev)}>
            <span className="results-filter-toggle-icon" aria-hidden="true">{showTestFilters ? '−' : '+'}</span>
            <span className="results-filter-toggle-label">{showTestFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {activeTestFilterCount > 0 && <span className="results-filter-toggle-count">{activeTestFilterCount}</span>}
          </button>
        </div>

        {showTestFilters && <div className="filters-bar">
          <div className="filters-toolbar">
            <div className="search-stack">
              <ValueHelpField
                label="Search Tests"
                placeholder="Search by test name, duration, attempts, pass rate..."
                value={testSearch}
                options={testSearchOptions}
                onChange={setTestSearch}
                allowFreeText
              />
            </div>

            <div className="filter-group expanded">
              <ValueHelpField label="Attempts" placeholder="All Attempts" value={testAttemptsFilter} options={attemptsOptions} onChange={(value) => setTestAttemptsFilter(value as TestAttemptsFilter)} compact />
              <ValueHelpField label="Pass Rate Band" placeholder="All Pass Rates" value={testPassRateBand} options={passRateOptions} onChange={(value) => setTestPassRateBand(value as PassRateBand)} compact />
              <ValueHelpField label="Duration Band" placeholder="All Durations" value={testDurationBand} options={durationOptions} onChange={(value) => setTestDurationBand(value as DurationBand)} compact />
              <ValueHelpField label="Sort By" placeholder="Most Active" value={testSortBy} options={testSortOptions} onChange={(value) => setTestSortBy(value as 'recent' | 'name' | 'attempts' | 'avg-score' | 'pass-rate')} compact />
            </div>
          </div>

          <div className="filter-summary-row">
            <span className="results-count">{filteredTests.length} of {tests.length} tests shown</span>
            <span className="active-filter-count">{activeTestFilterCount} active filters</span>
            <button className="reset-range-btn" onClick={resetTestFilters}>Reset Filters</button>
          </div>
        </div>}

        <div className="tests-grid">
          {filteredTests.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No test results match the current value-help selection</p>
            </div>
          )}

          {filteredTests.map((test) => (
            <div key={test.id} className="test-card" onClick={() => handleTestSelect(test)}>
              <div className="test-card-header">
                <h3>{test.name}</h3>
                <span className="test-badge">{test.totalAttempts} attempts</span>
              </div>

              <div className="test-stats">
                <div className="stat-item">
                  <span className="stat-label">Questions</span>
                  <span className="stat-value">{test.questions}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Duration</span>
                  <span className="stat-value">{test.duration}m</span>
                </div>
              </div>

              <div className="test-metrics">
                <div className="metric">
                  <span className="metric-label">Average Score</span>
                  <span className="metric-value">{test.avgScore.toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Pass Rate</span>
                  <span className="metric-value success">{test.passRate.toFixed(1)}%</span>
                </div>
              </div>

              <div className="tag-row">
                <span className="data-tag">{formatDurationBand(test.duration)}</span>
                <span className="data-tag">{formatPassRateBand(test.passRate)}</span>
                <span className="data-tag">{test.totalAttempts > 0 ? 'live data' : 'no attempts'}</span>
              </div>

              <div className="test-card-footer">
                <span className="view-link">View Results →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'users') {
    return (
      <div className="test-results-container">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToTests}>
            ← Back to Tests
          </button>
          <div>
            <h2>{selectedTest?.name}</h2>
            <p className="subtitle">{filteredResults.length} of {userResults.length} student attempts shown</p>
            <button className={`results-filter-toggle results-filter-toggle-inline ${showUserFilters ? 'active' : ''}`} onClick={() => setShowUserFilters((prev) => !prev)}>
              <span className="results-filter-toggle-icon" aria-hidden="true">{showUserFilters ? '-' : '+'}</span>
              <span className="results-filter-toggle-label">{showUserFilters ? 'Hide Filters' : 'Show Filters'}</span>
              {activeUserFilterCount > 0 && <span className="results-filter-toggle-count">{activeUserFilterCount}</span>}
            </button>
          </div>
        </div>

        <div className="filters-header-row">
          <button className={`results-filter-toggle ${showUserFilters ? 'active' : ''}`} onClick={() => setShowUserFilters((prev) => !prev)}>
            <span className="results-filter-toggle-icon" aria-hidden="true">{showUserFilters ? '−' : '+'}</span>
            <span className="results-filter-toggle-label">{showUserFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {activeUserFilterCount > 0 && <span className="results-filter-toggle-count">{activeUserFilterCount}</span>}
          </button>
        </div>

        {showUserFilters && <div className="filters-bar">
          <div className="filters-toolbar">
            <div className="search-stack">
              <ValueHelpField
                label="Search Results"
                placeholder="Search by user, status, score band, percentage, date..."
                value={searchQuery}
                options={userSearchOptions}
                onChange={setSearchQuery}
                allowFreeText
              />
            </div>

            <div className="filter-group expanded">
              <ValueHelpField label="Status" placeholder="All Status" value={filterStatus} options={statusOptions} onChange={(value) => setFilterStatus(value as 'all' | 'passed' | 'failed')} compact />
              <ValueHelpField label="College" placeholder="All Colleges" value={collegeFilter} options={collegeOptions} onChange={setCollegeFilter} compact />
              <ValueHelpField label="Score Band" placeholder="All Score Bands" value={scoreBandFilter} options={scoreBandOptions} onChange={(value) => setScoreBandFilter(value as ScoreBand)} compact />
              <ValueHelpField label="Time Band" placeholder="All Time Bands" value={timeSpentBand} options={timeBandOptions} onChange={(value) => setTimeSpentBand(value as TimeSpentBand)} compact />
              <ValueHelpField label="Submission Date" placeholder="All Submission Dates" value={dateFilter} options={dateOptions} onChange={(value) => setDateFilter(value as DateFilter)} compact />
              <ValueHelpField label="Sort By" placeholder="Highest Score" value={sortBy} options={userSortOptions} onChange={(value) => setSortBy(value as UserSort)} compact />
            </div>

            <div className="export-group">
              <button className="export-btn" onClick={exportToCSV} disabled={filteredResults.length === 0}>
                ⬇ Export Filtered ({filteredResults.length})
              </button>
              <button className="export-btn export-btn-all" onClick={exportAllToCSV} disabled={userResults.length === 0}>
                ⬇ Export All ({userResults.length})
              </button>
            </div>
          </div>

          <div className="advanced-filters-grid">
            <div className="filter-card">
              <span className="filter-card-title">Percentage Range</span>
              <div className="percent-filter-row">
                <div className="percent-inputs">
                  <div className="percent-input-group">
                    <label>Min %</label>
                    <input type="number" min={0} max={maxPercent} value={minPercent} onChange={(e) => setMinPercent(Math.max(0, Math.min(Number(e.target.value), maxPercent)))} />
                  </div>
                  <div className="percent-range-track">
                    <div className="percent-range-fill" style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }} />
                    <input type="range" min={0} max={100} value={minPercent} onChange={(e) => setMinPercent(Math.min(Number(e.target.value), maxPercent - 1))} className="range-thumb range-thumb-left" />
                    <input type="range" min={0} max={100} value={maxPercent} onChange={(e) => setMaxPercent(Math.max(Number(e.target.value), minPercent + 1))} className="range-thumb range-thumb-right" />
                  </div>
                  <div className="percent-input-group">
                    <label>Max %</label>
                    <input type="number" min={minPercent} max={100} value={maxPercent} onChange={(e) => setMaxPercent(Math.min(100, Math.max(Number(e.target.value), minPercent)))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-card compact">
              <span className="filter-card-title">Minimum Marks</span>
              <input className="filter-input" type="number" min={0} value={minScore} onChange={(e) => setMinScore(Math.max(0, Number(e.target.value)))} placeholder="Minimum marks scored" />
            </div>

            <div className="filter-card compact">
              <span className="filter-card-title">Min Time Spent</span>
              <input className="filter-input" type="number" min={0} value={minTimeSpentMinutes} onChange={(e) => setMinTimeSpentMinutes(Math.max(0, Number(e.target.value)))} placeholder="Minutes" />
            </div>

            <div className="filter-card compact">
              <span className="filter-card-title">Max Time Spent</span>
              <input className="filter-input" type="number" min={0} value={maxTimeSpentMinutes} onChange={(e) => setMaxTimeSpentMinutes(Math.max(0, Number(e.target.value)))} placeholder="Minutes" />
            </div>
          </div>

          <div className="filter-summary-row">
            <span className="results-count">{filteredResults.length} of {userResults.length} results shown</span>
            <span className="active-filter-count">{activeUserFilterCount} active filters</span>
            <button className="reset-range-btn" onClick={resetUserFilters}>Reset Filters</button>
          </div>
        </div>}

        <div className="users-list">
          {filteredResults.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>No results found for the current value-help selection</p>
            </div>
          )}

          {filteredResults.map((user) => (
            <div key={user.id} className="user-result-card" onClick={() => handleUserSelect(user)}>
              <div className="user-info">
                <div className="user-avatar">{user.userName.charAt(0).toUpperCase()}</div>
                <div className="user-details">
                  <h4>{user.userName}</h4>
                  <span className="user-id">{user.userId}</span>
                  {user.collegeName && <span className="user-id">{user.collegeName}</span>}
                  <div className="tag-row small">
                    <span className="data-tag">{formatScoreBand(user.percentage)}</span>
                    <span className="data-tag">{formatTimeSpentBand(user.timeSpentSec)}</span>
                  </div>
                </div>
              </div>

              <div className="user-score">
                <div className={`score-badge ${user.passed ? 'passed' : 'failed'}`}>{user.percentage.toFixed(1)}%</div>
                <span className="score-marks">{user.scoredMarks} / {user.totalMarks}</span>
              </div>

              <div className="user-status">
                <span className={`status-badge ${user.passed ? 'passed' : 'failed'}`}>{user.passed ? '✓ Passed' : '✗ Failed'}</span>
              </div>

              <div className="user-meta">
                <span className="meta-item">⏱ {formatTime(user.timeSpentSec)}</span>
                <span className="meta-item">📅 {formatDate(user.submittedAt)}</span>
              </div>

              <div className="view-details">View Details →</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'details' && detailedResult) {
    return (
      <div className="test-results-container">
        <div className="results-header">
          <button className="back-btn" onClick={handleBackToUsers}>
            ← Back to Results
          </button>
          <div>
            <h2>{detailedResult.userName}</h2>
            <p className="subtitle">{detailedResult.examName}</p>
          </div>
        </div>

        <div className="detailed-summary">
          <div className="summary-card main-score">
            <div className={`score-circle ${detailedResult.passed ? 'passed' : 'failed'}`}>
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={detailedResult.passed ? '#2e7d32' : '#d32f2f'} strokeWidth="8" strokeDasharray={`${(detailedResult.percentage * 2.827).toFixed(2)} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div className="score-text">
                <span className="percentage">{detailedResult.percentage.toFixed(1)}%</span>
                <span className={`status ${detailedResult.passed ? 'passed' : 'failed'}`}>{detailedResult.passed ? 'Passed' : 'Failed'}</span>
              </div>
            </div>
          </div>

          <div className="summary-stats">
            <div className="stat-box">
              <span className="stat-label">Score</span>
              <span className="stat-value">{detailedResult.scoredMarks} / {detailedResult.totalMarks}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Time Spent</span>
              <span className="stat-value">{formatTime(detailedResult.timeSpentSec)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Submitted (IST)</span>
              <span className="stat-value">{formatDate(detailedResult.submittedAt)}</span>
            </div>
          </div>
        </div>

        <div className="section-performance">
          <h3>Section-wise Performance</h3>
          <div className="sections-list">
            {Object.entries(detailedResult.sectionWise || {}).map(([section, data]) => {
              const sectionPercentage = data.total ? ((data.scored / data.total) * 100).toFixed(1) : '0.0';
              return (
                <div key={section} className="section-card">
                  <div className="section-header">
                    <h4>{section}</h4>
                    <span className="section-score">{data.scored} / {data.total}</span>
                  </div>
                  <div className="section-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${sectionPercentage}%` }} />
                    </div>
                    <span className="section-percentage">{sectionPercentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="question-breakdown">
          <h3>Question-by-Question Analysis</h3>
          <div className="questions-list">
            {detailedResult.questionReview.map((review, idx) => {
              const question = questions.find((q) => q.id === review.questionId);
              return (
                <div key={review.questionId} className={`question-card ${review.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <span className="question-number">Q{idx + 1}</span>
                    <span className="question-section">{review.section}</span>
                    <span className={`question-status ${review.isCorrect ? 'correct' : 'incorrect'}`}>{review.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                    <span className="question-marks">{review.marks} marks</span>
                  </div>

                  <p className="question-text">{question?.question || 'Question'}</p>

                  <div className="question-answers">
                    <div className="answer-row">
                      <span className="answer-label">Student's Answer:</span>
                      <span className="answer-value">{Array.isArray(review.userAnswer) ? review.userAnswer.join(', ') : review.userAnswer || 'Not answered'}</span>
                    </div>

                    {!review.isCorrect && (
                      <div className="answer-row">
                        <span className="answer-label">Correct Answer:</span>
                        <span className="answer-value correct">{Array.isArray(review.correctAnswer) ? review.correctAnswer.join(', ') : review.correctAnswer ?? 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TestResults;
