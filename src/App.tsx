import { useState, useEffect, type FormEvent } from 'react'

type VisitType = '初診' | '再診';
interface Slot {
  slotId: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'free' | 'booked';
  visitType: VisitType; // Added
  reservationId?: string;
}

function App() {
  const [view, setView] = useState<'lp' | 'home' | 'booking' | 'confirm' | 'success' | 'admin'>('lp');
  const [visitType, setVisitType] = useState<VisitType>('初診');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
    }
  }, [view, selectedDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
          endTime: selectedSlot?.endTime || '12:00'
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

  // Logic to filter slots
  const filteredSlots = slots.filter(slot => {
    // 1. Filter by Visit Type
    if (view === 'booking' && slot.visitType !== visitType) return false;

    // 2. Filter by Time (Realtime restriction: > 15 mins from now)
    const now = new Date();
    // Check if selectedDate is today
    const selected = new Date(selectedDate);
    const isToday = selected.toDateString() === now.toDateString();

    if (isToday) {
      const [hours, minutes] = slot.startTime.split(':').map(Number);
      const slotTime = new Date(now);
      slotTime.setHours(hours, minutes, 0, 0);

      const diffMinutes = (slotTime.getTime() - now.getTime()) / (1000 * 60);
      return diffMinutes >= 15;
    }
    // If past date? Already filtered by API usually, but let's assume we allow future only.
    if (selected < new Date(new Date().toDateString())) return false; // Past dates

    return true;
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', paddingBottom: '100px' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {/* ①ロゴ画像を大きく (maxWidth: 200px -> 280px) */}
        <img src="/logo.jpg" alt="SCC Logo" style={{ maxWidth: '280px', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem auto' }} />
        <h1 style={{
          fontSize: '1.4rem',
          color: 'var(--color-primary)',
          background: 'rgba(255,255,255,0.95)',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          lineHeight: '1.5'
        }}>
          日本体育大学<br />スポーツキュアセンター<br />横浜・健志台接骨院<br />
          {/* ②タイトル変更 */}
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginTop: '0.5rem' }}>初診・再診専用 予約ページ</span>
        </h1>
      </header>

      <main className="glass-panel">

        {/* Landing Page with Explanation */}
        {view === 'lp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', borderLeft: '6px solid var(--color-primary)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--color-primary)', fontSize: '1.1rem' }}>ご利用について</h3>
              <p style={{ lineHeight: '1.8', margin: 0 }}>
                本システムは、<span style={{ fontWeight: 'bold' }}>初診・再診の患者様</span>を円滑にご案内するための専用予約ページです。<br /><br />
                {/* ③文言変更 */}
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                  現在継続して治療中の方は、本システムからの予約は承っておりません。
                </span>
                <br /><span style={{ fontSize: '0.9rem', color: '#666' }}>窓口またはお電話にてご予約ください。</span>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn-primary"
                style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}
                onClick={() => { setVisitType('初診'); setView('booking'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>初診の方はこちら</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>First Visit</span>
                </div>
                <span style={{ fontSize: '0.9rem', opacity: 0.95, fontWeight: 'normal' }}>
                  {/* ④当院に変更 */}
                  ※ 当院での治療が初めての方
                </span>
              </button>

              <button
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}
                onClick={() => { setVisitType('再診'); setView('booking'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>再診の方はこちら</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>Re-Visit</span>
                </div>
                <span style={{ fontSize: '0.9rem', opacity: 0.95, fontWeight: 'normal' }}>
                  ※ 前回の来院から1ヶ月以上経過している方<br />
                  ※ 現在治療中の部位とは異なる場所の治療をご希望の方
                </span>
              </button>
            </div>
          </div>
        )}

        {view === 'home' && (
          <div />
        )}

        {view === 'booking' && (
          <div>
            <button onClick={() => setView('lp')} style={{ marginBottom: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>← 戻る</button>
            <h2 style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>{visitType} 予約</h2>

            {/* ⑤初診・再診の説明をここにも表示 */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#475569' }}>
              {visitType === '初診' ? (
                <p style={{ margin: 0 }}><strong>【初診】</strong>当院での治療が初めての方が対象です。<br />問診・検査等にお時間を頂くため、余裕を持ってお越しください。</p>
              ) : (
                <p style={{ margin: 0 }}><strong>【再診】</strong>前回の来院から1ヶ月以上経過している方、または新しい部位の治療をご希望の方が対象です。</p>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>日付を選択</label>
              {/* ⑦日付選択のカード修正: padding/margin調整 */}
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  width: '100%',
                  fontSize: '1.1rem',
                  background: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loading ? <div className="shimmer" style={{ height: '100px', borderRadius: '8px' }}></div> : (
              <div>
                {/* ⑥時間の選択をわかりやすくするための見出し */}
                <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem' }}>予約可能な時間 ({filteredSlots.length}件)</h3>

                {filteredSlots.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                    予約可能な枠がありません。<br />
                    {/* ⑧補足 */}
                    <small>※直近15分以内の枠は表示されません。</small><br />
                    別の日付を選択するか、お電話にてお問い合わせください。
                  </div>
                ) : (
                  <div className="slot-grid">
                    {/* ⑨予約済みは×と示す (status='booked' なら ×) */}
                    {filteredSlots.map(slot => (
                      <div
                        key={slot.slotId}
                        className={`slot-item ${slot.status === 'booked' ? 'booked' : ''}`}
                        onClick={() => slot.status === 'free' && setSelectedSlot(slot)}
                        style={{
                          borderColor: selectedSlot?.slotId === slot.slotId ? 'var(--color-primary)' : 'transparent',
                          background: selectedSlot?.slotId === slot.slotId ? '#e0f2fe' : undefined,
                          fontWeight: selectedSlot?.slotId === slot.slotId ? 'bold' : 'normal',
                          // ⑥同じ時間が2つ... は filteredSlots で解消済み
                        }}
                      >
                        <div style={{ fontSize: '1.2rem' }}>{slot.startTime}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                          {slot.status === 'free' ? <span style={{ color: 'green' }}>◎ 予約可</span> : <span style={{ color: 'red' }}>× 受付終了</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s ease-in', background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>予約確定へ</h3>
                <p style={{ marginBottom: '1.5rem' }}>
                  <strong>日時:</strong> {selectedDate} {selectedSlot.startTime}<br />
                  <strong>区分:</strong> {visitType}
                </p>
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
                  <input
                    type="email"
                    placeholder="メールアドレス (予約完了メールをお送りします)"
                    style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
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
            <button className="btn-primary" onClick={() => { setView('lp'); setSelectedSlot(null); setFormData({ name: '', phone: '', email: '' }); }}>TOPへ戻る</button>
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
              {/* Admin shows ALL slots, maybe filter by type too? No, admin sees all. */}
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>時間</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>種別</th>{/* Added Type column for Admin */}
                    <th style={{ padding: '8px', textAlign: 'left' }}>状態</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 ? <tr><td colSpan={5} style={{ padding: '8px' }}>データなし (自動生成ボタンで作成できます)</td></tr> : slots.map(slot => (
                    <tr key={slot.slotId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{slot.startTime}</td>
                      <td style={{ padding: '8px' }}><span style={{ fontSize: '0.8rem', padding: '2px 4px', background: '#f1f5f9', borderRadius: '4px' }}>{slot.visitType}</span></td>
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
                        {slot.status === 'booked' && (
                          <button
                            style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                            onClick={async () => {
                              if (!confirm('この予約を取り消しますか？\n(Googleカレンダーからは自動削除されません、手動確認してください)')) return;
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
                            取消
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

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.8' }}>
        <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '1rem' }}>お問い合わせ先</h4>
          <p style={{ margin: 0, fontWeight: 'bold' }}>日本体育大学<br />スポーツキュアセンター横浜・健志台接骨院</p>
          <p style={{ margin: '0.5rem 0' }}>
            TEL：<a href="tel:0454796262" style={{ color: 'inherit', textDecoration: 'none' }}>045-479-6262</a><br />
            FAX：045-479-5353
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
            <a href="https://page.line.me/187qiivk?oat_content=url&openQrModal=true" target="_blank" rel="noreferrer" style={{ color: '#00b900', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.2rem' }}>LINE</span> 公式アカウント
            </a>
            <a href="https://www.instagram.com/nssu_sport_cure_center/?igshid=YTQwZjQ0NmI0OA%3D%3D&utm_source=qr" target="_blank" rel="noreferrer" style={{ color: '#E1306C', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.2rem' }}>Instagram</span>
            </a>
          </div>
        </div>
        <p style={{ letterSpacing: '0.05em', fontWeight: '500', opacity: 0.8 }}>
          &copy; 2025 Nippon Sport Science University Sport Cure Center
        </p>
      </footer>
    </div>
  )
}

export default App
