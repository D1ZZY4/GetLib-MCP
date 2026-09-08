interface PageContainerProps {
  children: React.ReactNode;
  variant?: "default" | "narrow" | "center";
  role?: string;
  ariaLabel?: string;
}

const VARIANT_CLASSES: Record<NonNullable<PageContainerProps["variant"]>, string> = {
  default: "gap-6 px-4 py-8 sm:px-6 lg:px-10",
  narrow: "mx-auto max-w-sm justify-center px-4 py-12 sm:px-6",
  center: "min-h-[80vh] items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-10",
};

/**
 * The single canonical page container. The default variant is full width
 * with pixel gutters only; `narrow` stays reserved for the auth form.
 */
export function PageContainer({ children, variant = "default", role, ariaLabel }: PageContainerProps) {
  return (
    <main
      className={`flex w-full flex-col ${VARIANT_CLASSES[variant]}`}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </main>
  );
}
