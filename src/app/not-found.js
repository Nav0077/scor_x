'use client';
import Link from 'next/link';
import { FiAlertTriangle } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-6">
        <FiAlertTriangle size={40} />
      </div>
      <h1 className="text-4xl font-black text-slate-100 mb-2">404 - Out of Bounds</h1>
      <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
        It looks like that delivery went over the boundary line and was lost. The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className="btn-primary">
        Back to Pavilion
      </Link>
    </div>
  );
}
