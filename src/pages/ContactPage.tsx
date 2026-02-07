import { useState } from "react";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email"),
  message: z.string().trim().min(1, "Message is required").max(1000),
});

const contactInfo = [
  { icon: Mail, label: "Email", value: "info@songatravel.com" },
  { icon: Phone, label: "Phone", value: "+254 700 000 000" },
  { icon: MapPin, label: "Office", value: "Nairobi, Kenya" },
];

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
      setLoading(false);
    }, 800);
  };

  return (
    <Layout>
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground">
            Have questions about a tour? Want a custom itinerary? We'd love to hear from you.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="grid gap-4">
              {contactInfo.map((c) => (
                <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="font-medium">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl overflow-hidden h-48 bg-muted">
              <iframe
                title="Songa office location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255282.35853743268!2d36.68225025!3d-1.3028618!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2sus!4v1600000000000"
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
                required
                maxLength={1000}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <Button type="submit" variant="accent" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Send Message
            </Button>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
