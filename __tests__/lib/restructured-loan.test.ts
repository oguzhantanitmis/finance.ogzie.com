import { describe, expect, it } from 'vitest'

import {
    getRestructuredLoanDebtData,
    getRestructuredLoanPaymentPlanRows,
    RESTRUCTURED_LOAN_PROFILE,
} from '@/lib/restructured-loan'

describe('restructured loan profile', () => {
    it('pdf verileriyle birebir 12 taksit üretir', () => {
        const rows = getRestructuredLoanPaymentPlanRows('debt-1')

        expect(rows).toHaveLength(12)
        expect(rows[0]).toMatchObject({
            debtId: 'debt-1',
            installmentNo: 1,
            amount: 40565.77,
            principalAmount: 20535.7,
            interestAmount: 15407.75,
            taxAmount: 4622.32,
        })
        expect(rows[11]).toMatchObject({
            installmentNo: 12,
            amount: 40565.8,
            principalAmount: 38328.57,
            interestAmount: 1720.95,
            taxAmount: 516.28,
        })
    })

    it('kredi ana alanlarını sync için doğru döndürür', () => {
        const debtData = getRestructuredLoanDebtData()

        expect(debtData.totalPrincipal).toBe(RESTRUCTURED_LOAN_PROFILE.totalPrincipal)
        expect(debtData.totalBalance).toBe(486789.27)
        expect(debtData.remainingInstallments).toBe(12)
        expect(debtData.paymentDueDay).toBe(4)
        expect(debtData.dueDate.toISOString()).toContain('2026-04-04')
    })
})
