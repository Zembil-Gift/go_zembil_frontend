import { useTranslation } from "react-i18next";

export default function OfflineFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-eagle-green mb-3">
          {t("You are offline")}
        </h1>
        <p className="text-gray-600 mb-6">
          {t("This page needs a network connection. Please reconnect and try again.")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-eagle-green px-4 text-sm font-medium text-white hover:bg-viridian-green"
            onClick={() => window.location.reload()}
          >
            {t("Retry")}
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-eagle-green/30 px-4 text-sm font-medium text-eagle-green hover:bg-eagle-green/5"
          >
            {t("Go Home")}
          </a>
        </div>
      </div>
    </div>
  );
}
