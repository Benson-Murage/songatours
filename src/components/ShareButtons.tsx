import { Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

const ShareButtons = ({ url, title, description }: ShareButtonsProps) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || title);

  const shareLinks = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: <MessageCircle className="h-4 w-4" />,
      className: "bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,45%)]/20",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      className: "bg-[hsl(221,44%,41%)]/10 text-[hsl(221,44%,41%)] hover:bg-[hsl(221,44%,41%)]/20",
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
      className: "bg-foreground/5 text-foreground hover:bg-foreground/10",
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${link.className}`}
        >
          {link.icon}
          {link.name}
        </a>
      ))}
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        <Share2 className="h-3.5 w-3.5" />
        Copy Link
      </button>
    </div>
  );
};

export default ShareButtons;
