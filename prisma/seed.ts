import 'dotenv/config'
import { PrismaClient, DebtType, AssetType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding started...')

    // Temizle
    await prisma.transaction.deleteMany()
    await prisma.debt.deleteMany()
    await prisma.asset.deleteMany()
    await prisma.user.deleteMany()

    const email = 'admin@ogzie.com'
    const password = await bcrypt.hash('admin123', 10)

    // Kullanıcı Oluştur
    const user = await prisma.user.create({
        data: {
            email,
            name: 'Oguzhan Tanitmis',
            password,
            netWorth: 0,
            riskScore: 85
        }
    })

    console.log(`User created: ${user.id}`)

    // Varlıklar (Assets)
    await prisma.asset.createMany({
        data: [
            {
                userId: user.id,
                name: 'Ziraat Vadesiz',
                type: AssetType.BANK,
                amount: 15400,
                currency: 'TRY'
            },
            {
                userId: user.id,
                name: 'Fiziki Altın',
                type: AssetType.GOLD,
                amount: 10, // Gram
                unitPrice: 2450,
                currency: 'XAU'
            },
            {
                userId: user.id,
                name: 'Binance USDT',
                type: AssetType.CRYPTO,
                amount: 1250,
                currency: 'USD'
            },
            {
                userId: user.id,
                name: 'Nakit (Cüzdan)',
                type: AssetType.CASH,
                amount: 850,
                currency: 'TRY'
            }
        ]
    })

    console.log('Assets seeded.')

    // Borçlar (Debts) - V2 Bankacılık Verileri

    // 1. Kredi Kartı
    await prisma.debt.create({
        data: {
            user: { connect: { id: user.id } },
            name: 'Garanti Bonus',
            type: DebtType.CREDIT_CARD,
            limit: 150000,
            cutOffDay: 10,
            paymentDueDay: 20,
            totalBalance: 24500.50, // Ekstre borcu
            remainingBalance: 24500.50,
            interestRate: 4.25,
            minPaymentRate: 0.40, // Limit > 50k
        }
    })

    // 2. İhtiyaç Kredisi (Ödeme Planı ile)
    // Taksit Tablosunu Hesapla (Basit simülasyon)
    // Banking engine import edilemediği durumlarda manuel hesap veya basit veri
    // Burada manuel ekliyoruz çünkü tsx path alias sorunu yaşayabiliriz

    const principal = 100000
    const loanRate = 3.99
    const installments = 12
    const monthlyPayment = 11500 // Yaklaşık

    // Geçmiş taksitler ödenmiş varsayalım (4 taksit ödenmiş)
    const paymentPlanData = Array.from({ length: installments }).map((_, i) => {
        const isPaid = i < 4
        return {
            installmentNo: i + 1,
            amount: monthlyPayment,
            principalAmount: monthlyPayment * 0.7, // Mock oran
            interestAmount: monthlyPayment * 0.2,
            taxAmount: monthlyPayment * 0.1,
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + (i - 4))), // 4 ay önce başladı
            isPaid: isPaid,
            paidDate: isPaid ? new Date() : null
        }
    })

    await prisma.debt.create({
        data: {
            user: { connect: { id: user.id } },
            name: 'Yapı Kredi İhtiyaç',
            type: DebtType.LOAN,
            totalPrincipal: principal,
            installments: installments,
            remainingInstallments: installments - 4,
            totalBalance: principal,
            remainingBalance: (installments - 4) * monthlyPayment, // Kalan toplam ödeme
            interestRate: loanRate,
            paymentPlan: {
                create: paymentPlanData
            }
        }
    })

    // 3. KMH (Eksi Hesap)
    await prisma.debt.create({
        data: {
            user: { connect: { id: user.id } },
            name: 'Enpara Ek Hesap',
            type: DebtType.KMH,
            limit: 20000,
            totalBalance: 5400, // Kullanılan
            remainingBalance: 5400,
            interestRate: 5.00,
        }
    })

    console.log('Debts seeded.')
    console.log('Seeding completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
