export const BSMV_RATE = 0.15;
export const KKDF_RATE = 0.15;

/**
 * Kredi Kartı Faiz Hesaplama
 * Gecikme veya akdi faiz uygulanırken vergi oranları (BSMV+KKDF) faiz oranına eklenir.
 */
export function calculateCCInterest(
    balance: number,
    monthlyInterestRate: number, // örn: 0.04 (4%)
    days: number = 30
) {
    const dailyRate = monthlyInterestRate / 30;
    const baseInterest = balance * dailyRate * days;
    const taxes = baseInterest * (BSMV_RATE + KKDF_RATE);
    return {
        baseInterest,
        taxes,
        totalInterestWithTaxes: baseInterest + taxes,
    };
}

/**
 * KMH (Ek Hesap) Günlük Faiz Hesaplama
 * KMH'da faiz günlük işler ve ay sonunda BSMV+KKDF ile beraber tahsil edilir.
 */
export function calculateKMHInterest(
    negativeBalance: number,
    monthlyInterestRate: number,
    days: number = 1
) {
    const dailyRate = monthlyInterestRate / 30;
    const baseInterest = Math.abs(negativeBalance) * dailyRate * days;
    const taxes = baseInterest * (BSMV_RATE + KKDF_RATE);
    return {
        baseInterest,
        taxes,
        totalInterestWithTaxes: baseInterest + taxes,
    };
}

/**
 * Risk Skoru Hesaplama (0-100)
 * Borç/Varlık oranı, ödeme gecikmeleri ve nakit akışına göre dinamik skor.
 */
export function calculateRiskScore(assets: number, debts: number, monthlyIncome: number) {
    if (assets === 0 && debts > 0) return 100;
    if (debts === 0) return 0;

    const debtToAssetRatio = debts / assets;
    const debtToIncomeRatio = debts / (monthlyIncome || 1);

    let score = (debtToAssetRatio * 50) + (debtToIncomeRatio * 20);

    return Math.min(Math.max(Math.round(score), 0), 100);
}
