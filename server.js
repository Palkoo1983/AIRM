import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { addMinutes, parseISO, format } from 'date-fns';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const TZ = 'Europe/Budapest';

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_CALENDAR_ID } = process.env;

function getOAuth2() {
  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return oAuth2Client;
}

function toISO(date) {
  return date.toISOString().replace('.000Z','Z');
}

function buildSlots(dateStr, busy) {
  const startLocal = new Date(`${dateStr}T09:00:00`);
  const endLocal   = new Date(`${dateStr}T17:00:00`);
  const start = zonedTimeToUtc(startLocal, TZ);
  const end   = zonedTimeToUtc(endLocal, TZ);

  let slots = [];
  for (let t = start; t < end; t = addMinutes(t, 30)) {
    const tEnd = addMinutes(t, 30);
    const overlaps = busy.some(b => {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);
      return (t < bEnd) && (tEnd > bStart);
    });
    if (!overlaps) {
      const local = utcToZonedTime(t, TZ);
      slots.push(format(local, 'HH:mm'));
    }
  }
  return Array.from(new Set(slots));
}

app.get('/api/calendar/slots', async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'Missing date (YYYY-MM-DD).' });

    const auth = getOAuth2();
    const calendar = google.calendar({ version: 'v3', auth });

    const timeMin = toISO(zonedTimeToUtc(new Date(`${date}T09:00:00`), TZ));
    const timeMax = toISO(zonedTimeToUtc(new Date(`${date}T17:00:00`), TZ));

    const fb = await calendar.freebusy.query({
      requestBody: { timeMin, timeMax, timeZone: TZ, items: [{ id: GOOGLE_CALENDAR_ID }] }
    });

    const busy = fb.data.calendars[GOOGLE_CALENDAR_ID]?.busy || [];
    const slots = buildSlots(date, busy);
    res.json({ date, slots });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ error: 'slots_failed', details: e.response?.data || String(e) });
  }
});

app.post('/api/calendar/book', async (req, res) => {
  try {
    const { name, email, date, time, mode } = req.body;
    if (!name || !email || !date || !time) return res.status(400).json({ error: 'missing_fields' });

    const auth = getOAuth2();
    the const calendar = google.calendar({ version: 'v3', auth });

    const startLocal = parseISO(`${date}T${time}:00`);
    const endLocal = addMinutes(startLocal, 30);

    const start = toISO(zonedTimeToUtc(startLocal, TZ));
    const end = toISO(zonedTimeToUtc(endLocal, TZ));

    const requestBody = {
      summary: `AIRM konzultáció — ${name}`,
      description: `Foglaló: ${name} <${email}>\nMód: ${mode || 'online'}`,
      start: { dateTime: start, timeZone: TZ },
      end: { dateTime: end, timeZone: TZ },
      attendees: [{ email }],
      reminders: { useDefault: true }
    };

    if (!mode || mode === 'online') {
      requestBody.conferenceData = { createRequest: { requestId: `airm-${Date.now()}` } };
    }

    const resp = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    res.json({ ok: true, eventId: resp.data.id, htmlLink: resp.data.htmlLink, hangoutLink: resp.data.hangoutLink });
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).json({ error: 'book_failed', details: e.response?.data || String(e) });
  }
});

app.listen(PORT, () => console.log(`AIRM mini running on http://localhost:${PORT}`));
