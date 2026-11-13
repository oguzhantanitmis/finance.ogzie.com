// Native abort covers response headers AND body; caller cancellation is preserved.
// No retries here: a timed-out mutation may already have completed.
export function boundedFetch(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
 const caller = init.signal ?? (input instanceof Request ? input.signal : undefined);
 const deadline = AbortSignal.timeout(timeoutMs);
 const signal = caller ? AbortSignal.any([caller, deadline]) : deadline;
 return fetch(input, { ...init, signal });
}
