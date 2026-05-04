import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'

import { refreshEvdsRatesFormAction } from '@/app/settings/evds-actions'
import type { MarketTickerResult } from '@/lib/evds-service'
import { cn } from '@/lib/utils'

function formatRate(value: number | null) {
    if (value === null) return '-'
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    }).format(value)
}

function formatDate(value: string | null) {
    if (!value) return 'Güncelleme yok'
    return new Date(value).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function MarketTicker({ ticker }: { ticker: MarketTickerResult }) {
    const showEmpty = ticker.items.length === 0

    return (
        <section className="fintech-card p-5 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Piyasa kartları</p>
                    <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>TCMB EVDS kur takibi</h2>
                    <p className={cn(
                        'text-sm mt-1',
                        ticker.status === 'ok' ? 'text-[color:var(--text-secondary)]' : 'text-[color:var(--accent-warning)]',
                    )}>
                        {ticker.message}
                    </p>
                </div>
                <form action={refreshEvdsRatesFormAction}>
                    <button type="submit" className="btn-secondary">
                        <RefreshCw className="w-4 h-4" />
                        Manuel yenile
                    </button>
                </form>
            </div>

            {showEmpty ? (
                <div className="rounded-2xl p-5" style={{ border: '1px dashed var(--border-default)', background: 'var(--bg-hover)' }}>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {ticker.status === 'missing_key' ? 'EVDS API anahtarı girilmedi' : 'Gösterilecek piyasa verisi yok'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Ayarlar sayfasında TCMB / EVDS bölümünden API anahtarı ve seri kodlarını tanımlayın.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {ticker.items.map((item) => {
                        const isPositive = (item.changePercent ?? 0) >= 0
                        const TrendIcon = isPositive ? TrendingUp : TrendingDown

                        return (
                            <div key={item.code} className="rounded-2xl p-4" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{item.code}</p>
                                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</h3>
                                    </div>
                                    {item.changePercent !== null ? (
                                        <span
                                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                                            style={{
                                                color: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)',
                                                background: isPositive ? 'var(--accent-success-bg)' : 'var(--accent-danger-bg)',
                                            }}
                                        >
                                            <TrendIcon className="w-3 h-3" />
                                            %{Math.abs(item.changePercent).toLocaleString('tr-TR')}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="text-2xl font-bold tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>
                                    {item.sellRate !== null ? `₺${formatRate(item.sellRate)}` : formatRate(item.buyRate)}
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    <div>
                                        <p style={{ color: 'var(--text-muted)' }}>Alış</p>
                                        <p className="font-mono privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatRate(item.buyRate)}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)' }}>Satış</p>
                                        <p className="font-mono privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatRate(item.sellRate)}</p>
                                    </div>
                                </div>
                                <p className="text-[11px] mt-3" style={{ color: item.stale ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                                    {item.stale ? 'Son başarılı veri' : 'Son güncelleme'}: {formatDate(item.updatedAt)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
