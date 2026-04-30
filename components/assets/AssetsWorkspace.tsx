'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { addAsset, deleteAsset, updateAsset } from '@/app/actions'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { formatCurrency } from '@/lib/utils'

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

export default function AssetsWorkspace({
    assets,
    totalAssetsValue,
    usdRate,
}: {
    assets: AssetItem[]
    totalAssetsValue: number
    usdRate: number
}) {
    const [showAdd, setShowAdd] = useState(false)
    const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(addAsset, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateAsset, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!createState.success || !showAdd) return

        const timeoutId = window.setTimeout(() => {
            setShowAdd(false)
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState, showAdd])

    useEffect(() => {
        if (!updateState.success || !editingAsset) return

        const timeoutId = window.setTimeout(() => {
            setEditingAsset(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, editingAsset])

    function handleDelete(assetId: string) {
        if (!confirm('Bu varligi silmek istediginize emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteAsset(assetId)
            setFeedback(result)
        })
    }

    return (
        <div>
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Varlık Yönetimi</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Kaydettiğin tüm varlıkları gerçek tutarlarıyla takip et.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" /> Varlık Ekle
                </button>
            </header>

            <FormMessage success={feedback?.success} message={feedback?.message} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="fintech-card p-6 bg-gradient-to-br from-green-900/20 to-black border-green-900/30">
                    <h3 className="text-zinc-400 font-medium mb-2">Toplam Varlıklar</h3>
                    <p className="text-3xl font-bold text-white privacy-blur">{formatCurrency(totalAssetsValue, 'TRY')}</p>
                    <p className="text-green-400 text-sm mt-2">Kaydedilmiş veriler üzerinden hesaplandı.</p>
                </div>

                <div className="fintech-card p-6">
                    <h3 className="text-zinc-400 font-medium mb-2">Dolar Kuru</h3>
                    <p className="text-3xl font-bold text-white">{formatCurrency(usdRate, 'TRY')}</p>
                </div>
            </div>

            <div className="fintech-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--bg-elevated)] text-zinc-400">
                            <tr>
                                <th className="p-4 font-medium">Varlık</th>
                                <th className="p-4 font-medium">Tür</th>
                                <th className="p-4 font-medium">Miktar</th>
                                <th className="p-4 font-medium">Birim Değer</th>
                                <th className="p-4 font-medium text-right">Toplam Değer (TL)</th>
                                <th className="p-4 font-medium text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {assets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="p-4 font-medium text-white">{asset.name}</td>
                                    <td className="p-4 text-zinc-400">
                                        <span className="bg-[var(--bg-hover)] px-2 py-1 rounded text-xs border border-[var(--border-subtle)]">
                                            {asset.type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-zinc-300">
                                        {asset.amount} <span className="text-zinc-500 text-xs">{asset.currency}</span>
                                    </td>
                                    <td className="p-4 font-mono text-zinc-400">
                                        {asset.lastValue ? formatCurrency(asset.lastValue, 'TRY') : asset.unitPrice ? formatCurrency(asset.unitPrice, asset.currency) : '-'}
                                    </td>
                                    <td className="p-4 font-mono font-bold text-white text-right privacy-blur">
                                        {formatCurrency(asset.valueInTL, 'TRY')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => setEditingAsset(asset)} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-[var(--bg-elevated)]">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(asset.id)} className="p-2 rounded-xl text-zinc-500 hover:text-[color:var(--accent-danger)] hover:bg-red-500/10">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                                        Henüz varlık eklenmemiş.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAdd ? (
                <Modal title="Yeni Varlık Ekle" onClose={() => setShowAdd(false)}>
                    <AssetForm action={createAction} asset={null} state={createState} />
                </Modal>
            ) : null}

            {editingAsset ? (
                <Modal title="Varlığı Düzenle" onClose={() => setEditingAsset(null)}>
                    <AssetForm action={updateAction} asset={editingAsset} state={updateState} />
                </Modal>
            ) : null}
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
            <input name="name" defaultValue={asset?.name ?? ''} placeholder="Örn: Ziraat Bankası, Altın Hesabı" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
            <div className="grid grid-cols-2 gap-4">
                <select name="type" defaultValue={asset?.type ?? 'CASH'} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                    <option value="CASH">Nakit</option>
                    <option value="BANK">Banka Hesabı</option>
                    <option value="GOLD">Altın</option>
                    <option value="FX">Döviz</option>
                    <option value="CRYPTO">Kripto</option>
                    <option value="STOCK">Hisse Senedi</option>
                    <option value="ESTATE">Gayrimenkul</option>
                    <option value="OTHER">Diğer</option>
                </select>
                <select name="currency" defaultValue={asset?.currency ?? 'TRY'} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="XAU">XAU</option>
                </select>
            </div>
            <input name="amount" type="number" step="0.01" defaultValue={asset?.amount ?? ''} placeholder="Miktar" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
            <div className="grid grid-cols-2 gap-4">
                <input name="unitPrice" type="number" step="0.01" defaultValue={asset?.unitPrice ?? ''} placeholder="Maliyet / birim fiyat" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                <input name="lastValue" type="number" step="0.01" defaultValue={asset?.lastValue ?? ''} placeholder="Güncel toplam değer (opsiyonel)" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
            </div>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={asset ? 'Varlığı Güncelle' : 'Varlığı Kaydet'} pendingLabel={asset ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}
