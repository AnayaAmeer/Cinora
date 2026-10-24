import { Component, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Presence } from "./components/Presence";
import { OrderProvider } from "./context/OrderContext";
import { AdminDesk, AdminOrder } from "./pages/Admin";
import { Confirmation } from "./pages/Confirmation";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Order } from "./pages/Order";

type BoundaryProps = { children: ReactNode };
type BoundaryState = { failed: boolean };

class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="sheet">
          <h1 className="logo logo-mid">
            Cinora<span className="logo-dot">.</span>
          </h1>
          <p className="lede">Something went wrong. Please refresh the page and try the order again.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <OrderProvider>
          <Presence />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/order" element={<Order />} />
            <Route path="/order/confirmed/:orderId" element={<Confirmation />} />
            <Route path="/admin" element={<AdminDesk />} />
            <Route path="/admin/:orderId" element={<AdminOrder />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OrderProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
