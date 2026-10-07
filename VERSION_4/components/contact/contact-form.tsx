"use client";

import { useId, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { MESSAGE_MAX, PURPOSES, composeMailto, fitsMailto } from "@/components/contact/mailto";
import { emailHref } from "@/components/career/mailto";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

const labelClass = "mb-2 block label-mono text-muted";
// 16px text stops iOS zooming on focus. user-invalid only styles a field after the visitor touched it.
// border-muted (not the hairline border tokens) keeps the field edge at 3:1 or better in both themes (WCAG 1.4.11).
const controlClass =
  "block min-h-11 w-full rounded-md border focus-visible:rounded-md border-muted bg-background px-3 py-3 text-base text-foreground transition-colors duration-200 hover:border-foreground user-invalid:border-foreground motion-reduce:transition-none";

/** `required` lets whitespace through. Treat a blank name or message as missing. */
function flagBlankFields(form: HTMLFormElement): boolean {
  let ok = true;
  for (const field of ["name", "message"]) {
    const el = form.elements.namedItem(field);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const blank = el.value.trim() === "";
      el.setCustomValidity(blank ? "Please fill out this field." : "");
      if (blank) ok = false;
    }
  }
  return ok;
}

type ContactFormProps = {
  /** Heading level of the form title. One level below the heading that introduces the form. */
  titleAs?: "h2" | "h3" | "h4";
};

/**
 * Optional contact form. Submitting composes a mailto: URL and hands it to the visitor's own email
 * client. Nothing is sent from this site: no request, no storage, no tracking.
 * Validation uses the native constraint API. With JavaScript off, the form's own mailto: action
 * does the same job (browser-validated, plain-text body).
 */
export function ContactForm({ titleAs: Title = "h3" }: ContactFormProps) {
  const uid = useId();
  const [status, setStatus] = useState("");
  // Shown with a direct email link, so a message that cannot be passed on still has a way out.
  const [showDirect, setShowDirect] = useState(false);

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.setCustomValidity("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setShowDirect(false);
    if (!flagBlankFields(form)) {
      form.reportValidity();
      setStatus("Check the highlighted fields. Nothing was opened.");
      return;
    }

    const data = new FormData(form);
    const text = (key: string): string => {
      const value = data.get(key);
      return typeof value === "string" ? value : "";
    };

    try {
      const url = composeMailto({
        to: site.email,
        name: text("name"),
        email: text("email"),
        purpose: text("purpose"),
        message: text("message"),
      });
      if (!fitsMailto(url)) {
        setStatus("Too long for an email link. Shorten the message or email me directly.");
        setShowDirect(true);
        return;
      }
      setStatus(`Opening your email client. If nothing opens, write to ${site.email}.`);
      window.location.href = url;
    } catch {
      setStatus(`Could not build the message. Write to ${site.email} directly.`);
      setShowDirect(true);
    }
  }

  return (
    <form
      action={`mailto:${site.email}`}
      method="post"
      encType="text/plain"
      onSubmit={handleSubmit}
      onInput={handleInput}
      aria-labelledby={`${uid}-title`}
      className="rounded-lg border bg-surface p-6 md:p-8"
    >
      <Title id={`${uid}-title`} className="label-mono text-foreground">
        COMPOSE A MESSAGE
      </Title>
      <p id={`${uid}-note`} className="mt-3 text-sm text-muted">
        Opens your email client. Nothing is sent from this site. All fields are required.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>
            NAME
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            type="text"
            required
            maxLength={80}
            autoComplete="name"
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={labelClass}>
            EMAIL
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className={controlClass}
          />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor={`${uid}-purpose`} className={labelClass}>
          PURPOSE
        </label>
        <div className="relative">
          <select
            id={`${uid}-purpose`}
            name="purpose"
            required
            defaultValue=""
            className={`${controlClass} appearance-none pr-12`}
          >
            <option value="" disabled>
              Select a purpose
            </option>
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>
                {purpose.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
          />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor={`${uid}-message`} className={labelClass}>
          MESSAGE
        </label>
        <textarea
          id={`${uid}-message`}
          name="message"
          required
          rows={5}
          minLength={10}
          maxLength={MESSAGE_MAX}
          aria-describedby={`${uid}-hint`}
          className={`${controlClass} resize-y`}
        />
        <p id={`${uid}-hint`} className="mt-2 text-xs text-muted">
          10 to {MESSAGE_MAX} characters.
        </p>
      </div>

      <div className="mt-8">
        <Button type="submit" variant="primary" arrow aria-describedby={`${uid}-note`}>
          OPEN EMAIL DRAFT
        </Button>
      </div>

      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-muted">
        {status}
        {showDirect ? (
          <>
            {" "}
            <a
              href={emailHref}
              className="text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
            >
              {site.email}
            </a>
          </>
        ) : null}
      </p>
    </form>
  );
}
