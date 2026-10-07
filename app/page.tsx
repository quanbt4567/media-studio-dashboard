import { ArrowUpRight, CalendarDays, FolderOpen, LayoutGrid, Settings, Users } from "lucide-react";
import Generator from "./components/generator";

const navItems = [
  { label: "Studio", icon: LayoutGrid, active: true },
  { label: "Content library", icon: FolderOpen },
  { label: "Calendar", icon: CalendarDays },
  { label: "Team", icon: Users },
];

export default function Home() {
  return <main className="min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
    <aside className="flex border-b border-[var(--line)] bg-white/55 px-5 py-5 backdrop-blur-xl lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-bold text-[var(--lime)]">C</div><div><p className="text-sm font-extrabold tracking-tight">clubhouse</p><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">media desk</p></div></div>
      <nav className="ml-auto grid grid-cols-4 gap-1 lg:ml-0 lg:mt-10 lg:block lg:space-y-1">{navItems.map(({ label, icon: Icon, active }) => <a className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold lg:justify-start ${active ? "bg-white shadow-[0_8px_24px_rgba(22,37,34,.08)]" : "text-[var(--muted)] hover:bg-white/70"}`} href="#" key={label}><Icon size={16} strokeWidth={1.8} /><span className="hidden sm:inline">{label}</span></a>)}</nav>
      <div className="mt-auto hidden border-t border-[var(--line)] pt-5 lg:block"><a className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-[var(--muted)]" href="#"><Settings size={16} />Workspace settings</a><p className="mt-8 px-3 font-mono text-[10px] uppercase tracking-[.15em] text-[#a4afa5]">Spring / 2025</p></div>
    </aside>
    <section className="studio-canvas min-h-screen px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-8 flex items-end justify-between gap-5 entrance"><div><p className="mb-2 font-mono text-[11px] uppercase tracking-[.2em] text-[var(--orange)]">Wednesday, March 12 / Studio 01</p><h1 className="text-3xl font-black tracking-[-.06em] sm:text-5xl">Content, with intention.</h1><p className="mt-2 text-sm text-[var(--muted)]">Write, refine, and approve your next club story in one focused workspace.</p></div><button className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2.5 text-xs font-extrabold shadow-sm backdrop-blur sm:flex">View live site <ArrowUpRight size={14} /></button></header>
        <Generator />
      </div>
    </section>
  </main>;
}
