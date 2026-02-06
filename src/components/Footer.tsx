import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-accent" />
            <span className="text-lg font-bold">Songa</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premium African travel experiences. Discover breathtaking destinations and create unforgettable memories.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Explore</h4>
          <div className="flex flex-col gap-2">
            <Link to="/destinations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Destinations</Link>
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Support</h4>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">info@songatravel.com</span>
            <span className="text-sm text-muted-foreground">+254 700 000 000</span>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Songa Travel & Tours. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
