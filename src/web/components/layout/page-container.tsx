interface PageContainerProps {
  children: React.ReactNode;
  variant?: "default" | "center";
  role?: string;
  ariaLabel?: string;
}

const VARIANT_CLASSES: Record<NonNullable<PageContainerProps["variant"]>, string> = {
  default: "mx-auto w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-10",
  center: "mx-auto min-h-[80vh] w-full max-w-6xl items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-10",
};

/**
 * The single canonical page container. The default variant caps width so
 * large desktop stays readable; `center` is for standalone states like
 * the not-found page. Always renders the main landmark - loading status
 * belongs on an inner element so the landmark never disappears.
 */
export function PageContainer({ children, variant = "default", role, ariaLabel }: PageContainerProps) {
  if (role !== undefined || ariaLabel !== undefined) {
    return (
      <main className={`flex w-full flex-col ${VARIANT_CLASSES[variant]}`}>
        <div role={role} aria-label={ariaLabel} className="flex w-full flex-col gap-6">
          {children}
        </div>
      </main>
    );
  }
  return (
    <main
      className={`flex w-full flex-col ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </main>
  );
}
