import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { Logo } from "../components/Logo";

export function NotFound() {
  useEffect(() => {
    document.title = "Page not found — Cinora";
  }, []);

  return (
    <div className="page">
      <main className="sheet">
        <Logo size="mid" to="/" ariaLabel="Cinora, go to homepage" />
        <div className="rule" aria-hidden="true" />
        <h1 className="step-title center">This page is not on the menu.</h1>
        <p className="lede">The bake you asked for is not here.</p>
        <div className="actions">
          <Link className="btn btn-primary" to="/">
            Back to Cinora
            <ArrowIcon />
          </Link>
        </div>
      </main>
      <footer className="site-footer">Made fresh in Sheikhupura · Cinora</footer>
    </div>
  );
}
