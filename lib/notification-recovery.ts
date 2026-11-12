export function withNotificationTimeout<T>(request: Promise<T>, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Notification request timed out')), timeoutMs)
        request.then(
            value => { clearTimeout(timer); resolve(value) },
            error => { clearTimeout(timer); reject(error) },
        )
    })
}

export async function loadNotificationAlerts<T>(
    generate: () => Promise<{ success: boolean }>,
    read: () => Promise<{ success: boolean; alerts?: T[] }>,
    timeoutMs = 10000,
): Promise<T[]> {
    const generated = await withNotificationTimeout(generate(), timeoutMs)
    if (!generated.success) throw new Error('Notification generation failed')
    const result = await withNotificationTimeout(read(), timeoutMs)
    if (!result.success || !result.alerts) throw new Error('Notification read failed')
    return result.alerts
}
