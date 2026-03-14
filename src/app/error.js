'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6 text-3xl font-black">
        !
      </div>
      <h1 className="text-3xl font-black text-slate-100 mb-2">Something went wrong</h1>
      <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
        {error.message || 'We encountered an unexpected error while processing this page. Our groundsmen are on it!'}
      </p>
      
      <div className="flex gap-4">
        <button onClick={() => reset()} className="btn-primary bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/30">
          Try Again
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
