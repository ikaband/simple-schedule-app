const express = require('express');
const router = express.Router();
const { getDb, save } = require('../db');

// GET /api/responses
router.get('/', async (req, res) => {
  const db = await getDb();
  const rows = db.exec('SELECT name, date, period, available, note FROM responses');
  if (rows.length === 0) return res.json([]);
  const results = rows[0].values.map(r => ({
    name: r[0], date: r[1], period: r[2], available: r[3], note: r[4],
  }));
  res.json(results);
});

// POST /api/responses
router.post('/', async (req, res) => {
  const { name, date, period, available, note } = req.body;
  if (!name || !date || !period || available === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const db = await getDb();
  db.run(
    'INSERT OR REPLACE INTO responses (name, date, period, available, note) VALUES (?, ?, ?, ?, ?)',
    [name, date, period, available ? 1 : 0, note || '']
  );
  save();
  res.json({ ok: true });
});

// DELETE /api/responses/:name
router.delete('/:name', async (req, res) => {
  const db = await getDb();
  db.run('DELETE FROM responses WHERE name = ?', [req.params.name]);
  save();
  res.json({ ok: true });
});

// GET /api/summary
router.get('/summary', async (req, res) => {
  const db = await getDb();
  const rows = db.exec(`
    SELECT date, period, SUM(available) as count
    FROM responses WHERE available = 1
    GROUP BY date, period
  `);
  if (rows.length === 0) return res.json([]);
  const results = rows[0].values.map(r => ({
    date: r[0], period: r[1], count: r[2],
  }));
  res.json(results);
});

module.exports = router;
