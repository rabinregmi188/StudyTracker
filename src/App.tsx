import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Subject = {
  id: string;
  name: string;
  color: string;
  weeklyTarget: number;
};

type Session = {
  id: string;
  subjectId: string;
  date: string;
  duration: number;
  focus: number;
  memo: string;
};

type TrackerState = {
  weeklyGoal: number;
  subjects: Subject[];
  sessions: Session[];
};

const STORAGE_KEY = "studytracker.v1";
const subjectPalette = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6"];

const defaultSubjects: Subject[] = [
  { id: "algorithms", name: "Algorithms", color: "#2563eb", weeklyTarget: 6 },
  { id: "web-dev", name: "Web Dev", color: "#10b981", weeklyTarget: 5 },
  { id: "system-design", name: "System Design", color: "#f97316", weeklyTarget: 4 },
  { id: "databases", name: "Databases", color: "#8b5cf6", weeklyTarget: 3 },
];

const defaultState: TrackerState = {
  weeklyGoal: 15,
  subjects: defaultSubjects,
  sessions: [],
};

function App() {
  const [tracker, setTracker] = useState<TrackerState>(() => loadTracker());
  const [subjectId, setSubjectId] = useState(() => loadTracker().subjects[0]?.id ?? "");
  const [date, setDate] = useState(() => todayIso());
  const [duration, setDuration] = useState("90");
  const [focus, setFocus] = useState("4");
  const [memo, setMemo] = useState("");
  const [goalInput, setGoalInput] = useState(() => String(loadTracker().weeklyGoal));
  const [subjectName, setSubjectName] = useState("");
  const [saveMessage, setSaveMessage] = useState("Data is stored locally in your browser.");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracker));
  }, [tracker]);

  useEffect(() => {
    if (!tracker.subjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(tracker.subjects[0]?.id ?? "");
    }
  }, [subjectId, tracker.subjects]);

  const sortedSessions = useMemo(
    () =>
      [...tracker.sessions].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
      ),
    [tracker.sessions]
  );

  const recentSessions = sortedSessions.slice(0, 8);
  const weeklySessions = sortedSessions.filter((session) => isWithinLastDays(session.date, 7));
  const monthlySessions = sortedSessions.filter((session) => isWithinLastDays(session.date, 30));

  const totalWeekHours = hoursFromSessions(weeklySessions);
  const totalMonthHours = hoursFromSessions(monthlySessions);
  const streakDays = calculateStreak(sortedSessions);
  const weeklyProgress = Math.min(100, (totalWeekHours / Math.max(tracker.weeklyGoal, 1)) * 100);
  const averageFocus = weeklySessions.length
    ? weeklySessions.reduce((sum, session) => sum + session.focus, 0) / weeklySessions.length
    : 0;

  const weeklyBars = getLastSevenDays().map((day) => ({
    label: formatDayLabel(day),
    hours: hoursFromSessions(weeklySessions.filter((session) => session.date === day)),
  }));

  const maxWeeklyBar = Math.max(...weeklyBars.map((bar) => bar.hours), 1);
  const heatmapDays = getLastThirtyDays().map((day) => ({
    date: day,
    hours: hoursFromSessions(monthlySessions.filter((session) => session.date === day)),
  }));
  const maxHeat = Math.max(...heatmapDays.map((item) => item.hours), 1);

  const subjectRows = tracker.subjects.map((subject, index) => {
    const weeklyHours = hoursFromSessions(
      weeklySessions.filter((session) => session.subjectId === subject.id)
    );
    const monthlyHours = hoursFromSessions(
      monthlySessions.filter((session) => session.subjectId === subject.id)
    );
    const progress = Math.min(100, (weeklyHours / Math.max(subject.weeklyTarget, 1)) * 100);

    return {
      ...subject,
      weeklyHours,
      monthlyHours,
      progress,
      color: subject.color || subjectPalette[index % subjectPalette.length],
    };
  });

  const topSubject = [...subjectRows].sort((a, b) => b.weeklyHours - a.weeklyHours)[0];

  function handleAddSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId) return;

    const session: Session = {
      id: crypto.randomUUID(),
      subjectId,
      date,
      duration: Number(duration),
      focus: Number(focus),
      memo: memo.trim(),
    };

    setTracker((current) => ({
      ...current,
      sessions: [session, ...current.sessions],
    }));
    setMemo("");
    setDuration("90");
    setFocus("4");
    setDate(todayIso());
    setSaveMessage("Study session saved.");
  }

  function handleSaveGoal() {
    const nextGoal = Number(goalInput);
    if (!nextGoal) return;
    setTracker((current) => ({ ...current, weeklyGoal: nextGoal }));
    setSaveMessage("Weekly study goal updated.");
  }

  function handleAddSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = subjectName.trim();
    if (!trimmed) return;

    const existing = tracker.subjects.find(
      (subject) => subject.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setSubjectId(existing.id);
      setSubjectName("");
      setSaveMessage("Subject already exists, switched to it.");
      return;
    }

    const nextSubject: Subject = {
      id: slugify(trimmed),
      name: trimmed,
      color: subjectPalette[tracker.subjects.length % subjectPalette.length],
      weeklyTarget: 3,
    };

    setTracker((current) => ({
      ...current,
      subjects: [...current.subjects, nextSubject],
    }));
    setSubjectId(nextSubject.id);
    setSubjectName("");
    setSaveMessage("New subject added.");
  }

  function handleSubjectTargetChange(subjectIdToUpdate: string, weeklyTarget: number) {
    setTracker((current) => ({
      ...current,
      subjects: current.subjects.map((subject) =>
        subject.id === subjectIdToUpdate ? { ...subject, weeklyTarget } : subject
      ),
    }));
  }

  function handleLoadDemo() {
    const demo = buildDemoState();
    setTracker(demo);
    setSubjectId(demo.subjects[0].id);
    setGoalInput(String(demo.weeklyGoal));
    setDate(todayIso());
    setMemo("");
    setDuration("75");
    setFocus("4");
    setSaveMessage("Demo study data loaded.");
  }

  function handleReset() {
    setTracker(defaultState);
    setGoalInput(String(defaultState.weeklyGoal));
    setSubjectId(defaultState.subjects[0].id);
    setDate(todayIso());
    setMemo("");
    setDuration("90");
    setFocus("4");
    setSubjectName("");
    setSaveMessage("Tracker reset.");
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(tracker, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "studytracker-export.json";
    link.click();
  }

  return (
    <div className="tracker-app">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Study analytics dashboard</p>
          <h1>StudyTracker</h1>
          <p className="hero-text">
            Log study sessions, track weekly goals, monitor streaks, and visualize subject progress
            with a dashboard designed to feel like a real productivity product.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={handleLoadDemo}>
              Load Demo Data
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              Export JSON
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>
              Reset Tracker
            </button>
          </div>
        </div>

        <div className="hero-side">
          <article className="hero-stat">
            <span>This week</span>
            <strong>{formatHours(totalWeekHours)}</strong>
            <small>{Math.round(weeklyProgress)}% of weekly goal</small>
          </article>
          <article className="hero-stat accent">
            <span>Current streak</span>
            <strong>{streakDays} days</strong>
            <small>{topSubject ? `${topSubject.name} leads this week` : "Start with your first session"}</small>
          </article>
          <article className="hero-stat">
            <span>Average focus</span>
            <strong>{averageFocus ? averageFocus.toFixed(1) : "0.0"} / 5</strong>
            <small>{weeklySessions.length} study blocks logged</small>
          </article>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="left-column">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Quick logging</p>
                <h2>Add a study session</h2>
              </div>
              <span className="panel-note">{saveMessage}</span>
            </div>

            <form className="session-form" onSubmit={handleAddSession}>
              <label>
                <span>Subject</span>
                <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                  {tracker.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Date</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <label>
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </label>
              <label>
                <span>Focus score</span>
                <select value={focus} onChange={(event) => setFocus(event.target.value)}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <option key={score} value={score}>
                      {score} / 5
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>Notes</span>
                <textarea
                  rows={4}
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="What did you work on today?"
                />
              </label>
              <button type="submit" className="btn btn-primary wide-button">
                Save session
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Goals and subjects</p>
                <h2>Plan your week</h2>
              </div>
            </div>

            <div className="goal-row">
              <label>
                <span>Weekly study goal (hours)</span>
                <input
                  type="number"
                  min="1"
                  value={goalInput}
                  onChange={(event) => setGoalInput(event.target.value)}
                />
              </label>
              <button className="btn btn-secondary" onClick={handleSaveGoal}>
                Save goal
              </button>
            </div>

            <form className="subject-form" onSubmit={handleAddSubject}>
              <label>
                <span>Add subject</span>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder="Machine Learning"
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Add
              </button>
            </form>

            <div className="subject-stack">
              {subjectRows.map((subject) => (
                <article className="subject-card" key={subject.id}>
                  <div className="subject-header">
                    <div className="subject-title">
                      <span className="subject-dot" style={{ backgroundColor: subject.color }} />
                      <strong>{subject.name}</strong>
                    </div>
                    <span>{formatHours(subject.weeklyHours)} this week</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(subject.progress, 4)}%`,
                        background: `linear-gradient(90deg, ${subject.color}, ${subject.color}aa)`,
                      }}
                    />
                  </div>
                  <div className="subject-meta">
                    <span>{formatHours(subject.monthlyHours)} this month</span>
                    <label>
                      <span>Weekly target</span>
                      <input
                        type="number"
                        min="1"
                        value={subject.weeklyTarget}
                        onChange={(event) =>
                          handleSubjectTargetChange(subject.id, Number(event.target.value) || 1)
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="right-column">
          <section className="stats-grid">
            <article className="summary-card">
              <span>Monthly total</span>
              <strong>{formatHours(totalMonthHours)}</strong>
            </article>
            <article className="summary-card">
              <span>Weekly goal</span>
              <strong>{tracker.weeklyGoal} hrs</strong>
            </article>
            <article className="summary-card">
              <span>Total sessions</span>
              <strong>{tracker.sessions.length}</strong>
            </article>
            <article className="summary-card">
              <span>Subjects tracked</span>
              <strong>{tracker.subjects.length}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Weekly trend</p>
                <h2>Last 7 days</h2>
              </div>
            </div>

            <div className="bar-chart">
              {weeklyBars.map((bar) => (
                <div className="bar-column" key={bar.label}>
                  <span className="bar-value">{bar.hours ? formatHours(bar.hours) : "0h"}</span>
                  <div className="bar-track tall">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max((bar.hours / maxWeeklyBar) * 100, bar.hours ? 10 : 0)}%` }}
                    />
                  </div>
                  <span className="bar-label">{bar.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Consistency</p>
                <h2>Study heatmap</h2>
              </div>
            </div>

            <div className="heatmap-grid">
              {heatmapDays.map((day) => (
                <div className="heatmap-cell-wrap" key={day.date}>
                  <div
                    className="heatmap-cell"
                    title={`${day.date}: ${formatHours(day.hours)}`}
                    style={{
                      backgroundColor:
                        day.hours === 0
                          ? "rgba(148, 163, 184, 0.12)"
                          : `rgba(37, 99, 235, ${0.22 + (day.hours / maxHeat) * 0.78})`,
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">Recent sessions</p>
                <h2>Latest activity</h2>
              </div>
            </div>

            <div className="session-table">
              {recentSessions.length ? (
                recentSessions.map((session) => {
                  const subject = tracker.subjects.find((item) => item.id === session.subjectId);
                  return (
                    <article className="session-row" key={session.id}>
                      <div>
                        <strong>{subject?.name ?? "Unknown subject"}</strong>
                        <p>{session.memo || "Focused study block logged."}</p>
                      </div>
                      <div className="session-side">
                        <span>{formatHours(session.duration / 60)}</span>
                        <small>
                          {session.date} • focus {session.focus}/5
                        </small>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="empty-state">
                  No sessions yet. Load demo data or log your first study block to populate the
                  dashboard.
                </p>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function loadTracker(): TrackerState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    const parsed = JSON.parse(raw) as Partial<TrackerState>;
    return {
      weeklyGoal: parsed.weeklyGoal ?? defaultState.weeklyGoal,
      subjects: parsed.subjects?.length ? parsed.subjects : defaultState.subjects,
      sessions: parsed.sessions ?? [],
    };
  } catch {
    return defaultState;
  }
}

function buildDemoState(): TrackerState {
  const today = new Date();
  const demoSessions: Session[] = [
    { id: crypto.randomUUID(), subjectId: "algorithms", date: offsetDate(today, -6), duration: 120, focus: 4, memo: "Dynamic programming and graph review." },
    { id: crypto.randomUUID(), subjectId: "web-dev", date: offsetDate(today, -5), duration: 90, focus: 5, memo: "Built dashboard components and refined responsive layout." },
    { id: crypto.randomUUID(), subjectId: "system-design", date: offsetDate(today, -4), duration: 75, focus: 4, memo: "Read about queues, caching, and load balancing tradeoffs." },
    { id: crypto.randomUUID(), subjectId: "algorithms", date: offsetDate(today, -3), duration: 105, focus: 4, memo: "Solved interval and binary search problems." },
    { id: crypto.randomUUID(), subjectId: "databases", date: offsetDate(today, -2), duration: 80, focus: 3, memo: "Reviewed normalization, indexing, and query plans." },
    { id: crypto.randomUUID(), subjectId: "web-dev", date: offsetDate(today, -1), duration: 110, focus: 5, memo: "Connected UI state and polished analytics interactions." },
    { id: crypto.randomUUID(), subjectId: "web-dev", date: offsetDate(today, 0), duration: 95, focus: 4, memo: "Worked on deployment flow and product polish." },
  ];

  return {
    weeklyGoal: 16,
    subjects: defaultSubjects,
    sessions: demoSessions,
  };
}

function hoursFromSessions(sessions: Session[]): number {
  return Number(
    sessions.reduce((total, session) => total + session.duration, 0).toFixed(0)
  ) / 60;
}

function isWithinLastDays(date: string, days: number): boolean {
  const current = new Date();
  const target = new Date(date);
  const diff = current.getTime() - target.getTime();
  return diff >= 0 && diff <= (days - 1) * 24 * 60 * 60 * 1000;
}

function getLastSevenDays(): string[] {
  return Array.from({ length: 7 }, (_, index) => offsetDate(new Date(), index - 6));
}

function getLastThirtyDays(): string[] {
  return Array.from({ length: 30 }, (_, index) => offsetDate(new Date(), index - 29));
}

function offsetDate(base: Date, offset: number): string {
  const next = new Date(base);
  next.setDate(base.getDate() + offset);
  return next.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function calculateStreak(sessions: Session[]): number {
  const uniqueDates = [...new Set(sessions.map((session) => session.date))].sort().reverse();
  if (!uniqueDates.length) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const latest = new Date(uniqueDates[0]);
  latest.setHours(0, 0, 0, 0);
  if (latest.getTime() < cursor.getTime()) {
    cursor = latest;
  }

  for (const date of uniqueDates) {
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    if (check.getTime() === cursor.getTime()) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (check.getTime() < cursor.getTime()) {
      break;
    }
  }

  return streak;
}

function formatHours(value: number): string {
  return `${value.toFixed(value >= 10 ? 0 : 1)}h`;
}

function formatDayLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { weekday: "short" });
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

export default App;
