import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("ios-install-dismissed");
      if (!dismissed && isIOSSafari() && !isStandalone()) {
        const timer = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(timer);
      }
    } catch {
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem("ios-install-dismissed", "true"); } catch {}
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-card border-t p-4 ios-safe-bottom"
      data-testid="banner-ios-install"
    >
      <div className="flex items-start gap-3 max-w-lg mx-auto">
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" data-testid="text-ios-install-title">Install Easy Health</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for the best experience. Tap{" "}
            <Share className="w-3 h-3 inline-block align-text-bottom" />{" "}
            then "Add to Home Screen".
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          data-testid="button-dismiss-ios-install"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
