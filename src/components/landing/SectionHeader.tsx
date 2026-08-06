import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** When set, renders a "See all" link on the same row as the title. */
  href?: string;
  /** Same slot as `href`, but stays on the page (expand in place). */
  onSeeAll?: () => void;
  /** Overrides the "See all" wording for either variant. */
  seeAllLabel?: string;
}

/**
 * Compact storefront section header: title left, "See all" right, on one row.
 * Replaces the centred title + rule + subtitle stack, which cost ~160px of
 * vertical space above every product grid.
 */
export default function SectionHeader({
  title,
  subtitle,
  href,
  onSeeAll,
  seeAllLabel,
}: SectionHeaderProps) {
  const { t } = useTranslation();

  const seeAllClass =
    "shrink-0 inline-flex items-center gap-0.5 text-sm font-medium text-viridian-green hover:text-eagle-green transition-colors whitespace-nowrap pb-1";

  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tight">
          {title}
        </h2>
        <div className="w-10 h-0.5 bg-ethiopian-gold rounded-full mt-2"></div>
        {subtitle && (
          <p className="mt-2 text-sm sm:text-base font-light text-gray-600">
            {subtitle}
          </p>
        )}
      </div>

      {onSeeAll ? (
        <button type="button" onClick={onSeeAll} className={seeAllClass}>
          {seeAllLabel ?? t("common.seeAll")}
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : href ? (
        <Link to={href} className={seeAllClass}>
          {seeAllLabel ?? t("common.seeAll")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
