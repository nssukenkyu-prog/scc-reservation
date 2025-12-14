import { useState, useEffect } from 'react'

type VisitType = '初診' | '再診';
interface Slot {
  slotId: string;
  startTime: string;
  status: 'free' | 'booked';
}

function App() {
  const [view, setView] = useState<'home' | 'booking' | 'confirm' | 'success' | 'admin'>('home');
  const [visitType, setVisitType] = useState<VisitType>('初診');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  // Check for admin flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin') {
      setView('admin');
    }
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      // Demo Mode fallback if API fails (for preview)
      const res = await fetch(`/api/slots?date=${selectedDate}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setSlots(data);
    } catch (e) {
      console.warn('API connection failed, showing demo data');
      setSlots([
        { slotId: '1', startTime: '10:00', status: 'free' },
        { slotId: '2', startTime: '11:00', status: 'booked' },
        { slotId: '3', startTime: '12:00', status: 'free' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'booking') {
      fetchSlots();
    }
  }, [view, selectedDate]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          visitType,
          date: selectedDate,
          slotId: selectedSlot?.slotId,
          startTime: selectedSlot?.startTime,
          endTime: '12:00' // mocked logic
        })
      });
      if (res.ok) {
        setView('success');
      } else {
        alert('Booking failed');
      }
    } catch (e) {
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>NSSU Sports Cure Center</h1>
        <p style={{ color: '#fff' }}>予約管理システム</p>
      </header>

      <main className="glass-panel">
        {view === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>ご希望の診察をお選びください</h2>
            <button className="btn-primary" onClick={() => { setVisitType('初診'); setView('booking'); }}>
              初めての方 (初診)
            </button>
            <button className="btn-primary" style={{ background: '#ec4899' }} onClick={() => { setVisitType('再診'); setView('booking'); }}>
              2回目以降の方 (再診)
            </button>
          </div>
        )}

        {view === 'booking' && (
          <div>
            <button onClick={() => setView('home')} style={{ marginBottom: '1rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>← 戻る</button>
            <h2>{visitType} 予約</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label>日付: </label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>

            {loading ? <div className="shimmer" style={{ height: '100px', borderRadius: '8px' }}></div> : (
              <div className="slot-grid">
                {slots.map(slot => (
                  <div
                    key={slot.slotId}
                    className={`slot-item ${slot.status === 'booked' ? 'booked' : ''}`}
                    onClick={() => slot.status === 'free' && setSelectedSlot(slot)}
                    style={{ borderColor: selectedSlot?.slotId === slot.slotId ? 'var(--color-primary)' : 'transparent', fontWeight: selectedSlot?.slotId === slot.slotId ? 'bold' : 'normal' }}
                  >
                    {slot.startTime}
                    <br />
                    {slot.status === 'free' ? '◎' : '×'}
                  </div>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div style={{ marginTop: '2rem' }}>
                <h3>予約情報の入力</h3>
                <input
                  placeholder="お名前 (例: 山田 太郎)"
                  style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                  placeholder="電話番号 (例: 090-1234-5678)"
                  style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>予約を確定する</button>
              </div>
            )}
          </div>
        )}

        {view === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--color-primary)' }}>予約が完了しました</h2>
            <p>ご来院をお待ちしております。</p>
            <button className="btn-primary" onClick={() => setView('home')}>TOPへ戻る</button>
          </div>
        )}

        {view === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>管理画面</h2>
              <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Exit</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '0.5rem' }} />
              <button className="btn-primary" onClick={fetchSlots}>更新</button>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem' }}>
              <h3>本日の予約状況 ({selectedDate})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>時間</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>区分</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>状態</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? <tr><td colSpan={4} style={{ padding: '8px' }}>データなし</td></tr> : slots.map(slot => (
                    <tr key={slot.slotId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{slot.startTime}</td>
                      <td style={{ padding: '8px' }}>-</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          background: slot.status === 'booked' ? '#ffebeef0' : '#e8f5e9',
                          color: slot.status === 'booked' ? '#c62828' : '#2e7d32',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                        }}>
                          {slot.status === 'booked' ? '予約済' : '空き'}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        {slot.status === 'booked' && <button style={{ background: '#ff5252', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>取消</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px' }}>
              <h4>ログ (直近5件)</h4>
              <p style={{ fontSize: '0.8rem', color: '#666' }}>Google Sheetsの Logs シートを確認してください。</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
