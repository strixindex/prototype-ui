import { useId } from "react"

export function SendGradientIcon({ className } : { className?: string}) {
    const id = useId();
    return (
        <svg
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id={id} x1="2" y1="22" x2="23" y2="3" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#5eead4" />
                    <stop offset="1" stopColor="#38bdf8" />
                </linearGradient>
            </defs>
            <path fill={`url(#${id})`} d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"></path>
        </svg>
    )
}
