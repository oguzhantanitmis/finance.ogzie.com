'use client'

import { useEffect } from 'react'

const WIDTH_PX: Record<string, string> = {
    dar: '64rem',      // max-w-5xl
    normal: '1500px',
    genis: '1820px',
}

/**
 * Aktif sayfanın PageShell genişliğini `--content-max` CSS değişkenine yazar.
 * TopBar bunu okuyup kümeyi içerik çerçevesinin sağ kenarına hizalar; böylece
 * `width="normal"` (örn. /settings) sayfalarda küme geniş ekranda içerikten
 * kopuk durmaz. Unmount'ta varsayılana (genis) döner.
 */
export default function ContentWidthSetter({ width = 'genis' }: { width?: 'dar' | 'normal' | 'genis' }) {
    useEffect(() => {
        const root = document.documentElement
        root.style.setProperty('--content-max', WIDTH_PX[width] ?? '1820px')
        return () => { root.style.setProperty('--content-max', '1820px') }
    }, [width])
    return null
}
