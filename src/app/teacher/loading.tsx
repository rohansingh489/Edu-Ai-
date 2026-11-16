export default function TeacherLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-8 w-56 rounded-xl bg-slate-200" />
      <div className="h-4 w-80 rounded-lg bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
      <div className="mt-6 h-72 rounded-2xl bg-slate-200" />
    </div>
  );
}

