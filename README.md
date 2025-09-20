
# AIRM mini (Express + Google Calendar)

Kis Node szerver, amely két végpontot ad:
- `GET /api/calendar/slots?date=YYYY-MM-DD` — szabad félórás sávok (09:00–17:00, Europe/Budapest)
- `POST /api/calendar/book` — esemény létrehozása (Meet-link, ha online), meghívó küldése

A `public/index.html` egyszerű UI ezek kipróbálásához.

## Futás helyben
1. Telepítés: `npm install`
2. Állítsd be az ENV változókat (Windows/macOS/Linux példák a .env.example-ben).
3. Indítás: `npm start` → http://localhost:3000

## Render.com telepítés (ingyenes csomaggal is megy)
1. Új GitHub repo → töltsd fel a ZIP tartalmát.
2. Render.com → **New → Blueprint** → válaszd a repót → a `render.yaml` alapján létrejön.
3. **Environment** fül: add fel a 4 változót:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `GOOGLE_CALENDAR_ID`
4. **Deploy** → kapsz publikus URL-t.

## Docker
```
docker build -t airm-mini .
docker run -p 3000:3000   -e GOOGLE_CLIENT_ID=...   -e GOOGLE_CLIENT_SECRET=...   -e GOOGLE_REFRESH_TOKEN=...   -e GOOGLE_CALENDAR_ID=paulsdiamond@gmail.com   airm-mini
```
