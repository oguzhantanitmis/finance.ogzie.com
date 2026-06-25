import type { Prisma } from '@prisma/client'

/**
 * "Gerçekleşen" toplam/aggregate sorgularından ogzie forecast (tahmin) satırlarını
 * dışlayan ortak Prisma where koşulu. externalId deseni
 * `${assetType}:${assetId}:${mode}:${periodKey}` → forecast satırları `:forecast:`
 * içerir. `NOT` yalnız HER İKİ koşulu (source='ogzie' VE `:forecast:`) sağlayan
 * satırları dışlar; yerel satırlar (source=null) ve `:actual:` satırlar etkilenmez.
 *
 * TEK kaynak: gerçekleşen toplam üreten her sorgu bunu import etmeli (report-service,
 * ledger-service summary/export). Liste/detay görünümleri uygulamaz (forecast görünebilir).
 */
export const EXCLUDE_OGZIE_FORECAST = {
  NOT: { source: 'ogzie', externalId: { contains: ':forecast:' } },
} satisfies Prisma.LedgerEntryWhereInput
