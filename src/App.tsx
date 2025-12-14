import { useState, useEffect, type FormEvent } from 'react'

type VisitType = '初診' | '再診';

interface Slot {
  slotId: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'free' | 'booked';
  visitType: VisitType;
  reservationId?: string;
}

// Helper to generate date options (Next 14 days)
const generateDateOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = `${d.getMonth() + 1}/${d.getDate()} (${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]})`;
    options.push({ value: dateStr, label });
  }
  return options;
};

function App() {
  const [view, setView] = useState<'lp' | 'home' | 'booking' | 'confirm' | 'success' | 'admin'>('lp');
  const [visitType, setVisitType] = useState<VisitType>('初診');
  const dateOptions = generateDateOptions();
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].value);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
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
      setSelectedSlot(null); // Reset selection on date change
    }
  }, [view, selectedDate]);

  const handleConfirm = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.phone || !formData.email) {
      alert('すべての項目を入力してください');
      return;
    }
    setView('confirm');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, // includes name, phone, email
          visitType,
          date: selectedDate,
          slotId: selectedSlot?.slotId,
          startTime: selectedSlot?.startTime,
          endTime: selectedSlot?.endTime || '12:00'
        })
      });
      if (res.ok) {
        setView('success');
      } else {
        alert('予約に失敗しました。枠が既に埋まっている可能性があります。');
        setView('booking');
      }
    } catch (e) {
      alert('ネットワークエラーが発生しました');
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

  // Logic to filter slots
  const filteredSlots = slots.filter(slot => {
    if (view === 'booking' && slot.visitType !== visitType) return false;

    const now = new Date();
    const selected = new Date(selectedDate);
    const isToday = selected.toDateString() === now.toDateString();

    if (isToday) {
      const [hours, minutes] = slot.startTime.split(':').map(Number);
      const slotTime = new Date(now);
      slotTime.setHours(hours, minutes, 0, 0);
      const diffMinutes = (slotTime.getTime() - now.getTime()) / (1000 * 60);
      return diffMinutes >= 15;
    }
    if (selected < new Date(new Date().toDateString())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px', paddingBottom: '120px', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <img src="/logo.jpg" alt="SCC Logo" style={{ maxWidth: '90%', width: '320px', marginBottom: '1.5rem', display: 'block', margin: '0 auto 1.5rem auto' }} />
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          padding: '1.5rem',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1), 0 10px 20px -5px rgba(0,0,0,0.04)',
          border: '1px solid rgba(255,255,255,0.5)'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', letterSpacing: '0.05em' }}>
            日本体育大学<br />スポーツキュアセンター<br />横浜・健志台接骨院
          </h1>
          <div style={{ width: '40px', height: '4px', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', margin: '1rem auto', borderRadius: '2px' }}></div>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>初診・再診専用 予約ページ</p>
        </div>
      </header>

      <main className="glass-panel" style={{ padding: '0', background: 'transparent', boxShadow: 'none', border: 'none' }}>

        {view === 'lp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid rgba(255,255,255,0.8)'
            }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '24px', background: '#0284c7', borderRadius: '4px' }}></span>
                ご利用について
              </h3>
              <p style={{ lineHeight: '1.8', margin: '1rem 0 0 0', color: '#334155' }}>
                本システムは、<span style={{ fontWeight: 'bold', color: '#0f172a' }}>初診・再診の患者様</span>を円滑にご案内するための専用予約ページです。
              </p>

              <div style={{ marginTop: '1.5rem', background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', border: '1px solid #fecaca', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <span>現在継続して治療中の方は、本システムからの予約は承っておりません。</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1.8rem',
                  borderRadius: '20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
                  transition: 'transform 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => { setVisitType('初診'); setView('booking'); }}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>初診の方はこちら</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 'bold' }}>First Visit</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>※ 当院での治療が初めての方</span>
                </div>
              </button>

              <button
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1.8rem',
                  borderRadius: '20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.4)',
                  transition: 'transform 0.2s'
                }}
                onClick={() => { setVisitType('再診'); setView('booking'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>再診の方はこちら</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 'bold' }}>Re-Visit</span>
                </div>
                <span style={{ fontSize: '0.9rem', color: '#e0f2fe' }}>
                  ※ 前回の来院から1ヶ月以上経過している方<br />
                  ※ 現在治療中の部位とは異なる場所の治療の方
                </span>
              </button>
            </div>
          </div>
        )}

        {view === 'booking' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <button onClick={() => setView('lp')} style={{ padding: '0', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <span>←</span>戻る
            </button>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '0.5rem' }}>{visitType}予約</h2>
            <p style={{ color: '#64748b', marginTop: 0, marginBottom: '2rem' }}>ご希望の日時を選択してください。</p>

            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>日付を選択</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    appearance: 'none',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    fontSize: '1.1rem',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {dateOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>▼</div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>読み込み中...</div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>予約可能な時間</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'normal', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{filteredSlots.length}枠</span>
                </h3>

                {filteredSlots.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>予約可能な枠がありません</p>
                    <p style={{ fontSize: '0.9rem' }}>別の日付を選択してください。</p>
                  </div>
                ) : (
                  <div className="slot-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                    {filteredSlots.map(slot => (
                      <button
                        key={slot.slotId}
                        disabled={slot.status === 'booked'}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          background: slot.status === 'booked' ? '#f1f5f9' : (selectedSlot?.slotId === slot.slotId ? '#0f172a' : '#ffffff'),
                          color: slot.status === 'booked' ? '#cbd5e1' : (selectedSlot?.slotId === slot.slotId ? '#ffffff' : '#0f172a'),
                          border: slot.status === 'booked' ? '1px solid #f1f5f9' : (selectedSlot?.slotId === slot.slotId ? '1px solid #0f172a' : '1px solid #e2e8f0'),
                          borderRadius: '12px',
                          padding: '1rem 0.5rem',
                          cursor: slot.status === 'booked' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: selectedSlot?.slotId === slot.slotId ? '0 10px 15px -3px rgba(15, 23, 42, 0.2)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{slot.startTime}</span>
                        <span style={{ fontSize: '0.75rem', opacity: slot.status === 'booked' ? 1 : 0.8 }}>
                          {slot.status === 'booked' ? 'FULL' : 'OPEN'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s ease-in', background: '#ffffff', padding: '2rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.2rem', color: '#0f172a', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>お客様情報の入力</h3>
                <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>お名前</label>
                    <input
                      required
                      placeholder="例: 山田 太郎"
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc' }}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>電話番号</label>
                    <input
                      required
                      placeholder="例: 090-1234-5678"
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc' }}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>メールアドレス</label>
                    <input
                      required
                      type="email"
                      placeholder="予約完了メールをお送りします"
                      style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc' }}
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 'bold', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)' }}>
                    確認画面へ進む
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {view === 'confirm' && selectedSlot && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <button onClick={() => setView('booking')} style={{ padding: '0', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <span>←</span>修正する
            </button>
            <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center' }}>内容の確認</h2>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>予約日時</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedDate} {selectedSlot.startTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>種別</span>
                  <span style={{ fontWeight: 'bold' }}>{visitType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>お名前</span>
                  <span style={{ fontWeight: 'bold' }}>{formData.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>電話番号</span>
                  <span style={{ fontWeight: 'bold' }}>{formData.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>メールアドレス</span>
                  <span style={{ fontWeight: 'bold' }}>{formData.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '16px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: loading ? '#94a3b8' : '#0f172a',
                color: 'white',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.4)'
              }}
            >
              {loading ? '処理中...' : 'この内容で予約を確定する'}
            </button>
          </div>
        )}

        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
              <span style={{ fontSize: '3rem', color: '#166534' }}>✓</span>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', marginBottom: '1rem' }}>予約完了</h2>
            <p style={{ color: '#64748b', lineHeight: '1.8', marginBottom: '3rem' }}>
              ご予約ありがとうございます。<br />
              確認メールをお送りしましたのでご確認ください。<br />
              <br />
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>日時: {selectedDate} {selectedSlot?.startTime}</span>
            </p>
            <button
              onClick={() => { setView('lp'); setSelectedSlot(null); setFormData({ name: '', phone: '', email: '' }); }}
              style={{ padding: '1rem 3rem', borderRadius: '99px', background: '#f1f5f9', color: '#0f172a', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              トップへ戻る
            </button>
          </div>
        )}

        {view === 'admin' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>管理画面</h2>
              <button onClick={() => setView('lp')} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>ログアウト</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {dateOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={fetchSlots}>更新</button>
              <button className="btn-primary" style={{ background: '#059669', marginLeft: 'auto' }} onClick={handleAdminGenerateSlots}>枠を自動生成</button>
            </div>

            <div style={{ overflowX: 'scroll' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>時間</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>種別</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>状態</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>データがありません</td></tr> : slots.map(slot => (
                    <tr key={slot.slotId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{slot.startTime}</td>
                      <td style={{ padding: '12px' }}><span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#f1f5f9', borderRadius: '99px', color: '#64748b' }}>{slot.visitType}</span></td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: slot.status === 'booked' ? '#fee2e2' : '#dcfce7',
                          color: slot.status === 'booked' ? '#991b1b' : '#166534',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'
                        }}>
                          {slot.status === 'booked' ? '予約済' : '空き'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {slot.status === 'booked' && (
                          <button
                            style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={async () => {
                              if (!confirm('この予約を取り消しますか？')) return;
                              setLoading(true);
                              try {
                                const res = await fetch('/api/cancel', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    slotId: slot.slotId,
                                    reservationId: slot.reservationId,
                                    date: selectedDate
                                  })
                                });
                                if (res.ok) {
                                  alert('取消しました');
                                  fetchSlots();
                                } else {
                                  alert('取消失敗');
                                }
                              } catch (e) { alert('Error'); }
                              setLoading(false);
                            }}
                          >
                            × 取消
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
