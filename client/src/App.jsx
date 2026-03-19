import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [dates, setDates] = useState([]);
  const [members, setMembers] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [openNote, setOpenNote] = useState(null);
  const [countThreshold, setCountThreshold] = useState(2);
  const debounceTimers = useRef({});

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/responses').then(r => r.json()),
    ]).then(([config, responses]) => {
      setTitle(config.title);
      setYear(config.year);
      setDates(config.dates);
      setMembers(config.members);
      if (config.countThreshold != null) setCountThreshold(config.countThreshold);
      document.title = config.year ? `${config.title} ${config.year}` : config.title;
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

  const getMemberDays = useCallback((member) => {
    let checks = 0;
    for (const d of dates) {
      for (const p of PERIODS) {
        const cell = data[cellKey(d.date, p, member)];
        if (cell && cell.available) checks++;
      }
    }
    return checks * 0.5;
  }, [data, dates]);

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
                <th className="th-date" colSpan={2}>日付 / 時間</th>
                {members.map(m => <th key={m}>{m}</th>)}
                <th>計</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((d, di) =>
                PERIODS.map((period, pi) => {
                  const count = getCount(d.date, period);
                  const isFirst = pi === 0;
                  const weekend = isWeekendOrHoliday(d);

                  const isSunOrHoliday = d.dow === '日' || d.note === '祝';
                  const isSat = d.dow === '土';
                  const rowClasses = [
                    isSunOrHoliday ? 'row-weekend-alt' : (isSat ? 'row-weekend' : ''),
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
                              {!cell.available && (
                                <span className="memo-btn invisible">+</span>
                              )}
                              {cell.available && !hasNote && (
                                <button
                                  className={`memo-btn${noteOpen ? ' invisible' : ''}`}
                                  title="メモを追加"
                                  onClick={() => setOpenNote(noteOpen ? null : k)}
                                >+</button>
                              )}
                              {cell.available && hasNote && (
                                <>
                                  <span className="memo-text">{cell.note}</span>
                                  <button
                                    className="memo-edit-btn"
                                    title="メモを編集"
                                    onClick={() => setOpenNote(noteOpen ? null : k)}
                                  >&#9998;</button>
                                </>
                              )}
                            </div>
                            {noteOpen && (
                              <div className="note-popover">
                                <input
                                  type="text"
                                  className="note-input"
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
                                  placeholder="メモを入力..."
                                  autoFocus
                                />
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className={`cell-count ${count >= countThreshold ? 'good' : 'low'}`}>
                        {count}人
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="summary-label">合計日数</td>
                {members.map(m => {
                  const days = getMemberDays(m);
                  return <td key={m} className="summary-cell">{days % 1 === 0 ? days : days.toFixed(1)}日</td>;
                })}
                <td className="summary-count"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <footer className="app-footer">
        <span className="save-icon" />
        チェックとメモは自動保存されます
      </footer>
    </div>
  );
}
