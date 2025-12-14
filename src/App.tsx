import { useState, useEffect, type FormEvent } from 'react'

type VisitType = '初診' | '再診' | 'shared';

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
      const res = await fetch(`/api/slots?date=${selectedDate}&t=${Date.now()}`);
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
    // 1. Filter by Visit Type (Accept 'shared' slots for everyone)
    if (view === 'booking' && slot.visitType !== 'shared' && slot.visitType !== visitType) return false;

    // 2. Filter by Time (Realtime restriction: > 15 mins from now)
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn Up 0.6s ease' }}>

            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '24px', background: 'linear-gradient(to bottom, #3b82f6, #06b6d4)', borderRadius: '4px' }}></span>
                ご利用について
              </h3>
              <p style={{ lineHeight: '1.8', margin: '1rem 0 0 0', color: '#334155', fontSize: '0.95rem' }}>
                本システムは、<span style={{ fontWeight: 'bold', color: '#0f172a' }}>初診・再診の患者様</span>を円滑にご案内するための専用予約ページです。
              </p>

              <div style={{ marginTop: '1.5rem', background: '#eff6ff', color: '#1e40af', padding: '1rem', borderRadius: '16px', fontSize: '0.95rem', fontWeight: 'bold', border: '1px solid #dbeafe', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                <span>現在継続して治療中の方は、予約は承っておりません。</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1.8rem',
                  borderRadius: '24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 15px 30px -5px rgba(59, 130, 246, 0.4)',
                  transition: 'transform 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => { setVisitType('初診'); setView('booking'); }}
                className="hover-scale"
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.05em' }}>初診の方はこちら</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>FIRST VISIT</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#bfdbfe', display: 'block', marginTop: '4px' }}>※ 当院での治療が初めての方</span>
                </div>
              </button>

              <button
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #67e8f9 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1.8rem',
                  borderRadius: '24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 15px 30px -5px rgba(14, 165, 233, 0.4)',
                  transition: 'transform 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => { setVisitType('再診'); setView('booking'); }}
                className="hover-scale"
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.05em' }}>再診の方はこちら</span>
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '6px 16px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>RE-VISIT</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#f0f9ff', display: 'block', marginTop: '4px' }}>
                    ※ 前回の来院から1ヶ月以上経過している方<br />
                    ※ 現在治療中の部位とは異なる場所の治療の方
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {view === 'booking' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <button onClick={() => setView('lp')} style={{ padding: '0.8rem 1.2rem', background: 'white', borderRadius: '99px', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span>←</span>戻る
            </button>
            <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: '800' }}>{visitType}予約</h2>
            <p style={{ color: '#64748b', marginTop: 0, marginBottom: '2rem' }}>ご希望の日時を選択してください。</p>

            <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.05)', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.5)' }}>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>日付</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      appearance: 'none',
                      padding: '1.2rem',
                      borderRadius: '16px',
                      border: '2px solid #e2e8f0',
                      width: '100%',
                      fontSize: '1.1rem',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  >
                    {dateOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>▼</div>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>タイムテーブルを読み込み中...</div>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>時間</label>

                  {filteredSlots.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>予約可能な枠がありません</p>
                      <p style={{ fontSize: '0.9rem' }}>別の日付を選択してください。</p>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedSlot?.slotId || ''}
                        onChange={(e) => {
                          const slot = filteredSlots.find(s => s.slotId === e.target.value);
                          setSelectedSlot(slot || null);
                        }}
                        style={{
                          appearance: 'none',
                          padding: '1.2rem',
                          borderRadius: '16px',
                          border: '2px solid #3b82f6',
                          width: '100%',
                          fontSize: '1.1rem',
                          background: '#eff6ff',
                          color: '#1e3a8a',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="" disabled>時間を選択してください</option>
                        {filteredSlots.map(slot => (
                          <option key={slot.slotId} value={slot.slotId} disabled={slot.status === 'booked'}>
                            {slot.startTime} {slot.status === 'booked' ? '(満席)' : '◎ 予約可'}
                          </option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#3b82f6', fontWeight: 'bold' }}>▼</div>
                    </div>
                  )}
                  {filteredSlots.length > 0 && <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.8rem', textAlign: 'right' }}>※現在時刻から15分以内の枠は選択できません</p>}
                </div>
              )}
            </div>

            {selectedSlot && (
              <div style={{
                marginTop: '1.5rem', // Match padding of parent
                animation: 'slideUp 0.4s ease-out',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '2rem',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.8)',
                // Ensure same width behavior as the Date/Time card above
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '1.4rem', color: '#0f172a', marginBottom: '2rem', textAlign: 'center' }}>情報をご入力ください。</h3>
                <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>お名前</label>
                    <input
                      required
                      placeholder="例: 山田 太郎"
                      style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>電話番号</label>
                    <input
                      required
                      placeholder="例: 090-1234-5678"
                      style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>メールアドレス</label>
                    <input
                      required
                      type="email"
                      placeholder="example@email.com"
                      style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: '2px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary hover-scale" style={{ marginTop: '1.5rem', padding: '1.4rem', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 'bold', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.4)', transition: 'transform 0.1s' }}>
                    確認画面へ進む →
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

            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>予約日時</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>{selectedDate} {selectedSlot.startTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>種別</span>
                  <span style={{ fontWeight: 'bold', color: '#0284c7' }}>{visitType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>お名前</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formData.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span style={{ color: '#64748b' }}>電話番号</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formData.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>メールアドレス</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', wordBreak: 'break-all', maxWidth: '60%', textAlign: 'right' }}>{formData.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '20px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: loading ? '#94a3b8' : '#0f172a',
                color: 'white',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.4)',
                transform: loading ? 'none' : 'translateY(0)',
                transition: 'all 0.2s',
                maxWidth: '500px',
                margin: '0 auto',
                display: 'block'
              }}
            >
              {loading ? '処理中...' : 'この内容で予約を確定する'}
            </button>
          </div>
        )}

        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ width: '100px', height: '100px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 20px 25px -5px rgba(22, 101, 52, 0.2)' }}>
              <span style={{ fontSize: '4rem', color: '#166534' }}>✓</span>
            </div>
            <h2 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '1rem', fontWeight: '800' }}>予約完了</h2>
            <p style={{ color: '#64748b', lineHeight: '1.8', marginBottom: '3rem' }}>
              ご予約ありがとうございます。<br />
              確認メールをお送りしました。<br />
              <br />
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{selectedDate} {selectedSlot?.startTime} ({visitType})</span>
            </p>
            <button
              onClick={() => { setView('lp'); setSelectedSlot(null); setFormData({ name: '', phone: '', email: '' }); }}
              style={{ padding: '1.2rem 4rem', borderRadius: '99px', background: 'white', color: '#0f172a', border: '2px solid #e2e8f0', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              トップへ戻る
            </button>
          </div>
        )}

        {view === 'admin' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>管理画面</h2>
              <button onClick={() => setView('lp')} style={{ padding: '0.6rem 1.2rem', background: '#f1f5f9', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>ログアウト</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              >
                {dateOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={fetchSlots} style={{ padding: '1rem 2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>更新</button>
              <button style={{ padding: '1rem 2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', marginLeft: 'auto', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleAdminGenerateSlots}>枠自動生成</button>
            </div>

            <div style={{ overflowX: 'scroll' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>時間</th>
                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>種別</th>
                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>状態</th>
                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>データがありません</td></tr> : slots.map(slot => (
                    <tr key={slot.slotId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>{slot.startTime}</td>
                      <td style={{ padding: '16px' }}><span style={{ fontSize: '0.8rem', padding: '4px 12px', background: '#f1f5f9', borderRadius: '99px', color: '#64748b', fontWeight: 'bold' }}>{slot.visitType}</span></td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: slot.status === 'booked' ? '#fee2e2' : '#dcfce7',
                          color: slot.status === 'booked' ? '#991b1b' : '#166534',
                          padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold'
                        }}>
                          {slot.status === 'booked' ? '予約済' : '空き'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {slot.status === 'booked' ? (
                          <button
                            disabled={loading}
                            style={{ background: loading ? '#94a3b8' : '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                            onClick={async () => {
                              if (!confirm('この予約枠を削除(キャンセル)しますか？')) return;
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
                                if (res.ok) fetchSlots();
                                else alert('失敗');
                              } catch (e) { alert('Error'); }
                              setLoading(false);
                            }}
                          >
                            × 削除
                          </button>
                        ) : (
                          <button
                            disabled={loading}
                            style={{ background: loading ? '#94a3b8' : '#64748b', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await fetch('/api/bookings', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    name: '受付不可',
                                    phone: '000-0000-0000',
                                    email: 'admin@system.local',
                                    visitType: slot.visitType,
                                    date: selectedDate,
                                    slotId: slot.slotId,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime || '12:00'
                                  })
                                });
                                if (res.ok) fetchSlots();
                                else {
                                  const dt = await res.json();
                                  alert('失敗: ' + (dt.error || 'Unknown'));
                                }
                              } catch (e) { alert('Error'); }
                              setLoading(false);
                            }}
                          >
                            × 枠削除
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
