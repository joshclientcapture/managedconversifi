import { Moon, Sun, LogOut, Settings, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import conversifiLogo from "@/assets/conversifi-logo.svg";
import conversifiLogoWhite from "@/assets/conversifi-logo-white.svg";

interface HeaderProps {
  hideLogout?: boolean;
}

const Header = ({ hideLogout = false }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        if (!error && data === true) {
          setIsAdmin(true);
        }
      }
    };
    checkAdminRole();
  }, []);

  const handleThemeToggle = () => {
    setIsTransitioning(true);
    setIsDark(!isDark);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/auth");
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
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center">
              <img
                src={isDark ? conversifiLogoWhite : conversifiLogo}
                alt="Conversifi"
                className={`h-8 sm:h-10 transition-all duration-300 ${isTransitioning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}
              />
            </Link>

            {/* Navigation Links - Only show on admin pages */}
            {location.pathname !== "/" && isAdmin && (
              <nav className="hidden md:flex items-center gap-1">
                <Link to="/admin">
                  <Button
                    variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
                <Link to="/setup">
                  <Button
                    variant={location.pathname === "/setup" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Setup
                  </Button>
                </Link>
                <Link to="/taskboard">
                  <Button
                    variant={location.pathname === "/taskboard" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Tasks
                  </Button>
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
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
            {!hideLogout && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="rounded-full"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Log out</span>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
