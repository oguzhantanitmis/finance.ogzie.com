import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import PageShell from '@/components/PageShell'
import PersonDetailWorkspace from '@/components/people/PersonDetailWorkspace'
import { getPersonDetail } from '@/lib/people-service'
import { getAccounts } from '@/lib/account-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const { id } = await params

    let person
    try {
        person = await getPersonDetail(id, user.id)
    } catch {
        notFound()
    }

    const accounts = await getAccounts(user.id)

    // Serialize dates for client component
    const serializedPerson = {
        id: person.id,
        name: person.name,
        phone: person.phone,
        email: person.email,
        notes: person.notes,
        receivablesPayables: person.receivablesPayables.map((rp) => ({
            id: rp.id,
            type: rp.type,
            title: rp.title,
            category: rp.category,
            description: rp.description,
            principalAmount: rp.principalAmount,
            totalAmount: rp.totalAmount,
            originalAmount: rp.originalAmount,
            paidAmount: rp.paidAmount,
            remainingAmount: rp.remainingAmount,
            currency: rp.currency,
            startDate: rp.startDate?.toISOString() ?? null,
            dueDate: rp.dueDate?.toISOString() ?? null,
            status: rp.status,
            riskLevel: rp.riskLevel,
            paymentPlanType: rp.paymentPlanType,
            installmentPeriod: rp.installmentPeriod,
            internalNote: rp.internalNote,
            notes: rp.notes,
            createdAt: rp.createdAt.toISOString(),
            installments: rp.installments.map((installment) => ({
                id: installment.id,
                installmentNo: installment.installmentNo,
                dueDate: installment.dueDate.toISOString(),
                plannedAmount: installment.plannedAmount,
                paidAmount: installment.paidAmount,
                remainingAmount: installment.remainingAmount,
                status: installment.status,
                paidDate: installment.paidDate?.toISOString() ?? null,
                delayDays: installment.delayDays,
                description: installment.description,
                note: installment.note,
            })),
            transactions: rp.transactions.map((tx) => ({
                id: tx.id,
                amount: tx.amount,
                transactionDate: tx.transactionDate.toISOString(),
                description: tx.description,
                installmentId: tx.installmentId,
                account: tx.account ? { name: tx.account.name } : null,
            })),
            notesList: rp.notesList.map((note) => ({
                id: note.id,
                note: note.note,
                noteType: note.noteType,
                createdAt: note.createdAt.toISOString(),
            })),
            events: rp.events.map((event) => ({
                id: event.id,
                eventType: event.eventType,
                eventText: event.eventText,
                createdAt: event.createdAt.toISOString(),
            })),
        })),
    }

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <Link href="/people" className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Kişilere Dön
                </Link>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Kişi detayı</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{person.name}</h1>
            </header>
            <PersonDetailWorkspace person={serializedPerson} accounts={accounts} />
        </PageShell>
    )
}
