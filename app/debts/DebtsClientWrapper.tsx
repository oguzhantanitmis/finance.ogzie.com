'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addDebt } from '@/app/actions'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'

export default function DebtsClientWrapper() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn-primary"
            >
                <Plus className="w-4 h-4" /> Borç Ekle
            </button>

            {open && (
                <Modal title="Yeni Borç Ekle" onClose={() => setOpen(false)} size="md">
                    <form
                        action={async (formData) => {
                            await addDebt(formData)
                            setOpen(false)
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="form-label">Borç Adı</label>
                            <input
                                name="name"
                                placeholder="Örn: Konut Kredisi, Kredi Kartı"
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Tür</label>
                                <select name="type" className="form-input form-select" defaultValue="CREDIT_CARD">
                                    <option value="CREDIT_CARD">Kredi Kartı</option>
                                    <option value="LOAN">Banka Kredisi</option>
                                    <option value="KMH">KMH / Artı Para</option>
                                    <option value="PERSONAL">Şahsi Borç</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Faiz Oranı (%)</label>
                                <input
                                    name="interestRate"
                                    type="number"
                                    step="0.01"
                                    defaultValue="4.25"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Toplam Bakiye</label>
                            <input
                                name="totalBalance"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="form-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label">Kalan Bakiye</label>
                            <input
                                name="remainingBalance"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="btn-secondary flex-1"
                            >
                                İptal
                            </button>
                            <SubmitButton
                                label="Kaydet"
                                pendingLabel="Kaydediliyor..."
                                className="btn-primary flex-1"
                            />
                        </div>
                    </form>
                </Modal>
            )}
        </>
    )
}
