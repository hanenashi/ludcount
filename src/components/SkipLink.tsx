import { useI18n } from "../i18n";

export function SkipLink({ targetId }: { targetId: string }) {
  const { t } = useI18n();

  return (
    <a className="skip-link" href={`#${targetId}`}>
      {t("common.skipToContent")}
    </a>
  );
}
