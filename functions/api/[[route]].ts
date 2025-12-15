import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { Env, Reservation, Slot } from '../types';
import { SheetsService } from '../services/sheets';
import { CalendarService } from '../services/calendar';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/slots', async (c) => {
    const date = c.req.query('date');
    if (!date) return c.json({ error: 'Date required' }, 400);

    const sheets = new SheetsService(c.env);
    const slots = await sheets.getSlots(date);
    return c.json(slots);
});

app.post('/api/admin/slots', async (c) => {
    const body = await c.req.json();
    const { date, days = 1 } = body; // Support bulk generation
    if (!date) return c.json({ error: 'Date required' }, 400);

    const sheets = new SheetsService(c.env);
    const newSlots: Slot[] = [];
    const skippedDates: string[] = [];

    const startDate = new Date(date);

    for (let i = 0; i < days; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + i);
        const dateStr = targetDate.toISOString().split('T')[0];

        // Check if slots already exist for this date
        const existing = await sheets.getSlots(dateStr);
        if (existing.length > 0) {
            skippedDates.push(dateStr);
            continue;
        }

        // Generate slots
        const day = targetDate.getDay();
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

        let current = new Date(`${dateStr}T00:00:00`);
        current.setHours(startHour, startMin, 0, 0);

        const end = new Date(`${dateStr}T00:00:00`);
        end.setHours(endHour, endMin, 0, 0);

        while (current < end) {
            const startTime = current.toTimeString().slice(0, 5);
            current.setMinutes(current.getMinutes() + 30);
            const endTime = current.toTimeString().slice(0, 5);

            const slot: Slot = {
                slotId: crypto.randomUUID(),
                date: dateStr,
                startTime,
                endTime,
                visitType: 'shared',
                status: 'free'
            };

            newSlots.push(slot);
        }
    }

    if (newSlots.length > 0) {
        await sheets.createSlots(newSlots);
    }

    return c.json({
        success: true,
        count: newSlots.length,
        generatedDays: days,
        skippedDates
    });
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
    // If it's an Admin Block (name === '受付不可'), SKIP Calendar and Email
    if (name === '受付不可') {
        // Clear email so GAS doesn't send anything
        reservation.email = '';
        // Skip Calendar creation
        console.log('[BOOKING] Admin Block: Skipping Calendar and Email');
    } else {
        try {
            const calendarId = await calendar.createEvent(reservation);
            if (calendarId) eventId = calendarId;
        } catch (e) {
            console.error('Calendar Error', e);
            await sheets.logAction('system', 'calendar_error', { error: String(e), reservationId });
        }
    }

    // 5. Send Email (Mock/Log)
    // Note: Actual email is sent by GAS trigger on Google Sheets
    if (reservation.email) {
        console.log(`[EMAIL] Reservation recorded for ${reservation.email}`);
        await sheets.logAction('system', 'reservation_recorded', { reservationId, email: reservation.email });
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

    // 1. Get Slot to find rowIndex
    const date = body.date;
    if (!date) return c.json({ error: 'Date required' }, 400);

    const slots = await sheets.getSlots(date);
    const slot = slots.find(s => s.slotId === slotId);

    if (!slot) return c.json({ error: 'Slot not found' }, 404);

    // 2. Update Slot to Free
    if (slot.rowIndex) {
        await sheets.updateSlotStatus(slot.rowIndex, 'free', '');
    }

    // 3. Update Reservation Status
    await sheets.updateReservationStatus(reservationId, 'cancelled');

    // 4. Calendar - Delete Event without sending updates
    // Fetch reservation to get googleEventId
    const reservation = await sheets.getReservation(reservationId);
    if (reservation && reservation.googleEventId) {
        const calendar = new CalendarService(c.env);
        // Pass 'none' to suppress email to patient
        await calendar.deleteEvent(reservation.googleEventId, 'none');
    }

    await sheets.logAction('admin', 'cancel', { slotId, reservationId });

    return c.json({ success: true });
});

export const onRequest = handle(app);
