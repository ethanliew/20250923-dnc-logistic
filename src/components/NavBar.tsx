'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

function IconApply() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 7a2 2 0 0 1 2-2h5.5L19 11.5V17a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12.5 5v4.5H19" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}
function IconApplied() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l4 4 12-12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function IconBalance() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M6 7v9a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="11" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}
function IconHistory() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 6v6l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 13a8 8 0 1 0 3-6.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const tabs = [
    { href: '/', label: 'Apply', Icon: IconApply },
    { href: '/applied', label: 'Applied', Icon: IconApplied },
    { href: '/balance', label: 'Balance', Icon: IconBalance },
    //{ href: '/history', label: 'History', Icon: IconHistory },
];

export default function NavBar() {
    const path = usePathname();

    // Normalize path (optional; helps with trailing slashes)
    const current = path?.replace(/\/+$/, '') || '/';

    const vibrate = () => {
        try { if ('vibrate' in navigator) navigator.vibrate(10); } catch { }
    };

    return (
        <nav className="tabbar" role="navigation" aria-label="Primary">
            <div className="tabbar-inner">
                {tabs.map(({ href, label, Icon }) => {
                    // active if exact match, or if we're on a child route of this tab
                    const isActive =
                        current === href ||
                        (href !== '/' && current.startsWith(href + '/'));

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={clsx('tab', isActive && 'active')}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={label}
                            onClick={vibrate}
                        >
                            <Icon />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
