/**
 * Public Ed25519 trust anchor for the user-owned Hermes command signer.
 *
 * This value is intentionally committed: it contains verification material
 * only and never the private `d` field. An environment value takes precedence
 * in the route so Dokploy can rotate the trust anchor without a code release.
 */
export const BUNDLED_HERMES_COMMAND_PUBLIC_JWK = JSON.stringify({
    kty: 'OKP',
    crv: 'Ed25519',
    x: 'abnP-JNfQzmd4oN3rQIHnk3zHF2S043KW8qMJK_qCo4',
    kid: 'hermes-838fbd7d5e2700c0',
    alg: 'EdDSA',
    use: 'sig',
})
