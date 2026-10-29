'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Hızlı işlem derin bağlantısı (ör. `/cards?new=1`): `name` parametresi kabul edilen bir
 * değerle geldiğinde `onValue` bir kez çağrılır ve parametre URL'den temizlenir.
 *
 * State güncellemesi effect içinde değil, render sırasında "önceki değere göre ayarla"
 * kalıbıyla yapılır (react-hooks/set-state-in-effect); `onValue` yalnız çağıran bileşenin
 * kendi state'ini değiştirmelidir. Effect yalnız `router.replace` yan etkisini taşır.
 */
export function useDeepLinkParam(
    name: string,
    onValue: (value: string) => void,
    accept: (value: string) => boolean = () => true,
) {
    const router = useRouter()
    const pathname = usePathname()
    const raw = useSearchParams().get(name)
    const value = raw && accept(raw) ? raw : null

    const [handled, setHandled] = useState<string | null>(null)
    if (value !== handled) {
        setHandled(value)
        if (value) onValue(value)
    }

    useEffect(() => {
        if (value) router.replace(pathname, { scroll: false })
    }, [value, router, pathname])
}
