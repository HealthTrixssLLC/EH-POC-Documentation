import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function usePlatform() {
  const isMobile = useIsMobile();
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
    setIsPWA(
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as any).standalone === true)
    );
  }, []);

  return {
    isMobile,
    isIOS,
    isPWA,
    isMobileLayout: isMobile,
  };
}
