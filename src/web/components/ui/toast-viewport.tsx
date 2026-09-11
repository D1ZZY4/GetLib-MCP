"use client";

import type { ToastContentValue } from "@heroui/react";
import { Toast } from "@heroui/react";

/**
 * Application toast viewport. Same overlay chrome as Card (border plus
 * shadow) so toast corners render as crisply as every other surface;
 * the stock borderless toast looks unfinished next to bordered cards.
 * Structure follows the default HeroUI composition, only the frame
 * changes, so variant icons, loading spinners, and actions keep working.
 */
export function ToastViewport() {
  return (
    <Toast.Provider placement="bottom end" maxVisibleToasts={3}>
      {({ toast: toastItem }) => {
        const content = toastItem.content as ToastContentValue;
        return (
          <Toast toast={toastItem} variant={content.variant} className="border border-border">
            <Toast.Content>
              <div className="flex items-center gap-2">
                <Toast.Indicator variant={content.variant} />
                <div className="flex flex-col">
                  {content.title ? <Toast.Title>{content.title}</Toast.Title> : null}
                  {content.description ? (
                    <Toast.Description>{content.description}</Toast.Description>
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
