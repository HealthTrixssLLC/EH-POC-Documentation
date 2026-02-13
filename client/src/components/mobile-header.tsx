import { Link } from "wouter";
import { ChevronLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface MobileHeaderProps {
  title: string;
  onBack?: () => void;
  backHref?: string;
  rightAction?: ReactNode;
}

export function MobileHeader({ title, onBack, backHref, rightAction }: MobileHeaderProps) {
  const hasBack = !!(onBack || backHref);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[90] bg-[#2E456B] text-white ios-safe-top"
      data-testid="mobile-header"
    >
      <div className="flex items-center justify-between gap-2 px-3 h-[44px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasBack ? (
            backHref ? (
              <Link href={backHref}>
                <Button size="icon" variant="ghost" className="text-white shrink-0" data-testid="button-mobile-back">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Button size="icon" variant="ghost" className="text-white shrink-0" onClick={onBack} data-testid="button-mobile-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )
          ) : (
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#FEA002] shrink-0">
              <Stethoscope className="w-4 h-4 text-[#2E456B]" />
            </div>
          )}
          <span className="text-sm font-semibold truncate" data-testid="text-mobile-header-title">{title}</span>
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
    </div>
  );
}
