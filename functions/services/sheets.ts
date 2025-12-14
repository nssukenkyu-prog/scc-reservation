import { getAccessToken } from '../utils/google';
import { Env, Slot, Reservation, Patient, VisitType } from '../types';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getClient(env: Env) {
    const token = await getAccessToken(
        {
            client_email: env.GOOGLE_CLIENT_EMAIL,
            private_key: env.GOOGLE_PRIVATE_KEY,
            project_id: env.GOOGLE_PROJECT_ID,
        },
        SCOPES
    );
    return token;
}

export class SheetsService {
    private env: Env;
    private token: string | null = null;

    constructor(env: Env) {
        this.env = env;
    }

    private async getToken() {
        if (!this.token) {
            this.token = await getClient(this.env);
        }
        return this.token;
    }

    async getSlots(date: string): Promise<Slot[]> {
        const token = await this.getToken();
        const range = 'Slots!A2:G'; // Assumes header in row 1
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SPREADSHEET_ID}/values/${range}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { values: string[][] };

        if (!data.values) return [];

        return data.values
            .map((row, index) => ({
                slotId: row[0],
                date: row[1],
                startTime: row[2],
                endTime: row[3],
                visitType: row[4] as VisitType,
                status: row[5] as 'free' | 'booked',
                reservationId: row[6],
                rowIndex: index + 2, // 1-based index, +header
            }))
            .filter((s) => s.date === date);
    }

    async updateSlotStatus(rowIndex: number, status: 'free' | 'booked', reservationId: string) {
        const token = await this.getToken();
        const range = `Slots!F${rowIndex}:G${rowIndex}`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

        await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                values: [[status, reservationId]],
            }),
        });
    }

    async createReservation(resv: Reservation) {
        const token = await this.getToken();
        const range = 'Reservations!A:A'; // Append
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

        const values = [
            resv.reservationId,
            resv.name,
            resv.phone,
            resv.visitType,
            resv.date,
            resv.startTime,
            resv.endTime,
            resv.lineUserId || '',
            resv.googleEventId || '',
            resv.status,
            resv.createdAt,
        ];

        await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [values] }),
        });
    }

    async logAction(actor: string, action: string, payload: any) {
        const token = await this.getToken();
        const range = 'Logs!A:A';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

        const values = [
            new Date().toISOString(),
            actor,
            action,
            JSON.stringify(payload),
        ];

        await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [values] }),
        });
    }
}
