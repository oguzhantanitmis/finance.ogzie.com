'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Info, Pencil, Plus, Trash2 } from 'lucide-react'

import { addAsset, deleteAsset, updateAsset } from '@/app/actions'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { formatCurrency, formatNumber } from '@/lib/utils'

type AssetItem = {
    id: string
    name: string
    type: string
    amount: number
    currency: string
    unitPrice: number | null
    lastValue: number | null
    valueInTL: number
}

type AllRates = {
    USD: number
    EUR: number
    GBP: number
    GA: number
    BTC: number
    ETH: number
}

// Returns the current TRY rate for a given currency/type combo
function getCurrentRate(currency: string, type: string, rates: AllRates): number | null {
    if (currency === 'USD') return rates.USD > 0 ? rates.USD : null
    if (currency === 'EUR') return rates.EUR > 0 ? rates.EUR : null
    if (currency === 'GBP') return rates.GBP > 0 ? rates.GBP : null
    if (currency === 'XAU' || type === 'GOLD') return rates.GA > 0 ? rates.GA : null
    if (currency === 'BTC') return rates.BTC > 0 ? rates.BTC : null
    if (currency === 'ETH') return rates.ETH > 0 ? rates.ETH : null
    return null
}

// Human-readable label for the rate
function rateLabel(currency: string, type: string): string {
    if (currency === 'USD') return 'USD/TRY'
    if (currency === 'EUR') return 'EUR/TRY'
    if (currency === 'GBP') return 'GBP/TRY'
    if (currency === 'XAU' || type === 'GOLD') return 'Gram Altın'
    if (currency === 'BTC') return 'BTC/TRY'
    if (currency === 'ETH') return 'ETH/TRY'
    return ''
}

const TYPE_LABEL: Record<string, string> = {
    CASH: 'Nakit',
    BANK: 'Banka',
    GOLD: 'Altın',
    FX: 'Döviz',
    CRYPTO: 'Kripto',
    STOCK: 'Hisse',
    ESTATE: 'Gayrimenkul',
    OTHER: 'Diğer',
}

export default function AssetsWorkspace({
    assets,
    totalAssetsValue,
    rates,
    ratesSource,
    ratesUpdatedAt,
}: {
    assets: AssetItem[]
    totalAssetsValue: number
    rates: AllRates
    ratesSource: string | null
    ratesUpdatedAt: string | null
}) {
    const [showAdd, setShowAdd] = useState(false)
    const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(addAsset, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateAsset, EMPTY_ACTION_RESULT)

    const hasUsdRate = rates.USD > 0
    const sourceLabel = ratesSource === 'COLLECTAPI_ECONOMY' ? 'CollectAPI' : (ratesSource ?? 'CollectAPI')
    const updatedLabel = ratesUpdatedAt
        ? new Date(ratesUpdatedAt).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
        : null

    useEffect(() => {
        if (!createState.success || !showAdd) return
        const id = window.setTimeout(() => { setShowAdd(false); setFeedback(createState) }, 0)
        return () => window.clearTimeout(id)
    }, [createState, showAdd])

    useEffect(() => {
        if (!updateState.success || !editingAsset) return
        const id = window.setTimeout(() => { setEditingAsset(null); setFeedback(updateState) }, 0)
        return () => window.clearTimeout(id)
    }, [updateState, editingAsset])

    function handleDelete(assetId: string) {
        if (!confirm('Bu varlığı silmek istediğinize emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteAsset(assetId)
            setFeedback(result)
        })
    }

    return (
        <div>
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Varlık Yönetimi
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Kaydettiğin tüm varlıkları gerçek tutarlarıyla takip et.
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Varlık Ekle
                </button>
            </header>

            <FormMessage success={feedback?.success} message={feedback?.message} />

            {/* Header KPI kartları */}
            {(() => {
                // Per-currency totals (non-TRY)
                const byCurrency: Record<string, number> = {}
                for (const a of assets) {
                    if (a.currency === 'TRY') continue
                    byCurrency[a.currency] = (byCurrency[a.currency] ?? 0) + a.amount
                }
                const foreignEntries = Object.entries(byCurrency).slice(0, 2)

                return (
                    <div className={`grid grid-cols-1 gap-6 mb-8 ${foreignEntries.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-1 max-w-xs'}`}>
                        <div
                            className="fintech-card p-6"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent-success-bg), var(--bg-card))',
                                borderColor: 'var(--accent-success-border)',
                            }}
                        >
                            <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                                Toplam Varlıklar
                            </p>
                            <p className="text-3xl font-bold tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(totalAssetsValue, 'TRY')}
                            </p>
                            <p className="text-sm mt-2" style={{ color: 'var(--accent-success)' }}>
                                Kaydedilmiş veriler üzerinden hesaplandı.
                            </p>
                        </div>

                        {foreignEntries.map(([currency, total]) => {
                            const rate = getCurrentRate(currency, '', rates)
                            const tlValue = rate ? total * rate : null
                            return (
                                <div key={currency} className="fintech-card p-6">
                                    <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                                        Toplam {currency}
                                    </p>
                                    <p className="text-3xl font-bold tabular-nums privacy-blur" style={{ color: 'var(--accent-info)' }}>
                                        {formatNumber(total)} <span className="text-lg">{currency}</span>
                                    </p>
                                    {tlValue !== null ? (
                                        <p className="text-sm mt-2 tabular-nums privacy-blur" style={{ color: 'var(--text-muted)' }}>
                                            ≈ {formatCurrency(tlValue, 'TRY')}
                                            {rate && <span className="ml-1.5 text-xs">• 1 {currency} = {formatCurrency(rate, 'TRY')}</span>}
                                        </p>
                                    ) : (
                                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Kur verisi yok</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )
            })()}

            {/* Varlık tablosu */}
            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Varlık</th>
                            <th>Tür</th>
                            <th>Biriktirilen Miktar</th>
                            <th>Güncel Kur / Birim</th>
                            <th className="col-numeric">Toplam Değer (TL)</th>
                            <th className="col-numeric">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset) => {
                            const currentRate = getCurrentRate(asset.currency, asset.type, rates)
                            const label = rateLabel(asset.currency, asset.type)
                            const isForeign = asset.currency !== 'TRY' && currentRate !== null

                            return (
                                <tr key={asset.id} className="group">
                                        {/* Varlık adı */}
                                        <td className="p-4">
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {asset.name}
                                            </span>
                                        </td>

                                        {/* Tür badge */}
                                        <td className="p-4">
                                            <span className="status-badge status-badge-neutral text-xs">
                                                {TYPE_LABEL[asset.type] ?? asset.type}
                                            </span>
                                        </td>

                                        {/* Biriktirilen miktar — ana odak */}
                                        <td className="p-4">
                                            <span
                                                className="text-base font-bold tabular-nums"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {formatNumber(asset.amount)}
                                            </span>
                                            {' '}
                                            <span
                                                className="text-xs font-semibold uppercase tracking-wider"
                                                style={{ color: 'var(--accent-info)' }}
                                            >
                                                {asset.currency}
                                            </span>
                                        </td>

                                        {/* Güncel kur (yabancı varlıklar) veya maliyet (TRY) */}
                                        <td className="p-4">
                                            {isForeign ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="tabular-nums text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatCurrency(currentRate!, 'TRY')}
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                                                        {label}
                                                    </span>
                                                </div>
                                            ) : asset.unitPrice ? (
                                                <span className="tabular-nums text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatCurrency(asset.unitPrice, asset.currency)}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>

                                        {/* Toplam TL — hover'da kur × miktar hesabı */}
                                        <td className="p-4 text-right">
                                            <div className="relative inline-block">
                                                <span
                                                    className="font-bold tabular-nums privacy-blur"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {formatCurrency(asset.valueInTL, 'TRY')}
                                                </span>

                                                {isForeign && (
                                                    <>
                                                        {/* Hover tetikleyici ikon */}
                                                        <span
                                                            className="inline-block ml-1.5 align-middle opacity-0 group-hover:opacity-100 transition-opacity cursor-default"
                                                            style={{ color: 'var(--accent-info)' }}
                                                        >
                                                            <Info className="w-3.5 h-3.5" aria-hidden />
                                                        </span>

                                                        {/* Tooltip */}
                                                        <div
                                                            className="absolute right-0 bottom-full mb-2 z-20 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150"
                                                            style={{ minWidth: '220px' }}
                                                        >
                                                            <div
                                                                className="fintech-card p-3 text-left shadow-lg"
                                                                style={{ background: 'var(--bg-elevated)' }}
                                                            >
                                                                <p
                                                                    className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-2"
                                                                    style={{ color: 'var(--text-muted)' }}
                                                                >
                                                                    {label} hesabı
                                                                </p>
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between gap-4 text-xs">
                                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                                            Güncel kur
                                                                        </span>
                                                                        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                                                            1 {asset.currency} = {formatCurrency(currentRate!, 'TRY')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-4 text-xs">
                                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                                            Biriktirilen
                                                                        </span>
                                                                        <span className="font-semibold tabular-nums" style={{ color: 'var(--accent-info)' }}>
                                                                            {formatNumber(asset.amount)} {asset.currency}
                                                                        </span>
                                                                    </div>
                                                                    <div
                                                                        className="flex justify-between gap-4 text-xs pt-1.5 mt-1"
                                                                        style={{ borderTop: '1px solid var(--border-default)' }}
                                                                    >
                                                                        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                                                            TL karşılığı
                                                                        </span>
                                                                        <span className="font-bold tabular-nums privacy-blur" style={{ color: 'var(--accent-success)' }}>
                                                                            {formatCurrency(asset.valueInTL, 'TRY')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {updatedLabel && (
                                                                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                                                                        {sourceLabel} • {updatedLabel}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {/* Tooltip ok işareti */}
                                                            <div
                                                                className="w-2.5 h-2.5 rotate-45 absolute -bottom-1.5 right-4"
                                                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* Aksiyonlar */}
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingAsset(asset)}
                                                    className="btn-icon"
                                                    aria-label={`${asset.name} düzenle`}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id)}
                                                    className="btn-icon hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-bg)]"
                                                    aria-label={`${asset.name} sil`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {assets.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                        Henüz varlık eklenmemiş.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
            </div>

            {showAdd && (
                <Modal title="Yeni Varlık Ekle" onClose={() => setShowAdd(false)}>
                    <AssetForm action={createAction} asset={null} state={createState} />
                </Modal>
            )}

            {editingAsset && (
                <Modal title="Varlığı Düzenle" onClose={() => setEditingAsset(null)}>
                    <AssetForm action={updateAction} asset={editingAsset} state={updateState} />
                </Modal>
            )}
        </div>
    )
}

function AssetForm({
    action,
    asset,
    state,
}: {
    action: (payload: FormData) => void
    asset: AssetItem | null
    state: ActionResult
}) {
    return (
        <form action={action} className="space-y-4">
            {asset ? <input type="hidden" name="assetId" value={asset.id} /> : null}
            <div>
                <label className="form-label">Varlık adı</label>
                <input name="name" defaultValue={asset?.name ?? ''} placeholder="Örn: Ziraat Bankası, Altın Hesabı" className="form-input" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Tür</label>
                    <select name="type" defaultValue={asset?.type ?? 'CASH'} className="form-input form-select">
                        <option value="CASH">Nakit</option>
                        <option value="BANK">Banka Hesabı</option>
                        <option value="GOLD">Altın</option>
                        <option value="FX">Döviz</option>
                        <option value="CRYPTO">Kripto</option>
                        <option value="STOCK">Hisse Senedi</option>
                        <option value="ESTATE">Gayrimenkul</option>
                        <option value="OTHER">Diğer</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Para birimi</label>
                    <select name="currency" defaultValue={asset?.currency ?? 'TRY'} className="form-input form-select">
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="XAU">XAU (Altın)</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="form-label">Biriktirilen miktar</label>
                <input name="amount" type="number" step="0.01" defaultValue={asset?.amount ?? ''} placeholder="Örn: 250" className="form-input" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Maliyet / birim fiyat (opsiyonel)</label>
                    <input name="unitPrice" type="number" step="0.01" defaultValue={asset?.unitPrice ?? ''} placeholder="Alış fiyatı" className="form-input" />
                </div>
                <div>
                    <label className="form-label">Güncel toplam değer (opsiyonel)</label>
                    <input name="lastValue" type="number" step="0.01" defaultValue={asset?.lastValue ?? ''} placeholder="Manuel TL değeri" className="form-input" />
                </div>
            </div>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={asset ? 'Varlığı Güncelle' : 'Varlığı Kaydet'} pendingLabel={asset ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}
