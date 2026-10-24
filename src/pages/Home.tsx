import { useEffect } from "react";
import { Link } from "react-router-dom";
import { InstagramButton } from "../components/InstagramButton";
import { ArrowIcon } from "../components/Icons";
import { Logo } from "../components/Logo";

export function Home() {
  useEffect(() => {
    document.title = "Cinora — Cinnamon rolls in Sheikhupura";
  }, []);

  return (
    <div className="page home">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <main id="main" className="column rise">
        <Logo as="h1" size="display" />
        <p className="intro">
          Handmade cinnamon rolls — baked fresh on the day of your order, delivered in Sheikhupura.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" to="/order">
            Place an order
            <ArrowIcon />
          </Link>
          <InstagramButton />
        </div>
        <p className="whisper">Ordering takes about two minutes.</p>
        <section className="cards" aria-label="How Cinora works">
          <article className="card">
            <h2>Delivery</h2>
            <p>Sheikhupura city only — we bring the rolls to your door.</p>
          </article>
          <article className="card">
            <h2>Order in two minutes</h2>
            <p>Pick a date, choose your rolls, send the payment screenshot. We confirm and it's done.</p>
          </article>
        </section>
      </main>
      <footer className="site-footer">
        <p>Made fresh in Sheikhupura · Cinora</p>
        <Link className="footer-admin" to="/admin">
          Admin
        </Link>
      </footer>
    </div>
  );
}
