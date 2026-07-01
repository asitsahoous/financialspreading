import FinancialSpreadingACOS from "./acos/FinancialSpreadingACOS";

export default function App() {
  return (
    <div className="app-root">
      <header className="app-banner">
        <div>
          <strong>Financial Spreading ACOS</strong>
          <span className="app-banner-sub">Agentic Credit OS · Engineering prototype</span>
        </div>
        <span className="app-banner-meta">Iron Mountain DXP · Commercial Lending</span>
      </header>
      <main className="app-main">
        <FinancialSpreadingACOS />
      </main>
    </div>
  );
}
