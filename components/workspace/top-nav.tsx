import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const tabs = ["工作台", "创作项目", "资料库"];

export function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-100 text-teal-700">
            艺
          </div>
          <span className="text-lg font-semibold text-slate-800">艺术家 Workspace</span>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {tabs.map((tab, index) => (
            <Button
              key={tab}
              variant={index === 1 ? "default" : "ghost"}
              size="sm"
              className={index === 1 ? "bg-teal-600 text-white" : "text-slate-600"}
            >
              {tab}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <label className="hidden text-sm text-slate-500 sm:block">角色</label>
          <select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
            <option>Artist</option>
            <option>Editor</option>
            <option>Viewer</option>
          </select>
          <Avatar>
            <AvatarFallback>?</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
