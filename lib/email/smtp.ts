import nodemailer, { type SendMailOptions } from 'nodemailer'

type MailAddress = string

interface SmtpConfig {
    host: string
    port: number
    secure: boolean
    from: string
    auth?: {
        user: string
        pass: string
    }
    replyTo?: string
}

export interface SmtpStatus {
    configured: boolean
    host: string | null
    port: number | null
    from: string | null
    missing: string[]
}

interface WelcomeEmailInput {
    to: MailAddress
    name?: string | null
    email: string
    password: string
    role: 'USER' | 'SUPERUSER'
}

function env(name: string) {
    return process.env[name]?.trim() || ''
}

function parseBoolean(value: string | undefined, fallback: boolean) {
    if (!value) return fallback
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function parsePort(value: string) {
    const parsed = Number.parseInt(value, 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function appUrl() {
    const explicit = env('APP_URL') || env('NEXTAUTH_URL')
    if (explicit) return explicit.replace(/\/+$/, '')

    const vercelUrl = env('VERCEL_PROJECT_PRODUCTION_URL') || env('VERCEL_URL')
    if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, '')

    return 'https://finance.ogzie.com'
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function assertEmail(value: string) {
    const normalized = value.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        throw new Error('Gecerli bir e-posta adresi girin.')
    }
    return normalized
}

export function getSmtpStatus(): SmtpStatus {
    const host = env('SMTP_HOST')
    const port = parsePort(env('SMTP_PORT'))
    const from = env('SMTP_FROM')
    const user = env('SMTP_USER')
    const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
    const missing: string[] = []

    if (!host) missing.push('SMTP_HOST')
    if (!port) missing.push('SMTP_PORT')
    if (!from) missing.push('SMTP_FROM')
    if ((user && !password) || (!user && password)) {
        missing.push(user ? 'SMTP_PASSWORD' : 'SMTP_USER')
    }

    return {
        configured: missing.length === 0,
        host: host || null,
        port,
        from: from || null,
        missing,
    }
}

export function isSmtpConfigured() {
    return getSmtpStatus().configured
}

function getSmtpConfig(): SmtpConfig {
    const status = getSmtpStatus()
    if (!status.configured || !status.host || !status.port || !status.from) {
        throw new Error(`SMTP yapilandirmasi eksik: ${status.missing.join(', ')}`)
    }

    const user = env('SMTP_USER')
    const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''

    return {
        host: status.host,
        port: status.port,
        secure: parseBoolean(process.env.SMTP_SECURE, status.port === 465),
        from: status.from,
        replyTo: env('SMTP_REPLY_TO') || undefined,
        auth: user && password ? { user, pass: password } : undefined,
    }
}

export async function sendMail(options: Omit<SendMailOptions, 'from'> & { to: MailAddress }) {
    const config = getSmtpConfig()
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
    })

    return transporter.sendMail({
        ...options,
        from: config.from,
        replyTo: config.replyTo,
        to: assertEmail(options.to),
    })
}

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
    const loginUrl = `${appUrl()}/login`
    const safeName = escapeHtml(input.name || input.email)
    const safeEmail = escapeHtml(input.email)
    const safePassword = escapeHtml(input.password)
    const roleLabel = input.role === 'SUPERUSER' ? 'Superuser' : 'Kullanici'

    return sendMail({
        to: input.to,
        subject: 'Ogzie Finans hesabin hazir',
        text: [
            `Merhaba ${input.name || input.email},`,
            '',
            'Ogzie Finans hesabin olusturuldu.',
            `Giris adresi: ${loginUrl}`,
            `E-posta: ${input.email}`,
            `Gecici sifre: ${input.password}`,
            `Rol: ${roleLabel}`,
            '',
            'Ilk giristen sonra Ayarlar sayfasindan sifreni degistirmeni oneririz.',
        ].join('\n'),
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
                <h2>Ogzie Finans hesabin hazir</h2>
                <p>Merhaba ${safeName},</p>
                <p>Ogzie Finans hesabin olusturuldu. Asagidaki bilgilerle giris yapabilirsin.</p>
                <table style="border-collapse:collapse;margin:18px 0">
                    <tr><td style="padding:6px 12px;color:#6b7280">Giris adresi</td><td style="padding:6px 12px"><a href="${loginUrl}">${loginUrl}</a></td></tr>
                    <tr><td style="padding:6px 12px;color:#6b7280">E-posta</td><td style="padding:6px 12px">${safeEmail}</td></tr>
                    <tr><td style="padding:6px 12px;color:#6b7280">Gecici sifre</td><td style="padding:6px 12px"><strong>${safePassword}</strong></td></tr>
                    <tr><td style="padding:6px 12px;color:#6b7280">Rol</td><td style="padding:6px 12px">${roleLabel}</td></tr>
                </table>
                <p>Guvenlik icin ilk giristen sonra Ayarlar sayfasindan sifreni degistir.</p>
            </div>
        `,
    })
}

export async function sendSmtpTestEmail(to: string, requestedBy: string) {
    const safeRequestedBy = escapeHtml(requestedBy)
    return sendMail({
        to,
        subject: 'Ogzie Finans SMTP testi',
        text: `SMTP baglantisi calisiyor. Testi baslatan hesap: ${requestedBy}`,
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
                <h2>SMTP baglantisi calisiyor</h2>
                <p>Bu mesaj Ogzie Finans admin panelinden gonderilen test e-postasidir.</p>
                <p><strong>Testi baslatan:</strong> ${safeRequestedBy}</p>
            </div>
        `,
    })
}
