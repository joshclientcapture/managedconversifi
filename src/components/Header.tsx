import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import conversifiLogo from "@/assets/conversifi-logo.svg";
import conversifiLogoWhite from "@/assets/conversifi-logo-white.svg";

const Header = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDark(true);
    } else if (savedTheme === "light") {
      setIsDark(false);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
    }
  }, []);

  const handleThemeToggle = () => {
    setIsTransitioning(true);
    setIsDark(!isDark);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  return (
    <>
      {/* Theme transition overlay */}
      <div 
        className={`fixed inset-0 pointer-events-none z-[100] transition-opacity duration-500 ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: isDark 
            ? 'radial-gradient(circle at center, rgba(27, 68, 152, 0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 70%)'
        }}
      />
      
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img 
              src={isDark ? conversifiLogoWhite : conversifiLogo} 
              alt="Conversifi" 
              className={`h-8 sm:h-10 transition-all duration-300 ${isTransitioning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}
            />
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className={`rounded-full transition-transform duration-300 ${isTransitioning ? 'rotate-180 scale-110' : 'rotate-0 scale-100'}`}
          >
            <Sun className={`h-5 w-5 transition-all duration-300 ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'} absolute`} />
            <Moon className={`h-5 w-5 transition-all duration-300 ${isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>
    </>
  );
};

export default Header;
