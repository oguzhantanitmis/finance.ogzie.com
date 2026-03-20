'use client'

import { useActionState, useEffect, useState } from 'react'

import { addCreditCard, updateCreditCard } from '@/app/cards/actions'
import Modal from '@/components/ui/Modal'
import FormMessage from '@/components/ui/FormMessage'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT } from '@/lib/action-result'

const CARD_COLORS = [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F97316',
    '#EAB308',
    '#22C55E',
    '#06B6D4',
    '#3B82F6',
]

const BANKS = [
    'Akbank', 'Garanti BBVA', 'Yapı Kredi', 'İş Bankası', 'Ziraat Bankası',
    'Halkbank', 'Vakıfbank', 'QNB', 'Denizbank', 'TEB',
    'HSBC', 'ING', 'Enpara', 'Papara', 'Diğer',
]

export interface EditableCard {
    id: string
    cardName: string
    bankName: string
    last4Digits: string
    cardNetwork: string
    color: string
    status: string
    totalLimit: number
    cashAdvanceLimit: number
    cutOffDay: number
    paymentDueDay: number
    contractualRate: number
    defaultRate: number
    cashAdvanceRate: number
    kkdfRate?: number
    bsmvRate?: number
    minPaymentRate: number
    rewardsPoints: number
}

export default function CardFormModal({
    card,
    onClose,
}: {
    card: EditableCard | null
    onClose: () => void
}) {
    const [selectedColor, setSelectedColor] = useState(card?.color ?? CARD_COLORS[0])
    const [createState, createAction] = useActionState(addCreditCard, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateCreditCard, EMPTY_ACTION_RESULT)
    const activeState = card ? updateState : createState

    useEffect(() => {
        if (activeState.success) {
            onClose()
        }
    }, [activeState, onClose])

    return (
        <Modal title={card ? 'Kartı Düzenle' : 'Yeni Kredi Kartı Ekle'} onClose={onClose} maxWidthClassName="max-w-2xl">
            <form action={card ? updateAction : createAction} className="space-y-5">
                {card ? <input type="hidden" name="cardId" value={card.id} /> : null}
                <input type="hidden" name="color" value={selectedColor} />

                <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Kart Adı</label>
                    <input
                        name="cardName"
                        required
                        defaultValue={card?.cardName ?? ''}
                        placeholder="Akbank Axess Platinum"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors"
                    />
                </div>

                <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Banka</label>
                    <select
                        name="bankName"
                        required
                        defaultValue={card?.bankName ?? BANKS[0]}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none"
                    >
                        {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Son 4 Hane</label>
                        <input
                            name="last4Digits"
                            maxLength={4}
                            defaultValue={card?.last4Digits ?? ''}
                            placeholder="4532"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Kart Ağı</label>
                        <select
                            name="cardNetwork"
                            defaultValue={card?.cardNetwork ?? 'VISA'}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none"
                        >
                            <option value="VISA">VISA</option>
                            <option value="MASTERCARD">Mastercard</option>
                            <option value="TROY">Troy</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Toplam Limit (₺)</label>
                        <input
                            name="totalLimit"
                            type="number"
                            required
                            defaultValue={card?.totalLimit ?? ''}
                            placeholder="50000"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Nakit Avans Limiti (₺)</label>
                        <input
                            name="cashAdvanceLimit"
                            type="number"
                            defaultValue={card?.cashAdvanceLimit ?? ''}
                            placeholder="25000"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Hesap Kesim Günü</label>
                        <input
                            name="cutOffDay"
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={card?.cutOffDay ?? ''}
                            placeholder="15"
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Son Ödeme Günü</label>
                        <input
                            name="paymentDueDay"
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={card?.paymentDueDay ?? ''}
                            placeholder="5"
                            required
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Birikmiş Puan</label>
                        <input
                            name="rewardsPoints"
                            type="number"
                            defaultValue={card?.rewardsPoints ?? 0}
                            placeholder="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Akdi Faiz (%)</label>
                        <input name="contractualRate" type="number" step="0.01" defaultValue={card?.contractualRate ?? 4.42} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Gecikme (%)</label>
                        <input name="defaultRate" type="number" step="0.01" defaultValue={card?.defaultRate ?? 5.42} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">N. Avans (%)</label>
                        <input name="cashAdvanceRate" type="number" step="0.01" defaultValue={card?.cashAdvanceRate ?? 5.92} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Asgari Oran</label>
                        <input name="minPaymentRate" type="number" step="0.01" defaultValue={card?.minPaymentRate ?? 0.2} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">KKDF</label>
                        <input name="kkdfRate" type="number" step="0.01" defaultValue={card?.kkdfRate ?? 0.15} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">BSMV</label>
                        <input name="bsmvRate" type="number" step="0.01" defaultValue={card?.bsmvRate ?? 0.15} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm" />
                    </div>
                </div>

                {card ? (
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Durum</label>
                        <select name="status" defaultValue={card.status} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white">
                            <option value="ACTIVE">Aktif</option>
                            <option value="FROZEN">Donduruldu</option>
                            <option value="CLOSED">Kapandı</option>
                        </select>
                    </div>
                ) : null}

                <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Kart Rengi</label>
                    <div className="flex gap-2 flex-wrap">
                        {CARD_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-60 hover:opacity-100'}`}
                                style={{ background: color }}
                            />
                        ))}
                    </div>
                </div>

                <FormMessage success={activeState.success} message={activeState.message} />
                <SubmitButton label={card ? 'Kartı Güncelle' : 'Kartı Ekle'} pendingLabel={card ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
            </form>
        </Modal>
    )
}
