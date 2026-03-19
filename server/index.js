require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');
const cors = require('cors');
const responsesRouter = require('./routes/responses');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 日付生成
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function generateDates() {
  const start = process.env.DATE_START;
  const end = process.env.DATE_END;
  if (!start || !end) return [];

  const holidays = new Set((process.env.HOLIDAYS || '').split(',').filter(Boolean));
  const dates = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');

  while (cur <= last) {
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1);
    const dd = String(cur.getDate());
    const dateStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    const dayOfWeek = cur.getDay();

    dates.push({
      date: dateStr,
      label: `${mm}/${dd}`,
      dow: DOW_LABELS[dayOfWeek],
      note: holidays.has(dateStr) ? '祝' : '',
    });

    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// 設定API
app.get('/api/config', (req, res) => {
  res.json({
    title: process.env.APP_TITLE || '日程調整',
    year: process.env.APP_YEAR || '',
    members: (process.env.MEMBERS || '').split(',').filter(Boolean),
    dates: generateDates(),
    countThreshold: parseInt(process.env.COUNT_THRESHOLD, 10) || 2,
  });
});

// メンバー一覧API
app.get('/api/members', (req, res) => {
  const members = (process.env.MEMBERS || '').split(',').filter(Boolean);
  res.json(members);
});

// 回答API
app.use('/api/responses', responsesRouter);

// 本番配信
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// DB初期化してからサーバー起動
getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
