import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Instagram, Twitter, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Thanks for subscribing! 🎉");
    setEmail("");
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-accent" />
              <span className="text-lg font-bold">Songa</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Premium African travel experiences. Discover breathtaking destinations and create unforgettable memories.
            </p>
            <div className="flex gap-3">
              <a href="#" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/destinations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Destinations</Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-muted-foreground">info@songatravel.com</span>
              <span className="text-sm text-muted-foreground">+254 700 000 000</span>
              <span className="text-sm text-muted-foreground">Nairobi, Kenya</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get the latest deals & travel inspiration.
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
                required
              />
              <Button type="submit" variant="accent" size="sm" className="shrink-0">
                <Mail className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 Songa Travel & Tours. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
