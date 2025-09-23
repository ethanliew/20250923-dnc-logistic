// StatCard.tsx
export default function StatCard({ label, value, className = '' }: { label: string; value: number; className?: string }) {
    return (
        <div className={`card text-center py-5 ${className}`}>
            <div className="text-[28px] font-extrabold tracking-tight">{value}</div>
            <div className="small">{label}</div>
        </div>
    );
}
