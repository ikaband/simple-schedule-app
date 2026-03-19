import { useState, useEffect, useCallback, useRef } from 'react';

const DATES = [
  { date: '2026-03-20', label: '3/20', dow: '金', note: '祝' },
  { date: '2026-03-21', label: '3/21', dow: '土', note: '' },
  { date: '2026-03-22', label: '3/22', dow: '日', note: '' },
  { date: '2026-03-23', label: '3/23', dow: '月', note: '' },
  { date: '2026-03-24', label: '3/24', dow: '火', note: '' },
  { date: '2026-03-25', label: '3/25', dow: '水', note: '' },
  { date: '2026-03-26', label: '3/26', dow: '木', note: '' },
  { date: '2026-03-27', label: '3/27', dow: '金', note: '' },
  { date: '2026-03-28', label: '3/28', dow: '土', note: '' },
  { date: '2026-03-29', label: '3/29', dow: '日', note: '' },
  { date: '2026-03-30', label: '3/30', dow: '月', note: '' },
  { date: '2026-03-31', label: '3/31', dow: '火', note: '' },
  { date: '2026-04-01', label: '4/1', dow: '水', note: '' },
  { date: '2026-04-02', label: '4/2', dow: '木', note: '' },
  { date: '2026-04-03', label: '4/3', dow: '金', note: '' },
  { date: '2026-04-04', label: '4/4', dow: '土', note: '' },
  { date: '2026-04-05', label: '4/5', dow: '日', note: '' },
  { date: '2026-04-06', label: '4/6', dow: '月', note: '' },
  { date: '2026-04-07', label: '4/7', dow: '火', note: '' },
];

const PERIODS = ['am', 'pm'];

function cellKey(date, period, name) {
  return `${date}_${period}_${name}`;
}

function isWeekendOrHoliday(d) {
  return d.dow === '土' || d.dow === '日' || d.note === '祝';
}

export default function App() {
  const [title, setTitle] = useState('日程調整');
  const [year, setYear] = useState('');
  const [members, setMembers] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [openNote, setOpenNote] = useState(null);
  const debounceTimers = useRef({});

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/responses').then(r => r.json()),
    ]).then(([config, responses]) => {
      setTitle(config.title);
      setYear(config.year);
      setMembers(config.members);
      const map = {};
      for (const r of responses) {
        map[cellKey(r.date, r.period, r.name)] = {
          available: !!r.available,
          note: r.note || '',
        };
      }
      setData(map);
      setLoading(false);
    });
  }, []);

  const saveCell = useCallback((name, date, period, available, note) => {
    fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date, period, available: available ? 1 : 0, note }),
    });
  }, []);

  const handleCheck = useCallback((name, date, period) => {
    setData(prev => {
      const k = cellKey(date, period, name);
      const current = prev[k] || { available: false, note: '' };
      const newAvailable = !current.available;
      const newNote = newAvailable ? current.note : '';
      saveCell(name, date, period, newAvailable, newNote);
      return { ...prev, [k]: { available: newAvailable, note: newNote } };
    });
  }, [saveCell]);

  const handleNoteChange = useCallback((name, date, period, note) => {
    const k = cellKey(date, period, name);
    setData(prev => ({ ...prev, [k]: { ...prev[k], note } }));

    if (debounceTimers.current[k]) {
      clearTimeout(debounceTimers.current[k]);
    }
    debounceTimers.current[k] = setTimeout(() => {
      setData(prev => {
        const cell = prev[k];
        if (cell) saveCell(name, date, period, cell.available, cell.note);
        return prev;
      });
    }, 1500);
  }, [saveCell]);

  const handleNoteBlur = useCallback((name, date, period) => {
    const k = cellKey(date, period, name);
    if (debounceTimers.current[k]) {
      clearTimeout(debounceTimers.current[k]);
      delete debounceTimers.current[k];
    }
    setData(prev => {
      const cell = prev[k];
      if (cell) saveCell(name, date, period, cell.available, cell.note);
      return prev;
    });
  }, [saveCell]);

  const getCount = useCallback((date, period) => {
    let count = 0;
    for (const m of members) {
      const cell = data[cellKey(date, period, m)];
      if (cell && cell.available) count++;
    }
    return count;
  }, [data, members]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        読み込み中...
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{title}</h1>
        {year && <span className="badge">{year}</span>}
      </header>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>時間帯</th>
                {members.map(m => <th key={m}>{m}</th>)}
                <th>計</th>
              </tr>
            </thead>
            <tbody>
              {DATES.map((d, di) =>
                PERIODS.map((period, pi) => {
                  const count = getCount(d.date, period);
                  const isFirst = pi === 0;
                  const weekend = isWeekendOrHoliday(d);

                  const rowClasses = [
                    weekend ? (di % 2 === 0 ? 'row-weekend' : 'row-weekend-alt') : '',
                    isFirst ? 'row-group-start' : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <tr key={`${d.date}_${period}`} className={rowClasses}>
                      {isFirst && (
                        <td rowSpan={2} className="cell-date">
                          <div className="date-num">{d.label}</div>
                          <div className={`date-dow${weekend ? ' weekend' : ''}`}>
                            {d.dow}{d.note && `・${d.note}`}
                          </div>
                        </td>
                      )}
                      <td className="cell-period">
                        {period === 'am' ? 'AM' : 'PM'}
                      </td>
                      {members.map(m => {
                        const k = cellKey(d.date, period, m);
                        const cell = data[k] || { available: false, note: '' };
                        const noteOpen = openNote === k;
                        const hasNote = cell.note && cell.note.length > 0;
                        return (
                          <td key={m} className="cell-check">
                            <div className="check-wrapper">
                              <input
                                type="checkbox"
                                className="cb"
                                checked={cell.available}
                                onChange={() => handleCheck(m, d.date, period)}
                              />
                              {cell.available && !noteOpen && !hasNote && (
                                <button
                                  className="memo-btn"
                                  title="メモを追加"
                                  onClick={() => setOpenNote(k)}
                                >+</button>
                              )}
                              {cell.available && !noteOpen && hasNote && (
                                <>
                                  <span className="memo-text">{cell.note}</span>
                                  <button
                                    className="memo-edit-btn"
                                    title="メモを編集"
                                    onClick={() => setOpenNote(k)}
                                  >&#9998;</button>
                                </>
                              )}
                              {noteOpen && (
                                <input
                                  type="text"
                                  className="note-input-inline"
                                  value={cell.note}
                                  onChange={e => handleNoteChange(m, d.date, period, e.target.value)}
                                  onBlur={() => {
                                    handleNoteBlur(m, d.date, period);
                                    setTimeout(() => setOpenNote(prev => prev === k ? null : prev), 150);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      handleNoteBlur(m, d.date, period);
                                      setOpenNote(null);
                                    }
                                  }}
                                  placeholder="メモ"
                                  autoFocus
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className={`cell-count ${count >= 2 ? 'good' : 'low'}`}>
                        {count}人
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="app-footer">
        チェックは自動保存されます
      </footer>
    </div>
  );
}
