import { Link } from "react-router-dom";
import songaLogo from "@/assets/songa-logo.png";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  linkTo?: string | false;
  showText?: boolean;
}

const sizeMap = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
  xl: "h-20",
};

const AppLogo = ({ className, size = "md", linkTo = "/", showText = false }: AppLogoProps) => {
  const logo = (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={songaLogo}
        alt="Songa Travel & Tours"
        className={cn(sizeMap[size], "w-auto object-contain")}
        loading="eager"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      {showText && (
        <span className="font-bold text-foreground text-lg tracking-tight">
          Songa Travel & Tours
        </span>
      )}
    </div>
  );

  if (linkTo === false) return logo;

  return (
    <Link to={linkTo} className="inline-flex">
      {logo}
    </Link>
  );
};

export default AppLogo;
