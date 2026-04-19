import { User } from "lucide-react";
import { useProjectionStore } from "@/store/projectionStore";
import { cn } from "@/lib/utils";

const ACCOUNT_ROLE: Record<string, string> = {
  user:       "Account Holder",
  industry:   "Chief Financial Officer",
  government: "Budget Director",
};

interface ConsoleTopBarProps {
  sidebarExpanded: boolean;
}

export function ConsoleTopBar({ sidebarExpanded }: ConsoleTopBarProps) {
  const accountType = useProjectionStore((s) => s.accountType);
  const roleTitle   = accountType ? ACCOUNT_ROLE[accountType] : "Account Holder";

  return (
    <div className="h-12 flex-shrink-0 flex items-center pr-5 bg-white/[0.45] backdrop-blur-[20px] border-b border-border z-20">

      {/* Left: logo — tracks sidebar width */}
      <div
        className={cn(
          "flex-shrink-0 h-full flex items-center gap-2.5 px-5 border-r border-primary/[0.09] overflow-hidden",
          "transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          sidebarExpanded ? "w-[200px]" : "w-[56px]"
        )}
      >
        <div className="w-7 h-7 rounded-full bg-primary/[0.11] border border-primary/[0.22] flex items-center justify-center text-[9px] font-black text-primary tracking-tight flex-shrink-0">
          EW
        </div>
        {sidebarExpanded && (
          <div>
            <div className="text-[11px] font-extrabold text-[hsl(242_44%_26%)] leading-none tracking-tight">
              ElectraWireless
            </div>
            <div className="text-[9px] font-medium text-[hsl(247_20%_57%)] leading-snug mt-0.5 tracking-wide">
              Business Console
            </div>
          </div>
        )}
      </div>

      {/* Centre: account type pill + role title */}
      <div className="flex-1 flex items-center gap-2 px-5">
        {accountType && (
          <>
            <span className="text-[10.5px] font-bold text-primary bg-primary/[0.08] px-[9px] py-[3px] rounded-[5px] tracking-[0.04em] capitalize">
              {accountType}
            </span>
            <span className="text-muted-foreground/70 text-[13px] leading-none">›</span>
          </>
        )}
        <span className="text-xs font-medium text-[hsl(242_20%_40%)] tracking-[0.01em]">
          {roleTitle}
        </span>
      </div>

      {/* Right: profile avatar */}
      <div className="flex items-center flex-shrink-0">
        <div
          className="w-[30px] h-[30px] rounded-full bg-primary/[0.09] border border-primary/[0.18] flex items-center justify-center cursor-default flex-shrink-0"
          title="Profile (coming soon)"
        >
          <User size={14} className="text-primary" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
