export default function Loading() {
  return (
    <div className="w-full space-y-4 animate-pulse p-4 sm:p-6">
      <div className="h-8 w-48 rounded-xl bg-slate-200" />
      <div className="h-4 w-72 rounded-lg bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
      </div>
      <div className="mt-6 h-64 rounded-2xl bg-slate-200" />
    </div>
  );
}

