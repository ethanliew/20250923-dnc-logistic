import { z } from 'zod';

const isoDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)');

const nonEmpty = (min = 2, max = 80) =>
    z.string().trim().min(min).max(max);

const phone = z
    .string()
    .trim()
    // loose E.164-ish: digits, spaces, +, -, parentheses
    .regex(/^[+()\-.\s\d]{6,20}$/, 'Invalid phone number')
    .max(20);

export const leaveSchema = z
    .object({
        groups: z.array(z.string().trim()).min(1, 'Select at least one group'),

        applicantName: nonEmpty(2, 80),
        designation: nonEmpty(2, 80),
        department: nonEmpty(2, 80),

        leaveTypes: z
            .array(z.enum(['Annual', 'Medical', 'Others']))
            .min(1, 'Select at least one leave type'),

        reason: z.string().trim().min(3).max(500),

        startDate: isoDate,
        endDate: isoDate,

        // coerce so <input type="number"> works even if value is a string
        totalWorkingDays: z.coerce.number().int().min(1),

        contactAddress: z.string().trim().min(5).max(200),
        contactTel: phone,

        dateRequest: isoDate,
    })
    .refine(
        (v) => v.startDate <= v.endDate,
        {
            path: ['endDate'],
            message: 'End date cannot be earlier than start date',
        }
    );

export type LeaveApplicationInput = z.infer<typeof leaveSchema>;
