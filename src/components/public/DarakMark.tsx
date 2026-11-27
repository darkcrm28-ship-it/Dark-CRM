import styles from "./DarakMark.module.css";

interface DarakMarkProps {
  animated?: boolean;
  className?: string;
}

export default function DarakMark({ animated = false, className = "" }: DarakMarkProps) {
  return (
    <span className={[styles.mark, animated && styles.assemble, className].filter(Boolean).join(" ")}>
      <img className={styles.logo} src="/images/darak-brand.webp" alt="DARAK Real Estate" width={512} height={512} />
      {animated && (
        <span className={styles.pieces} aria-hidden="true">
          <span /><span /><span />
        </span>
      )}
    </span>
  );
}
