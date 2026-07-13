import { ActivityLog } from "@/components/ActivityLog";
import { KpiCard } from "@/components/KpiCard";
import { QuickActionRail } from "@/components/QuickActionRail";
import { SellerHeader } from "@/components/SellerHeader";
import { activityItems, kpis, quickActions } from "@/data/catalog";

export default function DashboardPage() {
  return (
    <div className="dashboard-surface min-h-screen">
      <SellerHeader />
      <main className="mx-auto max-w-[1400px] px-5 py-6 md:px-7 md:py-8 xl:px-11">
        <section className="mb-7 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Venue overview</p>
            <h1 className="font-serif text-[38px] font-normal leading-none md:text-[clamp(38px,4vw,58px)]">Good evening, Maya.</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Track turf utilization, publish open slots, and keep player bookings moving.</p>
          </div>
          <div className="flex w-full gap-1.5 border border-line bg-white/60 p-1 md:w-auto">
            {["Today", "7 days", "30 days"].map((label) => (
              <button
                key={label}
                type="button"
                className={`min-h-[34px] flex-1 px-4 text-[13px] font-bold md:flex-none ${label === "7 days" ? "bg-olive text-white" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Key venue metrics" className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </section>

        <section className="mb-7 rounded-[7px] border border-line/90 bg-white/75 p-5 shadow-soft md:p-6" aria-labelledby="quick-actions-title">
          <div className="mb-4">
            <h2 id="quick-actions-title" className="font-serif text-[26px] font-normal leading-none">
              Quick actions
            </h2>
          </div>
          <QuickActionRail actions={quickActions} />
        </section>

        <section className="grid gap-7 xl:grid-cols-[minmax(260px,0.38fr)_minmax(0,0.62fr)]">
          <article className="rounded-[7px] border border-line/90 bg-white/75 p-5 shadow-soft md:p-7">
            <h2 className="font-serif text-[26px] font-normal leading-none">Slot attention</h2>
            <p className="mt-2 text-xs text-muted">Turfs with peak slots nearly full</p>
            <div className="mt-5 grid border-t border-line">
              {[
                ["Warehouse Court", "4 open"],
                ["Cage North 5-a-side", "6 peak"],
                ["After Dark Futsal", "5 late"],
              ].map(([name, count]) => (
                <div key={name} className="flex justify-between gap-4 border-b border-line py-4">
                  <span className="text-xs text-muted">{name}</span>
                  <strong className="text-[13px]">{count}</strong>
                </div>
              ))}
            </div>
          </article>

          <section className="rounded-[7px] border border-line/90 bg-white/75 p-5 shadow-soft md:p-7" aria-labelledby="activity-title">
            <h2 id="activity-title" className="font-serif text-[26px] font-normal leading-none">
              Recent log activity
            </h2>
            <p className="mt-2 text-xs text-muted">Latest venue events</p>
            <ActivityLog items={activityItems} />
          </section>
        </section>
      </main>
    </div>
  );
}
