import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, MapPin, User, LogOut, Briefcase, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const navLinks = [
  { to: "/destinations", label: "Destinations" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const location = useLocation();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const isActive = (path: string) => location.pathname === path;

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
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                isActive(link.to) ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

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
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
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

        {/* Mobile Drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="md:hidden" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-border p-4">
                <MapPin className="h-5 w-5 text-accent" />
                <span className="text-lg font-bold">Songa</span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.to}>
                    <Link
                      to={link.to}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary ${
                        isActive(link.to) ? "bg-secondary text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                {user && (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
                      >
                        <Briefcase className="h-4 w-4" /> My Trips
                      </Link>
                    </SheetClose>
                    {isAdmin && (
                      <SheetClose asChild>
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
                        >
                          <Shield className="h-4 w-4" /> Admin
                        </Link>
                      </SheetClose>
                    )}
                  </>
                )}
              </div>
              <div className="border-t border-border p-4">
                {!user ? (
                  <SheetClose asChild>
                    <Link to="/auth">
                      <Button variant="accent" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};

export default Navbar;
