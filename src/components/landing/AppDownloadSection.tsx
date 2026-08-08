import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { Bell, Gift, ShieldCheck, Truck } from "lucide-react";

// ponytail: dummy store links until the real listings exist — swap these two.
const ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.gogerami.app";
const IOS_URL = "https://apps.apple.com/app/gogerami/id0000000000";
const SMART_LINK = "https://gogerami.com/app";

function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 3-.85.96-2.25 1.7-3.4 1.6a3.9 3.9 0 0 1 1.1-3c.78-.85 2.2-1.5 3.42-1.6zM20.7 17.1c-.6 1.4-.9 2-1.67 3.24-1.08 1.73-2.6 3.88-4.48 3.9-1.67.02-2.1-1.09-4.37-1.08-2.27.01-2.74 1.1-4.41 1.08-1.88-.02-3.32-1.97-4.4-3.7-3.02-4.84-3.34-10.53-1.47-13.55C1.3 3.83 3.02 3 4.63 3c1.65 0 2.68 1.1 4.05 1.1 1.33 0 2.14-1.1 4.05-1.1 1.43 0 2.95.78 4.03 2.13-3.54 1.94-2.96 7 .94 8.42.94.28 1.6.36 3 3.55z" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

function StoreButton({
  href,
  icon,
  top,
  bottom,
}: {
  href: string;
  icon: React.ReactNode;
  top: string;
  bottom: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-ethiopian-gold/60 hover:bg-white/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(253,203,45,0.5)]"
    >
      <span className="text-white transition-colors group-hover:text-ethiopian-gold">
        {icon}
      </span>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-widest text-white/60">
          {top}
        </span>
        <span className="text-base font-bold text-white">{bottom}</span>
      </span>
    </a>
  );
}

/** The phone: pure CSS/markup, no screenshot asset to keep in sync. */
function PhoneMockup() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px]">
      {/* glow behind the device */}
      <div className="absolute -inset-10 rounded-full bg-ethiopian-gold/20 blur-[70px]" />

      <div className="relative animate-float-y rounded-[2.5rem] border border-white/20 bg-gradient-to-b from-white/25 to-white/5 p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-light-cream">
          {/* notch */}
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-charcoal/90" />

          {/* app header */}
          <div className="bg-eagle-green px-4 pb-4 pt-8 text-white">
            <div className="flex items-center gap-2">
              <img
                src="/attached_assets/go-gerami.png"
                alt=""
                className="h-6 w-6 object-contain"
              />
              <span className="text-sm font-extrabold tracking-tight">
                goGerami
              </span>
              <Bell className="ml-auto h-4 w-4 opacity-80" />
            </div>
            <div className="mt-3 rounded-full bg-white/15 px-3 py-2 text-[10px] text-white/70">
              {t("Search gifts, events, services…")}
            </div>
          </div>

          <div className="space-y-3 p-3">
            {/* promo card */}
            <div className="rounded-xl bg-gradient-to-r from-ethiopian-gold to-[#FFA62B] p-3">
              <p className="text-[11px] font-extrabold leading-tight text-charcoal">
                {t("Send a gift home today")}
              </p>
              <p className="mt-0.5 text-[9px] font-medium text-charcoal/70">
                {t("Delivered across Ethiopia")}
              </p>
            </div>

            {/* product grid */}
            <div className="grid grid-cols-2 gap-2">
              {["#11A0A0", "#01405C", "#FDCB2D", "#8C5E3C"].map((c) => (
                <div
                  key={c}
                  className="overflow-hidden rounded-lg bg-white shadow-sm"
                >
                  <div
                    className="aspect-square"
                    style={{ backgroundColor: `${c}33` }}
                  />
                  <div className="space-y-1 p-1.5">
                    <div className="h-1.5 w-4/5 rounded-full bg-charcoal/15" />
                    <div
                      className="h-1.5 w-1/2 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* bottom nav */}
          <div className="flex items-center justify-around border-t border-charcoal/5 bg-white px-4 py-2.5">
            {[Gift, Truck, ShieldCheck].map((Icon, i) => (
              <Icon
                key={i}
                className={`h-4 w-4 ${
                  i === 0 ? "text-viridian-green" : "text-charcoal/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* floating delivery toast */}
      <div className="absolute -left-6 bottom-16 hidden animate-float-y rounded-xl border border-white/20 bg-white/95 px-3 py-2 shadow-xl [animation-delay:-2s] sm:block">
        <p className="text-[10px] font-bold text-charcoal">
          {t("Gift delivered 🎁")}
        </p>
        <p className="text-[9px] text-charcoal/60">{t("Bole, Addis Ababa")}</p>
      </div>
    </div>
  );
}

export default function AppDownloadSection() {
  const { t } = useTranslation();

  const perks = [
    t("Track every delivery live"),
    t("App-only drops & cashback"),
    t("Pay in ETB or USD, securely"),
  ];

  return (
    <section id="get-the-app" className="scroll-mt-24 py-10">
      <div className="page-shell">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-eagle-green via-[#02536F] to-viridian-green px-6 py-12 sm:px-10 lg:px-14">
          {/* ambient light */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ethiopian-gold/20 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-viridian-green/30 blur-[120px]" />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-ethiopian-gold/40 bg-ethiopian-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ethiopian-gold">
                {t("New")} · {t("goGerami Mobile")}
              </span>

              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {t("Gifting home,")}{" "}
                <span className="text-ethiopian-gold">
                  {t("now in your pocket")}
                </span>
              </h2>

              <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/75">
                {t(
                  "Order gifts, book services and grab event tickets in seconds — then watch them arrive, live, from anywhere in the world."
                )}
              </p>

              <ul className="mt-6 space-y-2">
                {perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-center gap-2.5 text-sm text-white/85"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ethiopian-gold/20 text-[11px] font-bold text-ethiopian-gold">
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <StoreButton
                  href={IOS_URL}
                  icon={<AppleIcon className="h-7 w-7" />}
                  top={t("Download on the")}
                  bottom={t("App Store")}
                />
                <StoreButton
                  href={ANDROID_URL}
                  icon={<PlayIcon className="h-6 w-6" />}
                  top={t("Get it on")}
                  bottom={t("Google Play")}
                />

                <div className="hidden items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-2 pr-4 backdrop-blur-sm xl:flex">
                  <div className="rounded-lg bg-white p-1.5">
                    <QRCodeSVG value={SMART_LINK} size={48} level="M" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-white/70">
                    {t("Scan to")}
                    <br />
                    {t("download")}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[11px] text-white/50">
                {t("Free · iOS 14+ and Android 8+")}
              </p>
            </div>

            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
