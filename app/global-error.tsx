'use client';
import Recovery, { type BoundaryProps } from '../components/Recovery';
export default function GlobalError({ retry, reset }: BoundaryProps) {
 return <html lang="tr"><body className="recovery-document"><title>Bir sorun oluştu</title><main><Recovery onRetry={retry ?? reset} /></main></body></html>;
}
