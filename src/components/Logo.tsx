import { Link } from "react-router-dom";

type LogoTag = "h1" | "p" | "span";

type LogoProps = {
  as?: LogoTag;
  size?: "display" | "mid" | "bar";
  to?: string;
  ariaLabel?: string;
};

export function Logo({ as: Tag = "p", size = "display", to, ariaLabel }: LogoProps) {
  const className = `logo logo-${size}`;
  const mark = (
    <>
      Cinora<span className="logo-dot">.</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} aria-label={ariaLabel}>
        {mark}
      </Link>
    );
  }

  return <Tag className={className}>{mark}</Tag>;
}
