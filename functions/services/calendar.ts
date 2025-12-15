import { getAccessToken } from '../utils/google';
import { Env, Reservation } from '../types';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export class CalendarService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    private async getToken() {
        return getAccessToken(
            {
                client_email: this.env.GOOGLE_CLIENT_EMAIL,
                private_key: this.env.GOOGLE_PRIVATE_KEY,
                project_id: this.env.GOOGLE_PROJECT_ID,
            },
            SCOPES
        );
    }

    async createEvent(resv: Reservation): Promise<string | null> {
        const token = await this.getToken();
        const calendarId = this.env.CALENDAR_ID;

        // Format Date: YYYY-MM-DDTHH:mm:00+09:00
        const startDateTime = `${resv.date}T${resv.startTime}:00+09:00`;
        const endDateTime = `${resv.date}T${resv.endTime}:00+09:00`;

        const event: any = {
            summary: `【${resv.visitType}】${resv.name} 様`,
            description: `電話番号: ${resv.phone}\n来院区分: ${resv.visitType}\n予約ID: ${resv.reservationId}`,
            start: { dateTime: startDateTime },
            end: { dateTime: endDateTime },
        };

        // Set Color ID
        // 11: Tomato (Red) - First Visit
        // 9: Blueberry (Navy/Dark Blue) - Re-visit
        // Default: 1 (Lavender)
        if (resv.visitType === '初診') {
            event.colorId = '11';
        } else if (resv.visitType === '再診') {
            event.colorId = '9';
        }

        // Add attendee if email exists (Triggers Google's invitation email)
        if (resv.email) {
            event.attendees = [{ email: resv.email }];
        }

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Calendar Create Error:', err);
            return null;
        }

        const data = await response.json() as { id: string };
        return data.id;
    }

    async deleteEvent(eventId: string, sendUpdates: 'all' | 'none' | 'externalOnly' = 'none') {
        const token = await this.getToken();
        const calendarId = this.env.CALENDAR_ID;
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=${sendUpdates}`;

        await fetch(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    }
}
