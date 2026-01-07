import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import conversifiLogo from "@/assets/conversifi-logo.svg";
import conversifiLogoWhite from "@/assets/conversifi-logo-white.svg";

const NotFound = () => {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="glass-panel rounded-2xl p-8 text-center max-w-md w-full">
        <img 
          src={isDark ? conversifiLogoWhite : conversifiLogo} 
          alt="Conversifi" 
          className="h-10 mx-auto mb-8"
        />
        
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Button asChild className="gap-2">
          <Link to="/">
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
