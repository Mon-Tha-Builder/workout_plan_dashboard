# FORGE Personal Fitness OS

FORGE is a private personal fitness operating system for training, recovery, body tracking, progress review, workout summaries, and adaptive coach logic.

## Current status

FORGE currently has a working local first frontend and Cloudflare backend prep files.

Active phases:

- Phase 0: core repo repair complete
- Phase 1: local save foundation complete
- Phase 2: adaptive split engine complete
- Phase 3: cleanup and workout summary upgrade complete
- Phase 4: Cloudflare sync prep started

## Working frontend features

- Repaired `index.html` as the real app entry file
- Repaired `manifest.webmanifest` as the real PWA manifest
- Repaired `sw.js` as the real service worker
- Local autosave with browser storage
- Export and import JSON backup
- Reset with confirmation
- Readiness check in
- Day 1 starts today, not Monday
- Next best session scheduling
- Automatic workout loading
- Equipment aware exercise choices
- Separate barbell bench and barbell squat access settings
- Exercise rating system
- Adaptive workout changes from readiness, pain, time, equipment, and recovery
- Time targets instead of forced timers
- Start session and finish workout flow
- Workout summaries with next time recommendations
- Body logging
- PR vault
- Battle calendar
- Local Coach Brain logic

## Cloudflare backend prep

The repo now includes Cloudflare prep files in the `cloudflare/` folder:

- `cloudflare/schema.sql`
- `cloudflare/worker.js`
- `cloudflare/README.md`

These files prepare FORGE for real cloud saving through Cloudflare D1 and a protected Worker.

Important: the frontend is still local first. Do not add a visible cloud sync button until the Worker is deployed and tested.

## FORGE training goal

The user's primary goal is to build a stronger frame, look stronger, improve posture, and improve cardio and breathing without becoming smaller or turning the program into a fat loss plan.

FORGE should prioritize:

- Full body development
- Balanced upper body growth: chest, back, shoulders, and arms all matter
- Serious core development
- Posture improvement, especially mid back and neck/trap management
- One hard lower body strength day
- One lighter athletic lower body day
- Mixed cardio for conditioning and breathing, not punishment
- Flexible workout length: 30, 45, or 60 minutes based on readiness and schedule
- A hybrid adaptive schedule that keeps the plan in order but adjusts when life, recovery, or missed days happen

## Locked split

The standard split is the FORGE Hybrid Frame Split:

1. Upper Strength Frame
2. Lower Strength Core
3. Conditioning Breathing Posture
4. Upper Build Arms
5. Lower Athletic Full Body

## AI coach workout update rules

Any local coach logic or future Claude integration must follow these rules when updating workouts:

1. Do not randomly replace the program. Adjust the current split intelligently.
2. Keep the user's main goal intact: stronger frame, stronger look, better posture, better cardio, and better breathing.
3. Do not turn the plan into a weight loss or high calorie burn program.
4. Keep upper body balanced. Chest, back, shoulders, and arms should all be respected.
5. Protect posture. Mid back and neck/trap issues should reduce trap dominant work and increase posture friendly rows, rear delts, face pulls, thoracic mobility, and breathing work.
6. Keep core as a serious priority across the week.
7. Keep legs at one hard lower body day and one lighter athletic lower body day.
8. Use cardio to build the breathing engine, not to shrink the user.
9. Use readiness, soreness, pain, time available, equipment, completed sessions, exercise ratings, and performance logs before changing a workout.
10. If recovery is low, reduce sets, lower intensity, or move to recovery work instead of forcing the original plan.
11. If time is short, keep the highest value exercises and cut accessories first.
12. If equipment is unavailable, swap the movement pattern, not the entire goal of the day.
13. If the user rates an exercise poorly, suggest alternatives that train the same pattern.
14. If the user loves an exercise but it causes pain, pain wins and the exercise must be swapped or reduced.
15. Do not diagnose injuries. Recommend safer swaps, reduced load, mobility, and professional help if pain persists or worsens.
16. Never expose API keys in frontend code.
17. Claude integration must go through Cloudflare, not direct browser calls.

## Equipment rules

The default plan should assume basic gym equipment:

- Dumbbells
- Adjustable bench
- Cable machine if available
- Basic machines
- Treadmill, bike, or trail cardio options
- Mats or floor space

The app lets the user update equipment access, including separate toggles for:

- Barbell bench access
- Barbell squat access

The coach chooses exercises based on equipment profile, pain notes, readiness, and exercise preference ratings.

## Product rules

- No fake Apple Health
- No fake step counter
- No frontend API keys
- No dead buttons
- No useless files
- No placeholder AI that does not do anything
- No visible cloud sync button until the Worker is deployed and tested
- Claude integration must go through Cloudflare later
