'use client';

import { ExampleStatus } from '@/features/example/components/example-status';

export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-6 py-16 text-slate-900">
      <ExampleStatus />
    </div>
  );
}
