
const express = require('express');
const PDFDocument = require('pdfkit');
const { pool, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false, limit: '20kb' }));

const surveyFields = [
  { label: 'Name', key: 'name' },
  { label: 'Email', key: 'email' },
  { label: 'Age', key: 'age' },
  { label: 'Activity Level', key: 'activity' },
  { label: 'Fitness Goal', key: 'goal' },
  { label: 'Target Timeline', key: 'timeline' },
  { label: 'Preferred Workout', key: 'workout' },
  { label: 'Available Equipment', key: 'equipment' },
  { label: 'Workout Days Per Week', key: 'days' },
  { label: 'Workout Duration', key: 'duration' },
  { label: 'Average Sleep', key: 'sleep' },
  { label: 'Daily Water Intake', key: 'water' },
  { label: 'Diet Preference', key: 'diet' }
];

const choices = {
  activity: ['Beginner', 'Moderately active', 'Very active'],
  goal: [
    'Weight management',
    'Muscle gain',
    'Strength improvement',
    'Better endurance',
    'General fitness',
    'Flexibility and mobility'
  ],
  timeline: [
    '1 month', '3 months', '6 months', 'Long-term lifestyle'
  ],
  workout: [
    'Strength training', 'Cardio', 'Calisthenics',
    'Yoga', 'Swimming', 'Mixed training'
  ],
  equipment: [
    'Gym equipment', 'Dumbbells at home', 'Bodyweight only',
    'Resistance bands', 'Multiple equipment types'
  ],
  days: ['0', '1', '2', '3', '4', '5', '6', '7'],
  duration: [
    'Under 20 minutes', '20–30 minutes', '30–45 minutes',
    '45–60 minutes', 'Over 60 minutes'
  ],
  sleep: [
    'Less than 5 hours', '5–6 hours',
    '7–8 hours', 'More than 8 hours'
  ],
  water: [
    'Less than 1 litre', '1–2 litres',
    '2–3 litres', 'More than 3 litres'
  ],
  diet: [
    'Vegetarian', 'Non-vegetarian', 'Vegan',
    'Eggetarian', 'No specific preference'
  ]
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getSurveyData(body) {
  const data = {};

  for (const field of surveyFields) {
    data[field.key] = String(body[field.key] || '').trim();
  }

  return data;
}

function validateSurvey(data) {
  if (!data.name || data.name.length > 80) return false;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return false;
  if (data.email.length > 120) return false;

  const age = Number(data.age);
  if (!Number.isInteger(age) || age < 13 || age > 100) return false;

  for (const [key, allowedValues] of Object.entries(choices)) {
    if (!allowedValues.includes(data[key])) return false;
  }

  return true;
}

function pageStyles() {
  return `
    * { box-sizing: border-box; }
    :root {
      --navy: #10172a;
      --blue: #536dfe;
      --lime: #c7f36b;
      --muted: #8e9bb6;
      --line: #29334d;
      --panel: #18223a;
      --white: #f6f8ff;
    }
    body {
      margin: 0;
      background: var(--navy);
      color: var(--white);
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      line-height: 1.6;
    }
    .topbar {
      border-bottom: 1px solid var(--line);
      padding: 17px 20px;
      background: #10172a;
    }
    .top-inner {
      max-width: 920px;
      margin: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .brand {
      font-size: 21px;
      font-weight: 850;
      letter-spacing: -.7px;
    }
    .brand span { color: var(--lime); }
    .pill {
      border: 1px solid #35415d;
      border-radius: 30px;
      padding: 5px 11px;
      font-size: 12px;
      color: var(--lime);
    }
    main {
      max-width: 800px;
      padding: 35px 17px 60px;
      margin: auto;
    }
    .hero { margin-bottom: 26px; }
    .eyebrow {
      color: var(--lime);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    h1 {
      font-size: clamp(32px, 6vw, 48px);
      line-height: 1.12;
      letter-spacing: -1.5px;
      margin: 10px 0;
    }
    h1 span { color: var(--lime); }
    .subtitle { color: var(--muted); max-width: 570px; }
    .progress-wrap {
      background: #222d46;
      height: 6px;
      border-radius: 10px;
      overflow: hidden;
      margin: 22px 0 8px;
    }
    .progress {
      height: 100%;
      width: 0%;
      background: var(--lime);
      transition: width .2s ease;
    }
    .progress-label {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 17px;
      padding: 24px;
      margin: 17px 0;
    }
    .section-heading {
      display: flex;
      align-items: flex-start;
      gap: 13px;
      margin-bottom: 20px;
    }
    .number {
      display: grid;
      place-items: center;
      min-width: 37px;
      height: 37px;
      border-radius: 10px;
      background: #27375c;
      color: var(--lime);
      font-weight: 800;
    }
    h2 { margin: 0; font-size: 19px; }
    .section-desc { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #e0e7f7;
    }
    input, select {
      width: 100%;
      min-width: 0;
      margin-top: 7px;
      padding: 12px;
      border: 1px solid #35415d;
      border-radius: 9px;
      background: #111a2e;
      color: white;
      font: inherit;
      font-size: 14px;
    }
    input:focus, select:focus {
      outline: 2px solid var(--blue);
      border-color: var(--blue);
    }
    input::placeholder { color: #7885a1; }
    .full { grid-column: 1 / -1; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 19px;
      border: 0;
      border-radius: 10px;
      text-decoration: none;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      transition: transform .15s, opacity .15s;
    }
    .btn:hover { transform: translateY(-1px); opacity: .92; }
    .primary { background: var(--lime); color: #182238; }
    .secondary { background: #293653; color: white; }
    .submit { width: 100%; font-size: 16px; margin-top: 5px; }
    .note { font-size: 12px; color: var(--muted); text-align: center; }
    .result-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      margin: 22px 0;
    }
    .result-row {
      display: grid;
      grid-template-columns: minmax(130px, 40%) 1fr;
      gap: 12px;
      padding: 13px 18px;
      border-bottom: 1px solid var(--line);
      overflow-wrap: anywhere;
    }
    .result-row:last-child { border-bottom: 0; }
    .result-key { color: var(--muted); font-size: 13px; }
    .result-value { font-weight: 600; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .actions form { flex: 1 1 190px; }
    .actions button { width: 100%; }
    .error { color: #ff9c9c; }
    @media (max-width: 560px) {
      main { padding-top: 26px; }
      .grid { grid-template-columns: 1fr; }
      .full { grid-column: auto; }
      .card { padding: 18px; }
      .result-row { grid-template-columns: 1fr; gap: 2px; }
      .pill { font-size: 10px; }
    }
  `;
}

function header() {
  return `
    <header class="topbar">
      <div class="top-inner">
        <div class="brand">FitTrack<span>.</span></div>
        <div class="pill">FITNESS ASSESSMENT</div>
      </div>
    </header>`;
}

function hiddenFields(data) {
  return surveyFields.map(({ key }) =>
    `<input type="hidden" name="${key}" value="${escapeHtml(data[key])}">`
  ).join('');
}

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FitTrack | Fitness Assessment</title>
<style>${pageStyles()}</style>
</head>
<body>
${header()}
<main>
  <div class="hero">
    <div class="eyebrow">Your journey. Your goals.</div>
    <h1>Build your <span>stronger</span> tomorrow.</h1>
    <p class="subtitle">Tell us about your routine, goals and lifestyle. Complete this short assessment to create your personal fitness survey report.</p>
    <div class="progress-wrap"><div class="progress" id="progress"></div></div>
    <div class="progress-label"><span>Assessment progress</span><span id="progressText">0% complete</span></div>
  </div>

  <form action="/submit" method="POST" id="surveyForm">
    <section class="card">
      <div class="section-heading">
        <div class="number">01</div>
        <div><h2>About you</h2><p class="section-desc">A few basics to get started.</p></div>
      </div>
      <div class="grid">
        <label>Name
          <input name="name" maxlength="80" required placeholder="Enter your name">
        </label>
        <label>Email address
          <input type="email" name="email" maxlength="120" required placeholder="you@example.com">
        </label>
        <label>Age
          <input type="number" name="age" min="13" max="100" required placeholder="Your age">
        </label>
        <label>Current activity level
          <select name="activity" required>
            <option value="">Choose one</option>
            <option>Beginner</option>
            <option>Moderately active</option>
            <option>Very active</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="section-heading">
        <div class="number">02</div>
        <div><h2>Your fitness goals</h2><p class="section-desc">What do you want to achieve?</p></div>
      </div>
      <div class="grid">
        <label>Primary goal
          <select name="goal" required>
            <option value="">Choose your goal</option>
            <option>Weight management</option>
            <option>Muscle gain</option>
            <option>Strength improvement</option>
            <option>Better endurance</option>
            <option>General fitness</option>
            <option>Flexibility and mobility</option>
          </select>
        </label>
        <label>Target timeline
          <select name="timeline" required>
            <option value="">Choose timeline</option>
            <option>1 month</option>
            <option>3 months</option>
            <option>6 months</option>
            <option>Long-term lifestyle</option>
          </select>
        </label>
        <label>Preferred workout
          <select name="workout" required>
            <option value="">Choose workout</option>
            <option>Strength training</option>
            <option>Cardio</option>
            <option>Calisthenics</option>
            <option>Yoga</option>
            <option>Swimming</option>
            <option>Mixed training</option>
          </select>
        </label>
        <label>Available equipment
          <select name="equipment" required>
            <option value="">Choose equipment</option>
            <option>Gym equipment</option>
            <option>Dumbbells at home</option>
            <option>Bodyweight only</option>
            <option>Resistance bands</option>
            <option>Multiple equipment types</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="section-heading">
        <div class="number">03</div>
        <div><h2>Your daily routine</h2><p class="section-desc">Help us understand your current habits.</p></div>
      </div>
      <div class="grid">
        <label>Workout days per week
          <select name="days" required>
            <option value="">Select days</option>
            <option>0</option><option>1</option><option>2</option><option>3</option>
            <option>4</option><option>5</option><option>6</option><option>7</option>
          </select>
        </label>
        <label>Workout duration
          <select name="duration" required>
            <option value="">Choose duration</option>
            <option>Under 20 minutes</option>
            <option>20–30 minutes</option>
            <option>30–45 minutes</option>
            <option>45–60 minutes</option>
            <option>Over 60 minutes</option>
          </select>
        </label>
        <label>Average sleep per night
          <select name="sleep" required>
            <option value="">Choose sleep duration</option>
            <option>Less than 5 hours</option>
            <option>5–6 hours</option>
            <option>7–8 hours</option>
            <option>More than 8 hours</option>
          </select>
        </label>
        <label>Daily water intake
          <select name="water" required>
            <option value="">Choose water intake</option>
            <option>Less than 1 litre</option>
            <option>1–2 litres</option>
            <option>2–3 litres</option>
            <option>More than 3 litres</option>
          </select>
        </label>
        <label class="full">Diet preference
          <select name="diet" required>
            <option value="">Choose diet preference</option>
            <option>Vegetarian</option>
            <option>Non-vegetarian</option>
            <option>Vegan</option>
            <option>Eggetarian</option>
            <option>No specific preference</option>
          </select>
        </label>
      </div>
    </section>
    <button class="btn primary submit" type="submit">Complete my assessment →</button>
    <p class="note">Your answers are used to generate your report. This demo does not store submissions in a database.</p>
  </form>
</main>
<script>
const form = document.getElementById('surveyForm');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progressText');
function updateProgress() {
  const fields = [...form.querySelectorAll('[required]')];
  const completed = fields.filter(field => field.value.trim() !== '').length;
  const percent = Math.round((completed / fields.length) * 100);
  progress.style.width = percent + '%';
  progressText.textContent = percent + '% complete';
}
form.addEventListener('input', updateProgress);
form.addEventListener('change', updateProgress);
updateProgress();
</script>
</body>
</html>`);
});

app.post('/submit', async (req, res) => {
  const data = getSurveyData(req.body);

  if (!validateSurvey(data)) {
    return res.status(400).send(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invalid survey</title><style>${pageStyles()}</style></head><body>${header()}<main><h1 class="error">Please check your answers</h1><p>Some details are missing or invalid. Return to the survey and try again.</p><a class="btn primary" href="/">Back to survey</a></main></body></html>`
    );
  }

  try {
    await pool.execute(
      `INSERT INTO survey_responses
       (name, email, age, activity, goal, timeline, workout,
        equipment, days, duration, sleep, water, diet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name, data.email, Number(data.age), data.activity,
        data.goal, data.timeline, data.workout, data.equipment,
        Number(data.days), data.duration, data.sleep, data.water,
        data.diet
      ]
    );
    console.log('Survey response saved to MySQL');
  } catch (error) {
    console.error('Failed to save survey:', error.message);
    return res.status(503).send(
      'The database is temporarily unavailable. Please try again.'
    );
  }

  const rows = surveyFields.map(({ label, key }) => `
    <div class="result-row">
      <div class="result-key">${escapeHtml(label)}</div>
      <div class="result-value">${escapeHtml(data[key])}</div>
    </div>
  `).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FitTrack | Your Report</title>
<style>${pageStyles()}</style>
</head>
<body>
${header()}
<main>
  <div class="hero">
    <div class="eyebrow">Assessment complete</div>
    <h1>You're one step closer, <span>${escapeHtml(data.name)}</span>.</h1>
    <p class="subtitle">Your responses have been saved. Download a copy of your fitness survey to keep for your records.</p>
  </div>
  <section class="card">
    <div class="section-heading">
      <div class="number">✓</div>
      <div><h2>Your survey summary</h2><p class="section-desc">Review the answers you submitted.</p></div>
    </div>
    <div class="result-card">${rows}</div>
    <div class="actions">
      <form method="POST" action="/download-pdf">
        ${hiddenFields(data)}
        <button class="btn primary" type="submit">↓ Download PDF</button>
      </form>
      <form method="POST" action="/download-csv">
        ${hiddenFields(data)}
        <button class="btn secondary" type="submit">↓ Download CSV</button>
      </form>
    </div>
  </section>
  <a class="btn secondary" href="/">← Back to survey</a>
  <p class="note">Your survey response has been saved to the database.</p>
</main>
</body>
</html>`);
});

app.post('/download-pdf', (req, res) => {
  const data = getSurveyData(req.body);

  if (!validateSurvey(data)) {
    return res.status(400).send('Invalid survey details. Please submit the survey again.');
  }

  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="fittrack-survey.pdf"');

  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, 145).fill('#10172a');
  doc.fillColor('#c7f36b').fontSize(12)
    .text('FITNESS ASSESSMENT', 48, 40, { characterSpacing: 2 });
  doc.fillColor('#ffffff').fontSize(28)
    .text('FitTrack Survey', 48, 66);
  doc.fillColor('#d2daec').fontSize(11)
    .text('Your completed fitness questionnaire', 48, 108);

  doc.moveDown(5);
  doc.fillColor('#536dfe').fontSize(16)
    .text('Your responses', 48, 175);
  doc.moveTo(48, 202).lineTo(doc.page.width - 48, 202)
    .strokeColor('#dce2ee').stroke();

  let y = 220;

  surveyFields.forEach(({ label, key }) => {
    if (y > doc.page.height - 85) {
      doc.addPage();
      y = 55;
    }

    doc.fillColor('#667085').fontSize(9).text(label.toUpperCase(), 48, y);
    y += 14;

    doc.fillColor('#172033').fontSize(12)
      .text(data[key], 48, y, { width: doc.page.width - 96 });

    y += Math.max(31, doc.heightOfString(data[key], {
      width: doc.page.width - 96,
      fontSize: 12
    }) + 18);
  });

  doc.moveTo(48, doc.page.height - 55)
    .lineTo(doc.page.width - 48, doc.page.height - 55)
    .strokeColor('#dce2ee').stroke();

  doc.fillColor('#667085').fontSize(8)
    .text('Generated by FitTrack Survey', 48, doc.page.height - 42);

  doc.end();
});

app.post('/download-csv', (req, res) => {
  const data = getSurveyData(req.body);

  if (!validateSurvey(data)) {
    return res.status(400).send('Invalid survey details. Please submit the survey again.');
  }

  const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;

  const csv = [
    ['Question', 'Answer'],
    ...surveyFields.map(({ label, key }) => [label, data[key]])
  ].map(row => row.map(csvCell).join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fittrack-survey.csv"');
  res.send('\uFEFF' + csv);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FitTrack Survey running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });
