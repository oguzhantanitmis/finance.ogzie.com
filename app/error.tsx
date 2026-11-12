'use client';
import Recovery, { type BoundaryProps } from '../components/Recovery';
export default function ErrorPage({ retry, reset }: BoundaryProps) { return <Recovery onRetry={retry ?? reset} />; }
