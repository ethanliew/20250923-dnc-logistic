// Narrow unions to avoid typos in UI / server
export type LeaveType = 'Annual' | 'Medical' | 'Others';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type Group = 'HQ' | 'Warehouse' | 'Sales' | 'Support';

// Template-literal "brand" for YYYY-MM-DD (lightweight; still just string at runtime)
export type ISODate = `${number}-${`${number}${number}`}-${`${number}${number}`}`;

// Optional helpers (use when ready)
// export type UUID = string & { readonly __uuid: unique symbol };
// export type Phone = string & { readonly __phone: unique symbol };

export interface LeaveApplicationInput {
    groups: Group[];                 // checkbox group membership
    applicantName: string;
    designation: string;
    department: string;
    leaveTypes: LeaveType[];         // multi-select via checkboxes
    reason: string;
    startDate: ISODate;              // YYYY-MM-DD
    endDate: ISODate;                // YYYY-MM-DD
    totalWorkingDays: number;
    contactAddress: string;
    contactTel: string;              // consider "Phone" helper later
    dateRequest: ISODate;            // YYYY-MM-DD
}

export interface LeaveApplication extends LeaveApplicationInput {
    id: string;                      // could be UUID
    status: LeaveStatus;
    createdAt: string;               // ISO timestamp
}

// Keep these as plain interfaces; you can make fields readonly
// if you prefer strict immutability for state slices.
export interface LeaveBalance {
    annual: number;
    medical: number;
    others: number;
    lastUpdatedAt: string;           // ISO timestamp
}

// Upstream ingest response (POST /api/apply)
export interface N8nIngestResponse {
    ok: boolean;
    application: LeaveApplication;
    balance?: LeaveBalance;
    message?: string;
}

/* ------- API GET views (used by SWR fetchers) ------- */

// GET /api/apply            → current applied list
export interface AppliedResponse {
    ok: boolean;
    items: LeaveApplication[];       // pending/active items
}

// GET /api/apply?view=balance
export interface BalanceResponse {
    ok: boolean;
    balance?: LeaveBalance;
    message?: string;
}

// GET /api/apply?view=history
export interface HistoryResponse {
    ok: boolean;
    items: LeaveApplication[];       // full history (often many)
    nextCursor?: string;             // if you paginate later
}
