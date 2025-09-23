import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { LeaveApplication, LeaveBalance } from './types';

type AppState = {
    applications: LeaveApplication[];
    balance: LeaveBalance | null;

    // setters / actions
    setApplications: (xs: LeaveApplication[]) => void;
    upsertApplication: (x: LeaveApplication) => void;
    patchApplication: (id: string, patch: Partial<LeaveApplication>) => void;
    removeApplication: (id: string) => void;

    setBalance: (b: LeaveBalance | null) => void;

    hydrateFromServer: (xs: LeaveApplication[], b: LeaveBalance | null) => void;
    reset: () => void;
};

const sortDescByCreated = (a: LeaveApplication, b: LeaveApplication) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
};

export const useAppStore = create<AppState>()(
    devtools(
        persist(
            (set, get) => ({
                applications: [],
                balance: null,

                setApplications: (xs) =>
                    set(() => ({ applications: [...xs].sort(sortDescByCreated) }), false, 'setApplications'),

                upsertApplication: (x) =>
                    set((s) => {
                        const idx = s.applications.findIndex((a) => a.id === x.id);
                        if (idx >= 0) {
                            const apps = s.applications.slice();
                            apps[idx] = { ...apps[idx], ...x };
                            apps.sort(sortDescByCreated);
                            return { applications: apps };
                        }
                        return { applications: [x, ...s.applications].sort(sortDescByCreated) };
                    }, false, 'upsertApplication'),

                patchApplication: (id, patch) =>
                    set((s) => {
                        const idx = s.applications.findIndex((a) => a.id === id);
                        if (idx === -1) return {};
                        const apps = s.applications.slice();
                        apps[idx] = { ...apps[idx], ...patch };
                        apps.sort(sortDescByCreated);
                        return { applications: apps };
                    }, false, 'patchApplication'),

                removeApplication: (id) =>
                    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }), false, 'removeApplication'),

                setBalance: (b) => set(() => ({ balance: b }), false, 'setBalance'),

                hydrateFromServer: (xs, b) =>
                    set(() => ({ applications: [...xs].sort(sortDescByCreated), balance: b }), false, 'hydrateFromServer'),

                reset: () => set(() => ({ applications: [], balance: null }), false, 'reset'),
            }),
            {
                name: 'e-leave-store',
                version: 1,
                storage: createJSONStorage(() => localStorage), // safe on client; SSR ignores until hydrate
                // Only persist data (not methods)
                partialize: (state) => ({
                    applications: state.applications,
                    balance: state.balance,
                }),
            }
        ),
        { name: 'E-Leave Store' }
    )
);
