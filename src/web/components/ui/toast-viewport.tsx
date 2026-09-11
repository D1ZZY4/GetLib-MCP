"use client";

import type { ToastContentValue } from "@heroui/react";
import { Toast } from "@heroui/react";

/**
 * Application toast viewport. Frame matches the documented HeroUI toast
 * styling (rounded-xl, border, surface, shadow, outer ring) so corners
 * render as crisply as Card; text uses the app palette so both themes
 * stay consistent. Structure mirrors the default composition, only the
 * frame changes, so variant icons, loading spinners, and actions keep
 * working.
 */
export function ToastViewport() {
  return (
    <Toast.Provider placement="bottom end" maxVisibleToasts={3}>
      {({ toast: toastItem }) => {
        const content = toastItem.content as ToastContentValue;
        return (
          <Toast
            toast={toastItem}
            variant={content.variant}
            className="rounded-xl border border-border/80 bg-surface shadow-lg ring-1 ring-black/5 dark:ring-white/10"
          >
            <Toast.Content>
              <div className="flex items-center gap-2.5">
                <Toast.Indicator variant={content.variant} />
                <div className="flex flex-col gap-0.5">
                  {content.title ? (
                    <Toast.Title className="text-sm font-medium text-foreground">
                      {content.title}
                    </Toast.Title>
                  ) : null}
                  {content.description ? (
                    <Toast.Description className="text-sm text-muted">
                      {content.description}
                    </Toast.Description>
                  ) : null}
                </div>
              </div>
            </Toast.Content>
            <Toast.CloseButton />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}
