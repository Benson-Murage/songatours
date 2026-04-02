import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, Copy, FileText, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatKES } from "@/lib/formatKES";
import { LOGO_BASE64 } from "@/lib/logoBase64";

interface Props {
  tours: any[];
}

const TourManifest = ({ tours }: Props) => {
  const [selectedTour, setSelectedTour] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: participants, isLoading } = useQuery({
    queryKey: ["admin-participants", selectedTour, selectedDate],
    queryFn: async () => {
      // Use raw rpc-style query to avoid deep type instantiation
      const params: Record<string, string> = {};
      let selectStr = "*, bookings!inner(id, booking_reference, start_date, guests_count, status, phone_number, special_requests, tour_id, tours!inner(title, destinations(name)))";

      let query = (supabase as any)
        .from("participants")
        .select(selectStr)
        .in("bookings.status", ["pending", "paid"]);

      if (selectedTour !== "all") {
        query = query.eq("bookings.tour_id", selectedTour);
      }
      if (selectedDate) {
        query = query.eq("bookings.start_date", selectedDate);
      }

      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filtered = useMemo(() => {
    if (!participants) return [];
    if (!search.trim()) return participants;
    const q = search.toLowerCase();
    return participants.filter((p: any) =>
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.phone_number || "").toLowerCase().includes(q) ||
      (p.nationality || "").toLowerCase().includes(q) ||
      (p.bookings?.booking_reference || "").toLowerCase().includes(q)
    );
  }, [participants, search]);

  const uniqueDates = useMemo(() => {
    if (!participants) return [];
    const dates = new Set(participants.map((p: any) => p.bookings?.start_date).filter(Boolean));
    return Array.from(dates).sort();
  }, [participants]);

  const copyPhoneNumbers = useCallback(() => {
    const phones = filtered
      .map((p: any) => p.phone_number?.trim())
      .filter(Boolean)
      .map((ph: string) => {
        // Normalize to international format
        let n = ph.replace(/[\s\-()]/g, "");
        if (n.startsWith("0")) n = "+254" + n.slice(1);
        if (!n.startsWith("+")) n = "+" + n;
        return n;
      });
    const unique = Array.from(new Set(phones));
    navigator.clipboard.writeText(unique.join("\n"));
    toast.success(`${unique.length} phone number(s) copied to clipboard`);
  }, [filtered]);

  const downloadManifest = useCallback(() => {
    if (!filtered.length) return;

    const tourTitle = selectedTour !== "all"
      ? tours.find((t) => t.id === selectedTour)?.title || "Tour"
      : "All Tours";
    const dateStr = selectedDate || "all-dates";

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Tour Manifest — ${tourTitle}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f5f5f5; text-align: left; padding: 8px 12px; border: 1px solid #ddd; font-weight: 600; }
  td { padding: 8px 12px; border: 1px solid #ddd; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 32px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<h1>🗺️ Tour Manifest — ${tourTitle}</h1>
<p class="meta">${selectedDate ? `Departure: ${new Date(selectedDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}` : "All Dates"} • ${filtered.length} participant(s)</p>
<table>
  <thead><tr>
    <th>#</th><th>Name</th><th>Phone</th><th>Nationality</th>
    <th>Emergency Contact</th><th>Dietary Needs</th><th>Booking Ref</th><th>Notes</th>
  </tr></thead>
  <tbody>
    ${filtered.map((p: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.full_name || "—"}</td>
      <td>${p.phone_number || "—"}</td>
      <td>${p.nationality || "—"}</td>
      <td>${p.emergency_contact || "—"}</td>
      <td>${p.dietary_requirements || "—"}</td>
      <td>${p.bookings?.booking_reference || "—"}</td>
      <td>${p.bookings?.special_requests || "—"}</td>
    </tr>`).join("")}
  </tbody>
</table>
<div class="footer">
  Generated by Songa Travel & Tours • ${new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${tourTitle.replace(/\s+/g, "-").toLowerCase()}-${dateStr}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Manifest downloaded — open in browser and print to PDF");
  }, [filtered, selectedTour, selectedDate, tours]);

  const exportParticipantsCSV = useCallback(() => {
    if (!filtered.length) return;
    const headers = ["Name", "Phone", "Email", "Nationality", "Emergency Contact", "Dietary Needs", "Booking Ref", "Tour", "Departure Date", "Special Requests"];
    const rows = filtered.map((p: any) => [
      p.full_name, p.phone_number, p.email || "", p.nationality || "",
      p.emergency_contact || "", p.dietary_requirements || "",
      p.bookings?.booking_reference || "", p.bookings?.tours?.title || "",
      p.bookings?.start_date || "", p.bookings?.special_requests || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Participants CSV exported");
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedTour} onValueChange={(v) => { setSelectedTour(v); setSelectedDate(""); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select Tour" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tours</SelectItem>
            {tours.filter((t) => t.status === "published" || t.status === "completed").map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniqueDates.length > 0 && (
          <Select value={selectedDate || "all"} onValueChange={(v) => setSelectedDate(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Departure Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              {uniqueDates.map((d) => (
                <SelectItem key={d} value={d}>
                  {new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search participants..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-sm text-muted-foreground flex-1">{filtered.length} participant{filtered.length !== 1 ? "s" : ""}</p>
        <Button variant="outline" size="sm" onClick={copyPhoneNumbers} disabled={!filtered.length}>
          <Copy className="mr-1 h-4 w-4" /> Copy All Phone Numbers
        </Button>
        <Button variant="outline" size="sm" onClick={exportParticipantsCSV} disabled={!filtered.length}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
        <Button variant="accent" size="sm" onClick={downloadManifest} disabled={!filtered.length}>
          <FileText className="mr-1 h-4 w-4" /> Download Manifest
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-56 rounded-xl" />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Nationality</th>
                <th className="px-4 py-3 font-medium">Emergency Contact</th>
                <th className="px-4 py-3 font-medium">Dietary Needs</th>
                <th className="px-4 py-3 font-medium">Tour</th>
                <th className="px-4 py-3 font-medium">Departure</th>
                <th className="px-4 py-3 font-medium">Booking Ref</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any, i: number) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{p.full_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <a href={`tel:${p.phone_number}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3 w-3" />{p.phone_number}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.nationality || "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.emergency_contact || "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.dietary_requirements || "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.bookings?.tours?.title || "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.bookings?.start_date ? new Date(p.bookings.start_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{p.bookings?.booking_reference || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No participants found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TourManifest;
