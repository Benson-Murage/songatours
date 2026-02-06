import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, MapPin, User, LogOut, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 glass">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-accent" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Songa
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            to="/destinations"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Destinations
          </Link>

          {!user ? (
            <Link to="/auth">
              <Button variant="accent" size="sm">
                Sign In
              </Button>
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-2 ring-border transition-all hover:ring-primary">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> My Trips
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <Link
              to="/destinations"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-muted-foreground"
            >
              Destinations
            </Link>
            {!user ? (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button variant="accent" className="w-full">
                  Sign In
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-muted-foreground"
                >
                  My Trips
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="text-left text-sm font-medium text-destructive"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
