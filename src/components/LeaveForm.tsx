'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { mutate } from 'swr';



const isoDate = z
    .string()
    .refine(v => /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Invalid date (YYYY-MM-DD)' });

type FormValues = z.infer<typeof leaveSchema>;

const GROUPS = [
    'Tri-e Marketing sdn bhd',
    'Tri-e unitech sdn bhd',
    'Tri-e mcom sdn bhd (fks sign up now sdn bhd)',
    'Tri-e multimedia sdn bhd',
    'Tri-e nihomes sdn bhd (fka Tri-e digital sdn bhd)'
] as const;

function workingDaysInclusive(startISO: string, endISO: string) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }
    return days.filter(d => {
        const day = d.getDay(); // 0 Sun .. 6 Sat
        return day !== 0 && day !== 6;
    }).length || 1;
}

function todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

const leaveSchema = z.object({
    groups: z.array(z.enum(GROUPS)).min(1, 'Select at least one group'),
    applicantName: z.string().min(2),
    designation: z.string().min(2),
    department: z.string().min(2),
    leaveTypes: z.array(z.enum(['Annual', 'Medical', 'Others'])).min(1, 'Select at least one leave type'),
    reason: z.string().min(3),
    startDate: isoDate,
    endDate: isoDate,
    totalWorkingDays: z.number().min(1),
    contactAddress: z.string().min(5),
    contactTel: z.string().min(6).max(20),
    dateRequest: isoDate
});

export default function LeaveForm() {
    const [submitting, setSubmitting] = useState(false);
    const defaultDate = todayISO();

    const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(leaveSchema),
        defaultValues: {
            groups: [],
            applicantName: '', designation: '', department: '',
            leaveTypes: [], reason: '',
            startDate: defaultDate, endDate: defaultDate,
            totalWorkingDays: 1,
            contactAddress: '', contactTel: '',
            dateRequest: defaultDate
        }
    });

    const startDate = watch('startDate');
    const endDate = watch('endDate');

    function recomputeDays(s: string, e: string) {
        const days = workingDaysInclusive(s, e);
        setValue('totalWorkingDays', days, { shouldValidate: true });
    }

    async function onSubmit(values: FormValues) {
        setSubmitting(true);
        try {
            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const data = await res.json();

            if (!data?.ok) throw new Error(data?.message ?? 'Submission failed');

            alert('Leave submitted!');

            // SWR: update the "applied list" immediately
            await mutate('/api/apply', (prev?: { ok: boolean; items: any[] }) => {
                const created = data.application; // comes from your POST response
                const items = [created, ...(prev?.items ?? [])];
                return { ok: true, items };
            }, { revalidate: false });

            // (Optional) also refresh balance if your POST returns new balance
            if (data.balance) {
                await mutate('/api/apply?view=balance', { ok: true, balance: data.balance }, { revalidate: false });
            }

            // (Optional) reset form here if you like
            // reset();
        } catch (e: any) {
            alert(e?.message ?? 'Error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <h1 className="h1">Apply Leave</h1>

            <div className="card space-y-2">
                <label>Group</label>
                <div className="check-row">
                    {GROUPS.map((g) => (
                        <label key={g} className="check">
                            <input type="checkbox" value={g} {...register('groups')} />
                            <span className="break-words">{g}</span>
                        </label>
                    ))}
                </div>
                {errors.groups && (
                    <p className="small" style={{ color: '#dc2626' }}>
                        {String(errors.groups.message)}
                    </p>
                )}
            </div>

            <div className="card space-y-2">
                <label>Application for</label>
                <div className="check-row">
                    {(['Annual', 'Medical', 'Others'] as const).map(t => (
                        <label key={t} className="check">
                            <input type="checkbox" value={t} {...register('leaveTypes')} />
                            <span>{t} leave</span>
                        </label>
                    ))}
                </div>
                {errors.leaveTypes && <p className="small" style={{ color: '#dc2626' }}>{String(errors.leaveTypes.message)}</p>}
            </div>

            

            <div className="card space-y-3">
                <div>
                    <label>Reason</label>
                    <textarea rows={3} placeholder="Why are you applying?" {...register('reason')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label>Start date</label>
                        <input
                            type="date"
                            {...register('startDate')}
                            onChange={(e) => { const v = e.target.value; setValue('startDate', v); recomputeDays(v, endDate); }}
                        />
                    </div>
                    <div>
                        <label>End date</label>
                        <input
                            type="date"
                            {...register('endDate')}
                            onChange={(e) => { const v = e.target.value; setValue('endDate', v); recomputeDays(startDate, v); }}
                        />
                    </div>
                </div>

                <div>
                    <label>Total working day(s)</label>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        {...register('totalWorkingDays', { valueAsNumber: true })}
                    />
                    <p className="small">(Auto-excludes weekends. Adjust if needed.)</p>
                </div>
            </div>

            <div className="card space-y-3">
                <div>
                    <label>During this leave, staff can be contacted at: Address</label>
                    <textarea rows={2} placeholder="Contact address" {...register('contactAddress')} />
                </div>
                <div>
                    <label>Tel no.</label>
                    <input type="tel" inputMode="tel" placeholder="e.g. 0123456789" {...register('contactTel')} />
                </div>
                <div>
                    <label>Date request</label>
                    <input type="date" {...register('dateRequest')} />
                </div>
            </div>

            <button className="primary btn w-full" disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Submitting\u2026' : 'Submit application'}
            </button>
        </form>
    );
}
