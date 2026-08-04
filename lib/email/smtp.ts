import nodemailer from 'nodemailer9'
import type { SendMailOptions } from 'nodemailer'

type MailAddress = string

interface SmtpConfig {
    host: string
    port: number
    secure: boolean
    from: string
    auth?: { user: string; pass: string }
    replyTo?: string
}

export interface SmtpStatus {
    configured: boolean
    provider: 'resend' | 'custom' | 'none'
    host: string | null
    port: number | null
    from: string | null
    missing: string[]
}

function env(name: string) {
    return process.env[name]?.trim() || ''
}

function parseBoolean(value: string | undefined, fallback: boolean) {
    if (!value) return fallback
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function parsePort(value: string) {
    const p = Number.parseInt(value, 10)
    return Number.isInteger(p) && p > 0 ? p : null
}

export function appUrl() {
    const explicit = env('APP_URL') || env('NEXTAUTH_URL')
    if (explicit) return explicit.replace(/\/+$/, '')
    const vercelUrl = env('VERCEL_PROJECT_PRODUCTION_URL') || env('VERCEL_URL')
    if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, '')
    return 'https://finance.ogzie.com'
}

function escapeHtml(v: string) {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function assertEmail(value: string) {
    const n = value.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)) throw new Error('Geçerli bir e-posta adresi girin.')
    return n
}

/** Resend SMTP relay yapılandırması:
 *  host=smtp.resend.com  port=587  user=resend  pass=re_... */
function detectProvider(host: string): SmtpStatus['provider'] {
    if (!host) return 'none'
    if (host === 'smtp.resend.com') return 'resend'
    return 'custom'
}

export function getSmtpStatus(): SmtpStatus {
    const host = env('SMTP_HOST')
    const port = parsePort(env('SMTP_PORT'))
    const from = env('SMTP_FROM')
    const user = env('SMTP_USER')
    const pass = env('SMTP_PASSWORD') || env('SMTP_PASS') || ''
    const missing: string[] = []

    if (!host) missing.push('SMTP_HOST')
    if (!port) missing.push('SMTP_PORT')
    if (!from) missing.push('SMTP_FROM')
    if ((user && !pass) || (!user && pass)) missing.push(user ? 'SMTP_PASSWORD' : 'SMTP_USER')

    return {
        configured: missing.length === 0,
        provider: detectProvider(host),
        host:     host || null,
        port,
        from:     from || null,
        missing,
    }
}

export function isSmtpConfigured() {
    return getSmtpStatus().configured
}

function getSmtpConfig(): SmtpConfig {
    const status = getSmtpStatus()
    if (!status.configured || !status.host || !status.port || !status.from) {
        throw new Error(`SMTP yapılandırması eksik: ${status.missing.join(', ')}`)
    }

    const user = env('SMTP_USER')
    const pass = env('SMTP_PASSWORD') || env('SMTP_PASS') || ''

    return {
        host:    status.host,
        port:    status.port,
        secure:  parseBoolean(process.env.SMTP_SECURE, status.port === 465),
        from:    status.from,
        replyTo: env('SMTP_REPLY_TO') || undefined,
        auth:    user && pass ? { user, pass } : undefined,
    }
}

export async function sendMail(options: Omit<SendMailOptions, 'from'> & { to: MailAddress }) {
    const config = getSmtpConfig()
    const transporter = nodemailer.createTransport({
        host:   config.host,
        port:   config.port,
        secure: config.secure,
        auth:   config.auth,
    })

    return transporter.sendMail({
        ...options,
        from:    config.from,
        replyTo: config.replyTo,
        to:      assertEmail(options.to),
    })
}

// ─── E-posta şablonları ──────────────────────────────────────────────────────

function baseTemplate(content: string) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Ogzie Finans</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:40px;background:#3b82f6;border-radius:10px;text-align:center;vertical-align:middle">
                <span style="color:#fff;font-size:18px;font-weight:700;line-height:40px">O</span>
              </td>
              <td style="padding-left:10px;vertical-align:middle">
                <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.05em">OGZIE FİNANS</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Kart -->
        <tr><td style="background:#111111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:20px">
          <p style="color:#52525b;font-size:11px;margin:0">
            Bu e-posta otomatik olarak gönderilmiştir — lütfen yanıtlamayın.<br>
            © ${new Date().getFullYear()} Ogzie Finans · <a href="${appUrl()}" style="color:#3b82f6;text-decoration:none">finance.ogzie.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendWelcomeEmail(input: {
    to: MailAddress
    name?: string | null
    email: string
    password: string
    role: 'USER' | 'SUPERUSER'
}) {
    const loginUrl   = `${appUrl()}/login`
    const safeName   = escapeHtml(input.name || input.email)
    const safeEmail  = escapeHtml(input.email)
    const safePass   = escapeHtml(input.password)
    const roleLabel  = input.role === 'SUPERUSER' ? 'Superuser' : 'Kullanıcı'

    const html = baseTemplate(`
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px">Hesabın hazır 🎉</h2>
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px">Merhaba <strong style="color:#fff">${safeName}</strong>, Ogzie Finans hesabın oluşturuldu.</p>

        <table cellpadding="0" cellspacing="0" width="100%" style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:24px">
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="color:#71717a;font-size:12px;display:block;margin-bottom:2px">Giriş adresi</span>
              <a href="${loginUrl}" style="color:#3b82f6;font-size:14px;text-decoration:none">${loginUrl}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="color:#71717a;font-size:12px;display:block;margin-bottom:2px">E-posta</span>
              <span style="color:#fff;font-size:14px">${safeEmail}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
              <span style="color:#71717a;font-size:12px;display:block;margin-bottom:2px">Geçici şifre</span>
              <span style="color:#34d399;font-size:16px;font-weight:700;font-family:monospace">${safePass}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px">
              <span style="color:#71717a;font-size:12px;display:block;margin-bottom:2px">Rol</span>
              <span style="color:#fff;font-size:14px">${roleLabel}</span>
            </td>
          </tr>
        </table>

        <p style="color:#a1a1aa;font-size:13px;margin:0 0 20px">
          Güvenliğin için ilk girişten sonra <strong style="color:#fff">Ayarlar → Şifre Değiştir</strong> bölümünden şifreni güncelle.
        </p>

        <table cellpadding="0" cellspacing="0"><tr><td>
          <a href="${loginUrl}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:10px;text-decoration:none">
            Giriş Yap →
          </a>
        </td></tr></table>
    `)

    const text = [
        `Merhaba ${input.name || input.email},`,
        '',
        'Ogzie Finans hesabın oluşturuldu.',
        `Giriş: ${loginUrl}`,
        `E-posta: ${input.email}`,
        `Geçici şifre: ${input.password}`,
        `Rol: ${roleLabel}`,
        '',
        'Güvenliğin için ilk girişten sonra şifreni değiştir.',
    ].join('\n')

    return sendMail({ to: input.to, subject: 'Ogzie Finans hesabın hazır', text, html })
}

export async function sendPasswordResetEmail(input: { to: MailAddress; name?: string | null; token: string }) {
    const resetUrl  = `${appUrl()}/login?reset=${input.token}`
    const safeName  = escapeHtml(input.name || input.to)

    const html = baseTemplate(`
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px">Şifre sıfırlama</h2>
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px">
          Merhaba <strong style="color:#fff">${safeName}</strong>,<br>
          Şifre sıfırlama talebinde bulundun. Aşağıdaki butona tıkla.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td>
          <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:10px;text-decoration:none">
            Şifremi Sıfırla →
          </a>
        </td></tr></table>

        <p style="color:#71717a;font-size:12px;margin:0">
          Bu link 1 saat geçerlidir. Eğer bu isteği sen yapmadıysan bu e-postayı yok say.
        </p>
    `)

    const text = `Şifre sıfırlama linki (1 saat geçerli): ${resetUrl}`
    return sendMail({ to: input.to, subject: 'Ogzie Finans — Şifre sıfırlama', text, html })
}

export async function sendSmtpTestEmail(to: string, requestedBy: string) {
    const html = baseTemplate(`
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px">SMTP testi başarılı ✅</h2>
        <p style="color:#a1a1aa;font-size:14px;margin:0">
          Bu mesaj Ogzie Finans admin panelinden gönderildi.<br>
          <strong style="color:#fff">Testi başlatan:</strong> ${escapeHtml(requestedBy)}
        </p>
    `)
    return sendMail({
        to,
        subject: 'Ogzie Finans — SMTP testi',
        text:    `SMTP çalışıyor. Testi başlatan: ${requestedBy}`,
        html,
    })
}
