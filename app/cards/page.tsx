import { permanentRedirect } from 'next/navigation'

export default async function CardsPage() {
    permanentRedirect('/debts')
}
