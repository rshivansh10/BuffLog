import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { fetchMe, fetchWorkouts, login, register, saveWorkout, updateProfile } from "./lib/api";
import chickenSquat from "./assets/chicken-squat.svg";

const TOKEN_KEY = "fitness_token_v1";

const pageAnimation = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -22 },
  transition: { duration: 0.35, ease: "easeOut" },
};

const createLogEntry = () => ({
  category: "push",
  exerciseName: "",
  sets: "3",
  reps: "",
  weightKg: "",
  timeMinutes: "",
  distanceKm: "",
  caloriesBurned: "",
});

function suggestSixDayPlan(profile) {
  const fat = Number(profile?.fatPercentage || 0);
  const muscle = Number(profile?.muscleWeightKg || 0);

  if (fat >= 27) {
    return [
      { day: "Day 1", focus: "Upper Push", exercises: ["Bench Press", "Overhead Press", "Dips"] },
      {
        day: "Day 2",
        focus: "Lower + Cardio",
        exercises: ["Squat", "Romanian Deadlift", "20 min Incline Walk"],
      },
      { day: "Day 3", focus: "Upper Pull", exercises: ["Barbell Row", "Lat Pulldown", "Face Pull"] },
      { day: "Day 4", focus: "Conditioning", exercises: ["Bike Intervals", "Core Circuit"] },
      {
        day: "Day 5",
        focus: "Leg Hypertrophy",
        exercises: ["Leg Press", "Walking Lunge", "Hamstring Curl"],
      },
      {
        day: "Day 6",
        focus: "Upper Hypertrophy",
        exercises: ["Incline DB Press", "Cable Row", "Lateral Raise"],
      },
    ];
  }

  if (muscle < 30) {
    return [
      { day: "Day 1", focus: "Full Body A", exercises: ["Squat", "Bench Press", "Row"] },
      { day: "Day 2", focus: "Cardio + Core", exercises: ["Jog", "Plank", "Hanging Knee Raise"] },
      { day: "Day 3", focus: "Full Body B", exercises: ["Deadlift", "Overhead Press", "Pulldown"] },
      { day: "Day 4", focus: "Mobility + Cardio", exercises: ["Cycle", "Hip Mobility", "Abs"] },
      { day: "Day 5", focus: "Full Body C", exercises: ["Leg Press", "Incline Press", "Seated Row"] },
      { day: "Day 6", focus: "Arms + Conditioning", exercises: ["Curls", "Pushdowns", "Rower"] },
    ];
  }

  return [
    {
      day: "Day 1",
      focus: "Push Heavy",
      exercises: ["Bench Press", "Overhead Press", "Triceps Pushdown"],
    },
    { day: "Day 2", focus: "Pull Heavy", exercises: ["Deadlift", "Row", "Pull-Ups"] },
    { day: "Day 3", focus: "Legs Heavy", exercises: ["Back Squat", "RDL", "Calf Raise"] },
    {
      day: "Day 4",
      focus: "Push Volume",
      exercises: ["Incline DB Press", "Machine Press", "Lateral Raise"],
    },
    { day: "Day 5", focus: "Pull Volume", exercises: ["Pulldown", "Seated Row", "Rear Delt Fly"] },
    {
      day: "Day 6",
      focus: "Leg Volume + Cardio",
      exercises: ["Leg Press", "Lunge", "15 min Finisher"],
    },
  ];
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const loadingUser = Boolean(token) && !user;

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    fetchMe(token)
      .then((res) => {
        if (!mounted) return;
        setUser(res.user);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setToken("");
        localStorage.removeItem(TOKEN_KEY);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleAuthSuccess = (payload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem(TOKEN_KEY, payload.token);
    navigate(payload.user.profileCompleted ? "/tracker" : "/onboarding");
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    navigate("/");
  };

  return (
    <div className="app">
      <header className="topbar">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          className="brand brand-link"
          onClick={() => navigate("/")}
        >
          <p>BulkLog</p>
          <span>Track Strength. Track Cardio. Build Better.</span>
        </motion.button>
        <div className="userbox">
          {user ? <span>{user.name}</span> : null}
          {user ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={logout}
            >
              Logout
            </motion.button>
          ) : null}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <Page>
                <LandingAuth
                  onAuthSuccess={handleAuthSuccess}
                  isLoggedIn={Boolean(user)}
                  goTracker={() => navigate("/tracker")}
                />
              </Page>
            }
          />
          <Route
            path="/onboarding"
            element={
              <Page>
                {loadingUser ? (
                  <section className="canvas">Loading account...</section>
                ) : !user ? (
                  <Navigate to="/" replace />
                ) : user.profileCompleted ? (
                  <Navigate to="/tracker" replace />
                ) : (
                  <Onboarding
                    token={token}
                    onComplete={(nextUser) => {
                      setUser(nextUser);
                      navigate("/tracker");
                    }}
                  />
                )}
              </Page>
            }
          />
          <Route
            path="/tracker"
            element={
              <Page>
                <Tracker token={token} user={user} loadingUser={loadingUser} />
              </Page>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

function Page({ children }) {
  const MotionMain = motion.main;
  return (
    <MotionMain {...pageAnimation} className="page">
      {children}
    </MotionMain>
  );
}

function LandingAuth({ onAuthSuccess, isLoggedIn, goTracker }) {
  const [heroAvatar, setHeroAvatar] = useState("/chicken-avatar.png");
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const requestFn = mode === "register" ? register : login;
      const payload =
        mode === "register"
          ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
          : { email: form.email.trim(), password: form.password };
      const result = await requestFn(payload);
      onAuthSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="canvas">
      <section className="hero hero-grid">
        <div>
          <h1>BulkLog for serious lifters and clean tracking.</h1>
          <p>
            BulkLog stores your account, strength sets, reps, weights, and cardio metrics in one
            full-stack system. Keep your progress structured and measurable.
          </p>
          <div className="hero-points">
            <p>1. Account-secured workout data in SQL.</p>
            <p>2. Strength logging at set level.</p>
            <p>3. Cardio logging with time, km, and calories.</p>
            <p>4. First-login profile setup and six-day plan suggestion.</p>
          </div>
        </div>
        <div className="avatar-wrap">
          <img
            src={heroAvatar}
            alt="Chicken doing weighted squats"
            onError={() => setHeroAvatar(chickenSquat)}
          />
        </div>
      </section>

      <section className="split">
        <motion.article
          className="outline-card"
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <h2>Get Started or Login</h2>
          {isLoggedIn ? (
            <div className="form">
              <p>You are signed in.</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={goTracker}
              >
                Go to Tracker
              </motion.button>
            </div>
          ) : (
            <>
              <div className="toggle-row">
                <button
                  type="button"
                  className={mode === "register" ? "active-pill" : ""}
                  onClick={() => setMode("register")}
                >
                  Get Started
                </button>
                <button
                  type="button"
                  className={mode === "login" ? "active-pill" : ""}
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
              </div>
              <form className="form" onSubmit={submit}>
                {mode === "register" ? (
                  <label>
                    Name
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </label>
                ) : null}
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </label>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : mode === "register"
                      ? "Create Account"
                      : "Login"}
                </motion.button>
                {error ? <p className="error">{error}</p> : null}
              </form>
            </>
          )}
        </motion.article>

        <motion.article
          className="outline-card"
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <h2>How BulkLog works</h2>
          <p>
            Register once, complete your profile on first login, then track training sessions.
            Every save writes directly to your SQL-backed account history.
          </p>
        </motion.article>
      </section>
    </section>
  );
}

function Onboarding({ token, onComplete }) {
  const [form, setForm] = useState({
    bodyWeightKg: "",
    heightCm: "",
    muscleWeightKg: "",
    fatPercentage: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await updateProfile(token, {
        bodyWeightKg: Number(form.bodyWeightKg),
        heightCm: Number(form.heightCm),
        muscleWeightKg: Number(form.muscleWeightKg),
        fatPercentage: Number(form.fatPercentage),
      });
      onComplete(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="canvas narrow">
      <motion.article
        className="outline-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2>First Login Profile Setup</h2>
        <p>Enter your current body stats to unlock your initial six-day split suggestion.</p>
        <form className="form" onSubmit={submit}>
          <label>
            Body Weight (kg)
            <input
              type="number"
              step="0.1"
              value={form.bodyWeightKg}
              onChange={(e) => setForm((prev) => ({ ...prev, bodyWeightKg: e.target.value }))}
              required
            />
          </label>
          <label>
            Height (cm)
            <input
              type="number"
              step="0.1"
              value={form.heightCm}
              onChange={(e) => setForm((prev) => ({ ...prev, heightCm: e.target.value }))}
              required
            />
          </label>
          <label>
            Muscle Weight (kg)
            <input
              type="number"
              step="0.1"
              value={form.muscleWeightKg}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, muscleWeightKg: e.target.value }))
              }
              required
            />
          </label>
          <label>
            Fat Percentage (%)
            <input
              type="number"
              step="0.1"
              value={form.fatPercentage}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fatPercentage: e.target.value }))
              }
              required
            />
          </label>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save and Continue"}
          </motion.button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </motion.article>
    </section>
  );
}

function Tracker({ token, user, loadingUser }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState([createLogEntry()]);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const sixDayPlan = useMemo(() => suggestSixDayPlan(user), [user]);

  useEffect(() => {
    if (!token) return;
    fetchWorkouts(token)
      .then((res) => setHistory(res.workouts))
      .catch(() => setHistory([]));
  }, [token]);

  if (loadingUser) return <section className="canvas">Loading account...</section>;
  if (!user) return <Navigate to="/" replace />;
  if (!user.profileCompleted) return <Navigate to="/onboarding" replace />;

  const updateEntryField = (index, field, value) => {
    setEntries((prev) =>
      prev.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const submitWorkout = async (event) => {
    event.preventDefault();
    setStatus("");
    setSaving(true);

    const strength = entries
      .filter((entry) => entry.category !== "cardio" && entry.exerciseName.trim())
      .map((entry) => {
        const setsCount = Math.max(1, Number(entry.sets || 1));
        return {
          exerciseName: `${entry.category.toUpperCase()} - ${entry.exerciseName.trim()}`,
          sets: Array.from({ length: setsCount }, () => ({
            reps: Number(entry.reps || 0),
            weightKg: Number(entry.weightKg || 0),
          })),
        };
      });

    const cardio = entries
      .filter((entry) => entry.category === "cardio" && entry.exerciseName.trim())
      .map((entry) => ({
        activityName: entry.exerciseName.trim(),
        timeMinutes: Number(entry.timeMinutes || 0),
        distanceKm: Number(entry.distanceKm || 0),
        caloriesBurned: Number(entry.caloriesBurned || 0),
      }));

    if (!strength.length && !cardio.length) {
      setStatus("Add at least one exercise entry before saving.");
      setSaving(false);
      return;
    }

    try {
      await saveWorkout(token, { workoutDate: date, notes, strength, cardio });
      const refreshed = await fetchWorkouts(token);
      setHistory(refreshed.workouts);
      setStatus("Workout saved.");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="canvas">
      <motion.article
        className="outline-card"
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
      >
        <h2>Suggested 6-Day Workout Plan</h2>
        <div className="plan-grid">
          {sixDayPlan.map((item, index) => (
            <motion.div
              key={item.day}
              className="plan-card"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
            >
              <strong className="red-accent">
                {item.day}: {item.focus}
              </strong>
              <p>{item.exercises.join(" - ")}</p>
            </motion.div>
          ))}
        </div>
      </motion.article>

      <form className="outline-card form" onSubmit={submitWorkout}>
        <h2>Log Exercises</h2>
        <label>
          Workout Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        {entries.map((entry, index) => (
          <div className="stack" key={`entry-${index}`}>
            <div className="set-row two">
              <label>
                Category
                <select
                  value={entry.category}
                  onChange={(e) => updateEntryField(index, "category", e.target.value)}
                >
                  <option value="push">Push</option>
                  <option value="pull">Pull</option>
                  <option value="legs">Legs</option>
                  <option value="cardio">Cardio</option>
                </select>
              </label>
              <label>
                Exercise
                <input
                  placeholder={entry.category === "cardio" ? "Run" : "Bench Press"}
                  value={entry.exerciseName}
                  onChange={(e) => updateEntryField(index, "exerciseName", e.target.value)}
                  required
                />
              </label>
            </div>

            {entry.category === "cardio" ? (
              <div className="set-row three">
                <input
                  type="number"
                  placeholder="Time (min)"
                  value={entry.timeMinutes}
                  onChange={(e) => updateEntryField(index, "timeMinutes", e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Distance (km)"
                  value={entry.distanceKm}
                  onChange={(e) => updateEntryField(index, "distanceKm", e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Calories burned"
                  value={entry.caloriesBurned}
                  onChange={(e) => updateEntryField(index, "caloriesBurned", e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="set-row three">
                <input
                  type="number"
                  min="1"
                  placeholder="Sets"
                  value={entry.sets}
                  onChange={(e) => updateEntryField(index, "sets", e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Reps"
                  value={entry.reps}
                  onChange={(e) => updateEntryField(index, "reps", e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  value={entry.weightKg}
                  onChange={(e) => updateEntryField(index, "weightKg", e.target.value)}
                  required
                />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "var(--red-soft)", color: "var(--red)" }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() =>
                setEntries((prev) => prev.filter((_, entryIndex) => entryIndex !== index))
              }
              disabled={entries.length === 1}
            >
              Remove Entry
            </motion.button>
          </div>
        ))}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setEntries((prev) => [...prev, createLogEntry()])}
        >
          Add Exercise Entry
        </motion.button>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="brand-filled"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Workout"}
        </motion.button>
        {status ? <p className="status">{status}</p> : null}
      </form>

      <motion.article
        className="outline-card"
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
      >
        <h2>Saved Sessions</h2>
        <div className="history">
          {history.length ? (
            history.map((workout, index) => (
              <motion.article
                className="history-card"
                key={workout.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <strong>{workout.workoutDate}</strong>
                <p>{workout.notes || "No notes"}</p>
                <small>
                  Strength rows: {workout.strength.length} | Cardio rows: {workout.cardio.length}
                </small>
              </motion.article>
            ))
          ) : (
            <p>No sessions yet.</p>
          )}
        </div>
      </motion.article>
    </section>
  );
}

export default App;

