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

function key(date, period, name) {
  return `${date}_${period}_${name}`;
}

function isWeekendOrHoliday(d) {
  return d.dow === '土' || d.dow === '日' || d.note === '祝';
}

export default function App() {
  const [members, setMembers] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef({});

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/responses').then(r => r.json()),
    ]).then(([memberList, responses]) => {
      setMembers(memberList);
      const map = {};
      for (const r of responses) {
        map[key(r.date, r.period, r.name)] = {
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
      const k = key(date, period, name);
      const current = prev[k] || { available: false, note: '' };
      const newAvailable = !current.available;
      const newNote = newAvailable ? current.note : '';
      saveCell(name, date, period, newAvailable, newNote);
      return { ...prev, [k]: { available: newAvailable, note: newNote } };
    });
  }, [saveCell]);

  const handleNoteChange = useCallback((name, date, period, note) => {
    const k = key(date, period, name);
    setData(prev => ({ ...prev, [k]: { ...prev[k], note } }));

    const timerKey = k;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    debounceTimers.current[timerKey] = setTimeout(() => {
      setData(prev => {
        const cell = prev[k];
        if (cell) saveCell(name, date, period, cell.available, cell.note);
        return prev;
      });
    }, 1500);
  }, [saveCell]);

  const handleNoteBlur = useCallback((name, date, period) => {
    const k = key(date, period, name);
    const timerKey = k;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
      delete debounceTimers.current[timerKey];
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
      const cell = data[key(date, period, m)];
      if (cell && cell.available) count++;
    }
    return count;
  }, [data, members]);

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: '10px' }}>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>部活 春休み日程調整</h1>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={thStyle}>日付</th>
              <th style={thStyle}>時間帯</th>
              {members.map(m => (
                <th key={m} style={thStyle}>{m}</th>
              ))}
              <th style={thStyle}>計</th>
            </tr>
          </thead>
          <tbody>
            {DATES.map((d, di) =>
              PERIODS.map((period, pi) => {
                const count = getCount(d.date, period);
                const isFirst = pi === 0;
                const weekend = isWeekendOrHoliday(d);
                const rowBg = weekend
                  ? (di % 2 === 0 ? '#fff3e0' : '#ffe0b2')
                  : (di % 2 === 0 ? '#ffffff' : '#f5f5f5');

                return (
                  <tr key={`${d.date}_${period}`} style={{ backgroundColor: rowBg }}>
                    {isFirst && (
                      <td rowSpan={2} style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }}>
                        {d.label}
                        <br />
                        <span style={{ fontSize: '0.75rem', color: weekend ? '#e65100' : '#666' }}>
                          ({d.dow}{d.note && `・${d.note}`})
                        </span>
                      </td>
                    )}
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 500 }}>
                      {period === 'am' ? 'AM' : 'PM'}
                    </td>
                    {members.map(m => {
                      const k = key(d.date, period, m);
                      const cell = data[k] || { available: false, note: '' };
                      return (
                        <td key={m} style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input
                              type="checkbox"
                              checked={cell.available}
                              onChange={() => handleCheck(m, d.date, period)}
                              style={{ cursor: 'pointer', margin: 0 }}
                            />
                            {cell.available && (
                              <input
                                type="text"
                                value={cell.note}
                                onChange={e => handleNoteChange(m, d.date, period, e.target.value)}
                                onBlur={() => handleNoteBlur(m, d.date, period)}
                                placeholder="メモ"
                                style={{
                                  width: '70px',
                                  fontSize: '0.75rem',
                                  border: '1px solid #ccc',
                                  borderRadius: '3px',
                                  padding: '1px 3px',
                                }}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{
                      ...tdStyle,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: count >= 2 ? '#c8e6c9' : '#ffcdd2',
                      color: count >= 2 ? '#2e7d32' : '#c62828',
                    }}>
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
  );
}

const thStyle = {
  border: '1px solid #ccc',
  padding: '6px 8px',
  backgroundColor: '#37474f',
  color: '#fff',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const tdStyle = {
  border: '1px solid #ddd',
  padding: '4px 6px',
};
