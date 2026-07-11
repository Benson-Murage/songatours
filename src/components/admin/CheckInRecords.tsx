import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Download, FileSpreadsheet, FileText, ClipboardList, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useCheckInRecords, type CheckInRecord } from "@/hooks/useCheckInRecords";
import { toast } from "sonner";

const PAGE = 25;

const CheckInRecords = () => {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const params = useMemo(
    () => ({
      search,
      action,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
      limit: PAGE,
      offset: page * PAGE,
    }),
    [search, action, from, to, page]
  );

  const { data, isLoading, refetch, isFetching } = useCheckInRecords(params);
  const rows = data?.rows || [];
  const total = data?.count || 0;

  const toFlat = (r: CheckInRecord) => ({
    "Date": format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    "Action": r.action,
    "Booking Ref": r.booking?.booking_reference || "",
    "Verification Code": r.booking?.verification_code || "",
    "Tour": r.booking?.tours?.title || "",
    "Departure": r.booking?.tours?.departure_date ? format(new Date(r.booking.tours.departure_date), "yyyy-MM-dd") : "",
    "Customer": r.booking?.profiles?.full_name || "",
    "Email": r.booking?.profiles?.email || "",
    "Participant": r.participant?.full_name || "(entire booking)",
    "Guests": r.booking?.guests_count ?? "",
    "Admin": r.admin?.full_name || r.admin?.email || "",
    "Device": r.device || "",
    "GPS": r.gps || "",
    "Notes": r.notes || "",
  });

  const exportCSV = () => {
    if (!rows.length) return toast.error("No records to export");
    const flat = rows.map(toFlat);
    const headers = Object.keys(flat[0]);
    const csv = [
      headers.join(","),
      ...flat.map((row) => headers.map((h) => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `checkins-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportXLSX = async () => {
    if (!rows.length) return toast.error("No records to export");
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map(toFlat));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Check-ins");
    XLSX.writeFile(wb, `checkins-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
  };

  const exportPDF = async () => {
    if (!rows.length) return toast.error("No records to export");
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Check-in Records", 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated ${format(new Date(), "d MMM yyyy HH:mm")}`, 14, 20);
    const flat = rows.map(toFlat);
    const headers = ["Date", "Action", "Booking Ref", "Tour", "Customer", "Participant", "Admin", "Notes"];
    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: flat.map((r: any) => headers.map((h) => r[h])),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    doc.save(`checkins-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" /> Check-in Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-6">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ref, code, customer, tour, admin..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="check_in">Check-ins</SelectItem>
              <SelectItem value="undo">Undo events</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={exportXLSX}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button size="sm" variant="outline" onClick={exportPDF}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          <div className="ml-auto text-sm text-muted-foreground self-center">
            {total} record{total === 1 ? "" : "s"}
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No check-in records found</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), "d MMM yyyy HH:mm")}</TableCell>
                  <TableCell>
                    {r.action === "undo" ? (
                      <Badge variant="destructive" className="gap-1"><RotateCcw className="h-3 w-3" />Undo</Badge>
                    ) : (
                      <Badge variant="secondary">Check-in</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{r.booking?.booking_reference}</div>
                    <div className="text-muted-foreground">{r.booking?.verification_code}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{r.booking?.tours?.title || "—"}</div>
                    {r.booking?.tours?.departure_date && (
                      <div className="text-muted-foreground">{format(new Date(r.booking.tours.departure_date), "d MMM yyyy")}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{r.booking?.profiles?.full_name || "—"}</div>
                    <div className="text-muted-foreground">{r.booking?.profiles?.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">{r.participant?.full_name || <span className="text-muted-foreground">Entire booking</span>}</TableCell>
                  <TableCell className="text-xs">{r.admin?.full_name || r.admin?.email || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={r.notes || ""}>{r.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckInRecords;
