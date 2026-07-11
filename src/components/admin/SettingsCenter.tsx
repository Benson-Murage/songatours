import { useEffect, useState } from "react";
import { useAppSettings, useUpdateAppSettings, type AppSettings } from "@/hooks/useAppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

const SettingsCenter = () => {
  const { data, isLoading } = useAppSettings();
  const update = useUpdateAppSettings();
  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  if (isLoading || !form) return <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  const patch = <K extends keyof AppSettings>(section: K, value: Partial<AppSettings[K]>) =>
    setForm({ ...form, [section]: { ...(form[section] as any), ...value } });

  const save = async (section: keyof AppSettings) => {
    try {
      await update.mutateAsync({ [section]: form[section] } as any);
      toast.success(`${String(section)} settings saved`);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const SectionSave = ({ section }: { section: keyof AppSettings }) => (
    <Button onClick={() => save(section)} disabled={update.isPending} className="w-full sm:w-auto">
      {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
      Save changes
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Settings Center</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Company name</Label><Input value={form.company.name} onChange={(e) => patch("company", { name: e.target.value })} /></div>
              <div><Label>Tagline</Label><Input value={form.company.tagline} onChange={(e) => patch("company", { tagline: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.company.description} onChange={(e) => patch("company", { description: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.company.address} onChange={(e) => patch("company", { address: e.target.value })} /></div>
              <div><Label>Registration #</Label><Input value={form.company.registration_number} onChange={(e) => patch("company", { registration_number: e.target.value })} /></div>
              <div><Label>Tax ID / KRA PIN</Label><Input value={form.company.tax_id} onChange={(e) => patch("company", { tax_id: e.target.value })} /></div>
            </div>
            <SectionSave section="company" />
          </TabsContent>

          <TabsContent value="branding" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Logo URL</Label><Input value={form.branding.logo_url} onChange={(e) => patch("branding", { logo_url: e.target.value })} /></div>
              <div><Label>Favicon URL</Label><Input value={form.branding.favicon_url} onChange={(e) => patch("branding", { favicon_url: e.target.value })} /></div>
              <div><Label>Primary color</Label><Input type="color" value={form.branding.primary_color} onChange={(e) => patch("branding", { primary_color: e.target.value })} /></div>
              <div><Label>Accent color</Label><Input type="color" value={form.branding.accent_color} onChange={(e) => patch("branding", { accent_color: e.target.value })} /></div>
            </div>
            <SectionSave section="branding" />
          </TabsContent>

          <TabsContent value="contact" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Support email</Label><Input type="email" value={form.contact.support_email} onChange={(e) => patch("contact", { support_email: e.target.value })} /></div>
              <div><Label>Sales email</Label><Input type="email" value={form.contact.sales_email} onChange={(e) => patch("contact", { sales_email: e.target.value })} /></div>
              <div><Label>Primary phone</Label><Input value={form.contact.phone_primary} onChange={(e) => patch("contact", { phone_primary: e.target.value })} /></div>
              <div><Label>Secondary phone</Label><Input value={form.contact.phone_secondary} onChange={(e) => patch("contact", { phone_secondary: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={form.contact.whatsapp} onChange={(e) => patch("contact", { whatsapp: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Address (one per line)</Label>
                <Textarea rows={3} value={(form.contact.address_lines || []).join("\n")} onChange={(e) => patch("contact", { address_lines: e.target.value.split("\n") })} />
              </div>
            </div>
            <SectionSave section="contact" />
          </TabsContent>

          <TabsContent value="financial" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Currency code</Label><Input value={form.financial.currency} onChange={(e) => patch("financial", { currency: e.target.value })} /></div>
              <div><Label>Currency symbol</Label><Input value={form.financial.currency_symbol} onChange={(e) => patch("financial", { currency_symbol: e.target.value })} /></div>
              <div><Label>Bank name</Label><Input value={form.financial.bank_name} onChange={(e) => patch("financial", { bank_name: e.target.value })} /></div>
              <div><Label>Bank account name</Label><Input value={form.financial.bank_account_name} onChange={(e) => patch("financial", { bank_account_name: e.target.value })} /></div>
              <div><Label>Bank account #</Label><Input value={form.financial.bank_account_number} onChange={(e) => patch("financial", { bank_account_number: e.target.value })} /></div>
              <div><Label>Branch</Label><Input value={form.financial.bank_branch} onChange={(e) => patch("financial", { bank_branch: e.target.value })} /></div>
              <div><Label>SWIFT</Label><Input value={form.financial.bank_swift} onChange={(e) => patch("financial", { bank_swift: e.target.value })} /></div>
              <div><Label>M-Pesa Paybill</Label><Input value={form.financial.mpesa_paybill} onChange={(e) => patch("financial", { mpesa_paybill: e.target.value })} /></div>
              <div><Label>M-Pesa Till</Label><Input value={form.financial.mpesa_till} onChange={(e) => patch("financial", { mpesa_till: e.target.value })} /></div>
              <div><Label>M-Pesa account name</Label><Input value={form.financial.mpesa_account_name} onChange={(e) => patch("financial", { mpesa_account_name: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Payment instructions</Label><Textarea rows={3} value={form.financial.payment_instructions} onChange={(e) => patch("financial", { payment_instructions: e.target.value })} /></div>
            </div>
            <SectionSave section="financial" />
          </TabsContent>

          <TabsContent value="social" className="space-y-3 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {(["instagram", "facebook", "twitter", "tiktok", "youtube", "linkedin"] as const).map((k) => (
                <div key={k}><Label className="capitalize">{k}</Label>
                  <Input placeholder="https://..." value={form.social[k]} onChange={(e) => patch("social", { [k]: e.target.value } as any)} />
                </div>
              ))}
            </div>
            <SectionSave section="social" />
          </TabsContent>

          <TabsContent value="more" className="space-y-4 pt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Business hours</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const).map((day) => (
                  <div key={day} className="flex items-center gap-2">
                    <Label className="capitalize w-24">{day}</Label>
                    <Input value={form.business_hours[day] || ""} onChange={(e) => patch("business_hours", { [day]: e.target.value } as any)} placeholder="08:00-18:00 or Closed" />
                  </div>
                ))}
              </div>
              <SectionSave section="business_hours" />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">SEO defaults</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Default title</Label><Input value={form.seo.default_title} onChange={(e) => patch("seo", { default_title: e.target.value })} /></div>
                <div><Label>OG image URL</Label><Input value={form.seo.og_image} onChange={(e) => patch("seo", { og_image: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Default description</Label><Textarea rows={2} value={form.seo.default_description} onChange={(e) => patch("seo", { default_description: e.target.value })} /></div>
                <div className="md:col-span-2"><Label>Keywords (comma-separated)</Label>
                  <Input value={(form.seo.keywords || []).join(", ")} onChange={(e) => patch("seo", { keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                </div>
              </div>
              <SectionSave section="seo" />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">PWA</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>App name</Label><Input value={form.pwa.app_name} onChange={(e) => patch("pwa", { app_name: e.target.value })} /></div>
                <div><Label>Short name</Label><Input value={form.pwa.short_name} onChange={(e) => patch("pwa", { short_name: e.target.value })} /></div>
                <div><Label>Theme color</Label><Input type="color" value={form.pwa.theme_color} onChange={(e) => patch("pwa", { theme_color: e.target.value })} /></div>
                <div><Label>Background color</Label><Input type="color" value={form.pwa.background_color} onChange={(e) => patch("pwa", { background_color: e.target.value })} /></div>
              </div>
              <SectionSave section="pwa" />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Notification preferences</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-sm">Admin email alerts</span><Switch checked={form.notifications.admin_email_alerts} onCheckedChange={(v) => patch("notifications", { admin_email_alerts: v })} /></div>
                <div className="flex items-center justify-between"><span className="text-sm">New booking alerts</span><Switch checked={form.notifications.new_booking_alert} onCheckedChange={(v) => patch("notifications", { new_booking_alert: v })} /></div>
                <div className="flex items-center justify-between"><span className="text-sm">Payment alerts</span><Switch checked={form.notifications.payment_alert} onCheckedChange={(v) => patch("notifications", { payment_alert: v })} /></div>
                <div className="flex items-center justify-between"><span className="text-sm">Low-seat alerts</span><Switch checked={form.notifications.low_seat_alert} onCheckedChange={(v) => patch("notifications", { low_seat_alert: v })} /></div>
                <div><Label className="text-xs">Capacity alert threshold (%)</Label><Input type="number" min={1} max={100} value={form.notifications.capacity_alert_threshold} onChange={(e) => patch("notifications", { capacity_alert_threshold: Number(e.target.value) })} /></div>
              </div>
              <SectionSave section="notifications" />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Legal page URLs</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div><Label>Terms</Label><Input value={form.legal.terms_url} onChange={(e) => patch("legal", { terms_url: e.target.value })} /></div>
                <div><Label>Privacy</Label><Input value={form.legal.privacy_url} onChange={(e) => patch("legal", { privacy_url: e.target.value })} /></div>
                <div><Label>Refund</Label><Input value={form.legal.refund_url} onChange={(e) => patch("legal", { refund_url: e.target.value })} /></div>
              </div>
              <SectionSave section="legal" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SettingsCenter;
