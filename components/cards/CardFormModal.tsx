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

function toPercentInput(value: number | null | undefined, fallbackFraction: number) {
    const normalized = value ?? fallbackFraction
    return +((normalized > 1 ? normalized : normalized * 100).toFixed(2))
}

export interface EditableCard {
    id: string
    cardName: string
    bankName: string
    cardProgram?: string | null
    last4Digits: string
    cardNetwork: string
    color: string
    status: string
    totalLimit: number
    availableLimit?: number | null
    currentDebt?: number | null
    cashAdvanceLimit: number
    statementDate?: string | Date | null
    dueDate?: string | Date | null
    cutOffDay: number
    paymentDueDay: number
    contractualRate: number
    defaultRate: number
    cashAdvanceRate: number
    kkdfRate?: number
    bsmvRate?: number
    minPaymentRate: number
    rewardsPoints: number
    description?: string | null
}

export default function CardFormModal({
    card,
    onClose,
}: {
    card: EditableCard | null
    onClose: () => void
}) {
    const [selectedColor, setSelectedColor] = useState(card?.color ?? CARD_COLORS[0])
    const [totalLimit, setTotalLimit] = useState(card?.totalLimit ?? 50000)
    const [isNewCard, setIsNewCard] = useState(false)
    const [minPaymentRate, setMinPaymentRate] = useState<number | ''>(
        card?.minPaymentRate ? toPercentInput(card.minPaymentRate, 0.2) : (totalLimit > 50000 ? 40 : 20)
    )

    // Sync minPaymentRate when totalLimit or isNewCard changes, unless user manually edited it
    useEffect(() => {
        if (!card) { // Only auto-update for new cards to avoid overriding user's manual settings
            setMinPaymentRate(isNewCard || totalLimit > 50000 ? 40 : 20)
        }
    }, [totalLimit, isNewCard, card])

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
                    <label className="form-label">Kart Adı</label>
                    <input
                        name="cardName"
                        required
                        defaultValue={card?.cardName ?? ''}
                        placeholder="Akbank Axess Platinum"
                        className="form-input"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Banka</label>
                        <select
                            name="bankName"
                            required
                            defaultValue={card?.bankName ?? BANKS[0]}
                            className="form-input form-select"
                        >
                            {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Kart programı</label>
                        <select
                            name="cardProgram"
                            defaultValue={card?.cardProgram ?? ''}
                            className="form-input form-select"
                        >
                            <option value="">Seçiniz...</option>
                            <option value="Axess">Axess</option>
                            <option value="Bonus">Bonus</option>
                            <option value="World">World</option>
                            <option value="Maximum">Maximum</option>
                            <option value="Paraf">Paraf</option>
                            <option value="Wings">Wings</option>
                            <option value="Bankkart">Bankkart</option>
                            <option value="CardFinans">CardFinans</option>
                            <option value="Advantage">Advantage</option>
                            <option value="Miles&Smiles">Miles&Smiles</option>
                            <option value="Shop&Miles">Shop&Miles</option>
                            <option value="Diğer">Diğer</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Son 4 Hane</label>
                        <input
                            name="last4Digits"
                            maxLength={4}
                            defaultValue={card?.last4Digits ?? ''}
                            placeholder="4532"
                            className="form-input font-mono"
                        />
                    </div>
                    <div>
                        <label className="form-label">Kart Ağı</label>
                        <select
                            name="cardNetwork"
                            defaultValue={card?.cardNetwork ?? 'VISA'}
                            className="form-input form-select"
                        >
                            <option value="VISA">VISA</option>
                            <option value="MASTERCARD">Mastercard</option>
                            <option value="TROY">Troy</option>
                            <option value="AMERICAN_EXPRESS">American Express</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Toplam Limit (₺)</label>
                        <input
                            name="totalLimit"
                            type="number"
                            required
                            value={totalLimit}
                            onChange={(e) => setTotalLimit(Number(e.target.value))}
                            placeholder="50000"
                            className="form-input font-mono"
                        />
                    </div>
                    <div>
                        <label className="form-label">Güncel Borç (₺)</label>
                        <input
                            name="currentDebt"
                            type="number"
                            step="0.01"
                            defaultValue={card?.currentDebt ?? 0}
                            placeholder="0"
                            className="form-input font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Kullanılabilir Limit (₺)</label>
                        <input
                            name="availableLimit"
                            type="number"
                            step="0.01"
                            defaultValue={card?.availableLimit ?? ''}
                            placeholder="Boşsa limit - borç hesaplanır"
                            className="form-input font-mono"
                        />
                    </div>
                    <div>
                        <label className="form-label">Nakit Avans Limiti (₺)</label>
                        <input
                            name="cashAdvanceLimit"
                            type="number"
                            defaultValue={card?.cashAdvanceLimit ?? ''}
                            placeholder="25000"
                            className="form-input font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="form-label">Hesap Kesim Günü</label>
                        <input
                            name="cutOffDay"
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={card?.cutOffDay ?? ''}
                            placeholder="15"
                            required
                            className="form-input font-mono"
                        />
                    </div>
                    <div>
                        <label className="form-label">Son Ödeme Günü</label>
                        <input
                            name="paymentDueDay"
                            type="number"
                            min="1"
                            max="31"
                            defaultValue={card?.paymentDueDay ?? ''}
                            placeholder="5"
                            required
                            className="form-input font-mono"
                        />
                    </div>
                    <div>
                        <label className="form-label">Birikmiş Puan</label>
                        <input
                            name="rewardsPoints"
                            type="number"
                            defaultValue={card?.rewardsPoints ?? 0}
                            placeholder="0"
                            className="form-input font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="form-label">Hesap kesim tarihi</label>
                        <input name="statementDate" type="date" defaultValue={card?.statementDate ? new Date(card.statementDate).toISOString().slice(0, 10) : ''} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">Son ödeme tarihi</label>
                        <input name="dueDate" type="date" defaultValue={card?.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ''} className="form-input" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="form-label">Akdi Faiz (%)</label>
                        <input name="contractualRate" type="number" step="0.01" defaultValue={card?.contractualRate ?? 4.42} className="form-input font-mono text-sm" />
                    </div>
                    <div>
                        <label className="form-label">Gecikme (%)</label>
                        <input name="defaultRate" type="number" step="0.01" defaultValue={card?.defaultRate ?? 5.42} className="form-input font-mono text-sm" />
                    </div>
                    <div>
                        <label className="form-label">N. Avans (%)</label>
                        <input name="cashAdvanceRate" type="number" step="0.01" defaultValue={card?.cashAdvanceRate ?? 5.92} className="form-input font-mono text-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="form-label">Asgari Oran (%)</label>
                        <input 
                            name="minPaymentRate" 
                            type="number" 
                            min="0" max="100" step="0.01" 
                            value={minPaymentRate}
                            onChange={(e) => setMinPaymentRate(e.target.value ? Number(e.target.value) : '')}
                            className="form-input font-mono text-sm" 
                        />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                        <input
                            type="checkbox"
                            id="isNewCard"
                            name="isNewCard"
                            checked={isNewCard}
                            onChange={(e) => setIsNewCard(e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                        />
                        <label htmlFor="isNewCard" className="text-sm text-zinc-300">
                            Kart 1 yıldan yeni (BDDK kuralı gereği asgari %40)
                        </label>
                    </div>
                    <div>
                        <label className="form-label">KKDF (%)</label>
                        <input name="kkdfRate" type="number" min="0" max="100" step="0.01" defaultValue={toPercentInput(card?.kkdfRate, 0.15)} className="form-input font-mono text-sm" />
                    </div>
                    <div>
                        <label className="form-label">BSMV (%)</label>
                        <input name="bsmvRate" type="number" min="0" max="100" step="0.01" defaultValue={toPercentInput(card?.bsmvRate, 0.15)} className="form-input font-mono text-sm" />
                    </div>
                </div>

                {card ? (
                    <div>
                        <label className="form-label">Durum</label>
                        <select name="status" defaultValue={card.status} className="form-input form-select">
                            <option value="ACTIVE">Aktif</option>
                            <option value="FROZEN">Donduruldu</option>
                            <option value="CLOSED">Kapandı</option>
                        </select>
                    </div>
                ) : null}

                <div>
                    <label className="form-label">Açıklama</label>
                    <textarea name="description" defaultValue={card?.description ?? ''} placeholder="Kart notları, özel limit/ödeme bilgileri" className="form-input min-h-20" />
                </div>

                <div>
                    <label className="form-label">Kart Rengi</label>
                    <div className="flex gap-2 flex-wrap">
                        {CARD_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 scale-110' : 'opacity-60 hover:opacity-100'}`}
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
