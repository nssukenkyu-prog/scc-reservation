export interface Env {
    GOOGLE_PRIVATE_KEY: string;
    GOOGLE_CLIENT_EMAIL: string;
    GOOGLE_PROJECT_ID: string;
    SPREADSHEET_ID: string;
    CALENDAR_ID: string;
    ADMIN_PASSWORD?: string;
}

export type VisitType = '初診' | '再診' | 'shared';

export interface Patient {
    patientId: string;
    name: string;
    kana: string;
    phone: string;
    visitType: VisitType;
    lastVisitDate: string; // YYYY-MM-DD
    createdAt: string;
}

export interface Slot {
    slotId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    visitType: VisitType;
    status: 'free' | 'booked';
    reservationId?: string;
    rowIndex?: number; // Internal use for updates
}

export interface Reservation {
    reservationId: string;
    name: string;
    phone: string;
    email?: string;
    visitType: VisitType;
    date: string;
    startTime: string;
    endTime: string;
    lineUserId?: string;
    googleEventId?: string;
    status: 'active' | 'cancelled';
    createdAt: string;
    rowIndex?: number;
}
