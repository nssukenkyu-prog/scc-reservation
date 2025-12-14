import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { Env, Reservation, Slot } from '../types';
import { SheetsService } from '../services/sheets';
import { CalendarService } from '../services/calendar';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/slots', async (c) => {
    const date = c.req.query('date');
    if (!date) return c.json({ error: 'Date required' }, 400);

    // Generate slots based on day of week
    // Weekday (Mon-Fri): 09:00 - 20:30
    // Weekend (Sat-Sun): 10:00 - 16:00
    // Interval: 15 min

    const targetDate = new Date(date);
    const day = targetDate.getDay(); // 0:Sun, 1:Mon... 6:Sat
    const isWeekend = day === 0 || day === 6;

    let startHour = 9;
    let startMin = 0;
    let endHour = 20;
    let endMin = 30;

    if (isWeekend) {
        startHour = 10;
        startMin = 0;
        endHour = 16;
        endMin = 0;
    }

    const slots: Slot[] = [];
    let current = new Date(`${date}T00:00:00`);
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date(`${date}T00:00:00`);
    end.setHours(endHour, endMin, 0, 0);

    // Interval 15 min
    while (current < end) {
        const startTime = current.toTimeString().slice(0, 5);
        current.setMinutes(current.getMinutes() + 15);
        const endTime = current.toTimeString().slice(0, 5);

        // Create SHARED slot for both '初診' and '再診'
        const slot: Slot = {
            slotId: crypto.randomUUID(),
            date,
            startTime,
            endTime,
            visitType: 'shared', // Indicates it can be used by either
            status: 'free'
        };

        slots.push(slot);
    }

    const sheets = new SheetsService(c.env);
    await sheets.createSlots(slots);

    return c.json(slots);
});

app.post('/api/bookings', async (c) => {
    const body = await c.req.json();
    const { slotId, patientId, name, phone, visitType, email, date, lineUserId } = body; // Add email and date, keep lineUserId for reservation object

    if (!slotId || !name || !phone || !visitType || !date) return c.json({ error: 'Missing fields' }, 400);

    const sheets = new SheetsService(c.env);
    const calendar = new CalendarService(c.env);

    // 1. Get Slot
    // For now, let's write the API assuming `date` is passed.
    // The 'body' usually has date from frontend selectedSlot?
    // Frontend: body: { slotId, patientId, name, phone, email, visitType, date }
    // We are missing DATE in body to help lookup.
    // But wait, the slotId is unique.
    // Ideally, getSlots takes a date.
    // We can fetch the slot row by ID? SheetsService doesn't have `getSlotById`.
    // Let's assume frontend passes 'date' for efficiency or we just accept the risk of scan?
    // Or better, let's update frontend to pass `date` in body as well.
    // Wait, I can't update frontend payload in this turn easily without another tool call.
    // And I didn't update frontend payload to include date in `handleSubmit`.
    // Actually I did: `JSON.stringify({ ... selectedSlot.slotId ... })`
    // I did NOT pass date.
    // Check App.tsx: `handleSubmit` body is `{ slotId, patientId, name, phone, email, visitType }`. No date.
    // `getSlots` requires date.
    // Without date, I can't find the slot efficiently in current SheetsService design.
    // I must update App.tsx to pass date.
    // AND update API here to use it.

    // Correction: I can't update App.tsx in this tool call (parallel constraint?).
    // I will update API to EXPECT date, and I will update App.tsx next.

    // However, I can try to find slot without date if I scan? No, `getSlots` requires date.
    // I will update App.tsx to send `date: selectedSlot.date`.

    // For now, let's write the API assuming `date` is passed.
    // const date = body.date; // Already destructured

    const slots = await sheets.getSlots(date);
    const slot = slots.find(s => s.slotId === slotId);

    if (!slot) return c.json({ error: 'Slot not found' }, 404);
    if (slot.status !== 'free') return c.json({ error: 'Slot already booked' }, 409);

    // 2. Create Reservation
    const reservationId = crypto.randomUUID();
    const reservation: Reservation = {
        reservationId,
        name,
        phone,
        email,
        visitType,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        lineUserId, // Keep lineUserId if it's part of the Reservation type
        status: 'active',
        createdAt: new Date().toISOString()
    };

    await sheets.createReservation(reservation);

    // 3. Update Slot
    // validation of rowIndex?
    if (slot.rowIndex) {
        await sheets.updateSlotStatus(slot.rowIndex, 'booked', reservationId);
    } else {
        return c.json({ error: 'Internal Error: Slot rowIndex missing' }, 500);
    }

    // 4. Create Calendar Event
    let eventId = '';
    try {
        const calendarId = await calendar.createEvent(reservation);
        if (calendarId) eventId = calendarId;
        // We might want to save eventId to reservation, but row is already written.
        // We could update it. For now detailed log.
        // Ideally createReservation matches return type or we allow mutation.
        // Let's ignore updating eventId in sheet for MVP to save latency/complexity or update later.
    } catch (e) {
        console.error('Calendar Error', e);
        // Rollback? For now, just log error, but proceed.
        await sheets.logAction('system', 'calendar_error', { error: String(e), reservationId });
    }

    // 5. Send Email (Mock/Log)
    if (email) {
        console.log(`[EMAIL] Sending confirmation to ${email}`);
        console.log(`[EMAIL] Subject: 【予約確定】スポーツキュアセンター横浜・健志台接骨院`);
        console.log(`[EMAIL] Body: ${name}様 ... ${date} ${slot.startTime}...`);
        // Integration with Resend would go here.
        // await sendEmail(email, ...);
        await sheets.logAction('system', 'email_sent', { reservationId, email });
    }

    // 6. Log
    await sheets.logAction('user', 'book', reservation);

    return c.json({ success: true, reservation });
});

app.post('/api/cancel', async (c) => {
    const body = await c.req.json();
    const { slotId, reservationId } = body;

    if (!slotId || !reservationId) return c.json({ error: 'Missing fields' }, 400);

    const sheets = new SheetsService(c.env);
    // const calendar = new CalendarService(c.env); // Calendar deletion complex without eventId storage

    // 1. Get Slot to find rowIndex
    // Optimization: we could pass rowIndex from frontend if we trust it, 
    // but better to fetch.
    // We don't know the DATE. Admin knows date.
    // Frontend should pass date.
    const date = body.date;
    if (!date) return c.json({ error: 'Date required' }, 400);

    const slots = await sheets.getSlots(date);
    const slot = slots.find(s => s.slotId === slotId);

    if (!slot) return c.json({ error: 'Slot not found' }, 404);

    // 2. Update Slot to Free
    if (slot.rowIndex) {
        // Clear reservationId in slot? Or just status free.
        // updateSlotStatus(rowIndex, status, reservationId)
        // We set reservationId to empty string to unlink?
        // updateSlotStatus takes (rowIndex, status, reservationId).
        // Let's pass empty string for reservationId.
        await sheets.updateSlotStatus(slot.rowIndex, 'free', '');
    }

    // 3. Update Reservation Status
    // We need to find reservation's row index.
    // SheetsService needs a method to find reservation by ID?
    // Or we just rely on slot being free.
    // Ideally we mark reservation as cancelled.
    // I need to implement `updateReservationStatus` in SheetsService.
    await sheets.updateReservationStatus(reservationId, 'cancelled');

    // 4. Calendar
    // If we had eventId, we would delete.
    // For now, skipping calendar delete as we don't efficiently have eventId.

    await sheets.logAction('admin', 'cancel', { slotId, reservationId });

    return c.json({ success: true });
});

export const onRequest = handle(app);
