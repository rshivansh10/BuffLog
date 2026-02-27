# Fitness Full-Stack App

Fresh rebuild of the project as a full-stack app:
- React + Vite frontend
- Express backend
- MySQL persistence for users and workout logs

## Data Model
- `users`: account credentials (password hashed with bcrypt)
- `workout_sessions`: one saved session per submission
- `strength_sets`: set-level rows for reps and weight
- `cardio_entries`: cardio rows for time, distance, calories burned

## Environment
Create `.env` in project root:

```env
PORT=4000
JWT_SECRET=replace-with-a-strong-secret
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=mysql://avnadmin:AVNS_r4qYvfgK36pih6rpnH-@mysql-fitness-shivansh-personal.d.aivencloud.com:22931/defaultdb?ssl-mode=REQUIRED
```

## Run
```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000`

The backend auto-creates required SQL tables on startup.

