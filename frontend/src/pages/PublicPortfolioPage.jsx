import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/brand/BrandLogo.jsx";
import PortfolioView from "../components/portfolio/PortfolioView.jsx";
import { getPublicPortfolio } from "../services/progressPortfolioApi.js";

function PublicPortfolioPage() {
  const { publicSlug } = useParams(); const [portfolio, setPortfolio] = useState(null); const [status, setStatus] = useState({ loading: true, error: "" });
  useEffect(() => { let current = true; getPublicPortfolio(publicSlug).then((result) => { if (current) setPortfolio(result.portfolio); }).catch((error) => { if (current) setStatus({ loading: false, error: error.status === 404 ? "This portfolio is private or unavailable." : "Unable to open this portfolio. Please try again." }); }).finally(() => { if (current) setStatus((value) => ({ ...value, loading: false })); }); return () => { current = false; }; }, [publicSlug]);
  return <main className="portfolio-public-page"><nav><Link to="/" aria-label="Futurion home"><BrandLogo compact /></Link><span>Student career portfolio</span></nav>{status.loading ? <div className="portfolio-public-state">Opening portfolio…</div> : status.error ? <div className="portfolio-public-state"><h1>Portfolio unavailable</h1><p>{status.error}</p></div> : <PortfolioView portfolio={portfolio} />}</main>;
}

export default PublicPortfolioPage;
