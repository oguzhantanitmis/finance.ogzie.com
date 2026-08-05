import { permanentRedirect } from 'next/navigation'

export default async function CardDetailPage() {
    permanentRedirect('/debts')
}
