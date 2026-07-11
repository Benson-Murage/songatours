import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Instagram, Twitter, Facebook, Youtube, Linkedin, Phone, MapPin } from "lucide-react";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";

const Footer = () => {
  const [email, setEmail] = useState("");
  const { data: settings } = useAppSettings();

  const supportEmail = settings?.contact.support_email || "salmajeods11@gmail.com";
  const phone = settings?.contact.phone_primary || "";
  const address = (settings?.contact.address_lines || []).filter(Boolean);
  const name = settings?.company.name || "Songa Travel & Tours";
  const description = settings?.company.description || "Premium African travel experiences.";
  const social = settings?.social || {} as any;
  const legal = settings?.legal || { terms_url: "/terms", privacy_url: "/privacy", refund_url: "/refund-policy" };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Thanks for subscribing! 🎉");
    setEmail("");
  };

  const socialLinks = [
    { key: "instagram", Icon: Instagram, url: social.instagram },
    { key: "twitter", Icon: Twitter, url: social.twitter },
    { key: "facebook", Icon: Facebook, url: social.facebook },
    { key: "youtube", Icon: Youtube, url: social.youtube },
    { key: "linkedin", Icon: Linkedin, url: social.linkedin },
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4"><AppLogo size="lg" linkTo={false} /></div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map(({ key, Icon, url }) => (
                  <a key={key} href={url} target="_blank" rel="noreferrer"
                     className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                     aria-label={key}>
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
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
            <h4 className="font-semibold mb-4">Legal</h4>
            <div className="flex flex-col gap-2.5">
              <Link to={legal.privacy_url} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to={legal.terms_url} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link>
              <Link to={legal.refund_url} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 hover:text-foreground">
                <Mail className="h-4 w-4" /> <span className="break-all">{supportEmail}</span>
              </a>
              {phone && <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-foreground"><Phone className="h-4 w-4" /> {phone}</a>}
              {address.length > 0 && (
                <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>{address.join(", ")}</span></div>
              )}
            </div>
            <form onSubmit={handleNewsletter} className="mt-4 flex gap-2" aria-label="Newsletter signup">
              <label htmlFor="newsletter-email" className="sr-only">Newsletter email</label>
              <Input id="newsletter-email" type="email" placeholder="Newsletter email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-sm" required />
              <Button type="submit" variant="accent" size="sm" className="shrink-0" aria-label="Subscribe"><Mail className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
