import React, { useState, useEffect } from 'react'

type VisitType = '初診' | '再診';
interface Slot {
  slotId: string;
  startTime: string;
  status: 'free' | 'booked';
}

function App() {
  const [view, setView] = useState<'lp' | 'home' | 'booking' | 'confirm' | 'success' | 'admin'>('lp');
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
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'booking' || view === 'admin') {
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
          endTime: '12:00' // mock
        })
      });
      if (res.ok) {
        setView('success');
      } else {
        alert('Booking failed. The slot might be taken.');
      }
    } catch (e) {
      alert('Network error');
    }
    setLoading(false);
  };

  const handleAdminGenerateSlots = async () => {
    if (!confirm(`${selectedDate} の予約枠 (10:00-19:00 / 30分) を生成しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      if (res.ok) {
        alert('生成完了');
        fetchSlots();
      } else {
        alert('生成失敗');
      }
    } catch (e) { console.error(e); alert('Error'); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', paddingBottom: '60px' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.5rem',
          color: 'var(--color-primary)',
          background: 'rgba(255,255,255,0.9)',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          日本体育大学<br />スポーツキュアセンター<br />横浜・健志台接骨院<br />
          <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#666' }}>予約管理システム</span>
        </h1>
      </header>

      <main className="glass-panel">

        {/* Landing Page with Explanation */}
        {view === 'lp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', borderLeft: '5px solid var(--color-primary)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>ご利用について</h3>
              <p style={{ lineHeight: '1.6' }}>
                本システムは、初診・再診の患者様を円滑にご案内するための専用予約システムです。<br />
                現在継続して治療中の方は、これまで通りの受付方法となります。
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn-primary"
                style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}
                onClick={() => { setVisitType('初診'); setView('booking'); }}
              >
                <span style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>初診の方はこちら</span>
                <span style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>
                  ※ 当センターでの治療が初めての方
                </span>
              </button>

              <button
                className="btn-primary"
                style={{ background: 'linear-gradient(90deg, #0ea5e9, #0284c7)', padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}
                onClick={() => { setVisitType('再診'); setView('booking'); }}
              >
                <span style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>再診の方はこちら</span>
                <span style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>
                  ※ 前回の来院から1ヶ月以上経過している方<br />
                  ※ 現在治療中の部位とは異なる場所の治療をご希望の方
                </span>
              </button>
            </div>
          </div>
        )}

        {view === 'home' && (
          /* Deprecated view, redirect to lp or remove logic. Keeping for safety if needed but 'lp' replaces it. */
          <div />
        )}

        {view === 'booking' && (
          <div>
            <button onClick={() => setView('lp')} style={{ marginBottom: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>← 戻る</button>
            <h2 style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '0.5rem' }}>{visitType} 予約</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>日付を選択してください</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '1rem' }}
              />
            </div>

            {loading ? <div className="shimmer" style={{ height: '100px', borderRadius: '8px' }}></div> : (
              <div>
                {slots.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                    予約可能な枠がありません。<br />別の日付を選択するか、お電話にてお問い合わせください。
                  </div>
                ) : (
                  <div className="slot-grid">
                    {slots.map(slot => (
                      <div
                        key={slot.slotId}
                        className={`slot-item ${slot.status === 'booked' ? 'booked' : ''}`}
                        onClick={() => slot.status === 'free' && setSelectedSlot(slot)}
                        style={{
                          borderColor: selectedSlot?.slotId === slot.slotId ? 'var(--color-primary)' : 'transparent',
                          background: selectedSlot?.slotId === slot.slotId ? '#e0f2fe' : undefined,
                          fontWeight: selectedSlot?.slotId === slot.slotId ? 'bold' : 'normal'
                        }}
                      >
                        {slot.startTime}
                        <br />
                        {slot.status === 'free' ? '◎' : '×'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s ease-in' }}>
                <h3>予約情報の入力</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    placeholder="お名前 (例: 山田 太郎)"
                    style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    placeholder="電話番号 (例: 090-1234-5678)"
                    style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleSubmit}>予約を確定する</button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: 'var(--color-primary)' }}>予約が完了しました</h2>
            <p>ご入力いただいた内容で予約を承りました。<br />当日はお気をつけてお越しください。</p>
            <button className="btn-primary" onClick={() => { setView('lp'); setSelectedSlot(null); setFormData({ name: '', phone: '' }); }}>TOPへ戻る</button>
          </div>
        )}

        {view === 'admin' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>管理画面</h2>
              <button onClick={() => setView('lp')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Exit</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '0.5rem' }} />
              <button className="btn-primary" onClick={fetchSlots}>更新</button>
              <button className="btn-primary" style={{ background: '#059669' }} onClick={handleAdminGenerateSlots}>この日の枠を自動生成</button>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', overflowX: 'scroll' }}>
              <h3>本日の予約状況 ({selectedDate})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>時間</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>状態</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? <tr><td colSpan={4} style={{ padding: '8px' }}>データなし (自動生成ボタンで作成できます)</td></tr> : slots.map(slot => (
                    <tr key={slot.slotId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{slot.startTime}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          background: slot.status === 'booked' ? '#fee2e2' : '#dcfce7',
                          color: slot.status === 'booked' ? '#991b1b' : '#166534',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                        }}>
                          {slot.status === 'booked' ? '予約済' : '空き'}
                        </span>
                      </td>
                      <td style={{ padding: '8px' }}>
                        {slot.status === 'booked' && <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>取消</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', marginTop: '3rem', color: '#64748b', fontSize: '0.8rem', paddingBottom: '1rem' }}>
        <p style={{ letterSpacing: '0.05em', fontWeight: '500' }}>
          Nippon Sport Science University Sport Cure Center
        </p>
      </footer>
    </div>
  )
}

export default App
