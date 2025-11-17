import { Link } from 'react-router-dom'
import { useState } from 'react'

interface LogoProps {
    height?: number
    showText?: boolean
}

export default function Logo({ height = 40, showText = true }: LogoProps) {
    const [imgOk, setImgOk] = useState(true)

    return (
        <Link to="/" className="flex items-center gap-3" aria-label="GreenChainz Home">
            {imgOk ? (
                <img
                    src="/assets/logo/greenchainz-full.svg"
                    alt="GreenChainz - Verified Sustainable Sourcing"
                    style={{ height }}
                    onError={() => setImgOk(false)}
                />
            ) : (
                <div
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30"
                    aria-hidden
                />
            )}
            {showText && (
                <span className="text-2xl font-bold text-white tracking-tight">GreenChainz</span>
            )}
        </Link>
    )
}
