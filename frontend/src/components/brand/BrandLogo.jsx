import logo from "../../assets/futurion-logo.png";

function BrandLogo({ className = "", compact = false, alt = "Futurion — Plan, Learn, Grow" }) {
  return <span className={`brand-logo ${compact ? "brand-logo-compact" : ""} ${className}`}><img src={logo} alt={alt} /></span>;
}

export default BrandLogo;
