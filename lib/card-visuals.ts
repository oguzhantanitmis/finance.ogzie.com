export interface CardVisualMatch {
    bankName: string
    cardProgram: string
    logoPath: string | null
    cardImagePath: string | null
    themeColor: string
}

const CARD_VISUALS: CardVisualMatch[] = [
    { bankName: 'Garanti BBVA', cardProgram: 'Bonus', logoPath: null, cardImagePath: null, themeColor: '#13A538' },
    { bankName: 'Akbank', cardProgram: 'Axess', logoPath: null, cardImagePath: null, themeColor: '#E30613' },
    { bankName: 'Yapı Kredi', cardProgram: 'World', logoPath: null, cardImagePath: null, themeColor: '#6D28D9' },
    { bankName: 'İş Bankası', cardProgram: 'Maximum', logoPath: null, cardImagePath: null, themeColor: '#1D4ED8' },
    { bankName: 'Halkbank', cardProgram: 'Paraf', logoPath: null, cardImagePath: null, themeColor: '#0EA5E9' },
    { bankName: 'QNB', cardProgram: 'CardFinans', logoPath: null, cardImagePath: null, themeColor: '#7C2D12' },
    { bankName: 'Akbank', cardProgram: 'Wings', logoPath: null, cardImagePath: null, themeColor: '#0F766E' },
    { bankName: 'Garanti BBVA', cardProgram: 'Miles&Smiles', logoPath: null, cardImagePath: null, themeColor: '#0F172A' },
    { bankName: 'Enpara', cardProgram: 'Enpara', logoPath: null, cardImagePath: null, themeColor: '#7C3AED' },
    { bankName: 'Troy', cardProgram: 'Troy', logoPath: null, cardImagePath: null, themeColor: '#2563EB' },
]

function normalize(value: string) {
    return value
        .toLocaleLowerCase('tr-TR')
        .replaceAll('&', ' ')
        .replaceAll('.', ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

export function resolveCardVisual(bankName: string, cardName: string, cardProgram?: string | null): CardVisualMatch {
    const haystack = normalize(`${bankName} ${cardName} ${cardProgram ?? ''}`)
    const match = CARD_VISUALS.find((item) => {
        const bank = normalize(item.bankName)
        const program = normalize(item.cardProgram)
        return haystack.includes(bank) || haystack.includes(program)
    })

    return match ?? {
        bankName,
        cardProgram: cardProgram || cardName.split(' ')[0] || 'Kart',
        logoPath: null,
        cardImagePath: null,
        themeColor: '#334155',
    }
}
