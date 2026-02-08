import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </Button>
  );
}
