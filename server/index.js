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

// 設定API
app.get('/api/config', (req, res) => {
  res.json({
    title: process.env.APP_TITLE || '日程調整',
    year: process.env.APP_YEAR || '',
    members: (process.env.MEMBERS || '').split(',').filter(Boolean),
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
