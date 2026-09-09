"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { mockSession } from "../services/auth.service";
import { validateEmail, validatePassword } from "@/web/lib/validation";
import { useEnvironment } from "@/web/features/development/hooks/use-environment";
import type { MockSession } from "../../../types/library";

export type AuthMode = "sign-in" | "sign-up";

interface AuthFormProps {
  mode: AuthMode;
  onAuthenticated: (session: MockSession) => void;
  verifyCredentials?: (email: string, password: string) => Promise<string | null>;
}

const COPY = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in to open your dashboard.",
    submit: "Sign in",
    switchPrompt: "Don't have an account?",
    switchLabel: "Create one",
    switchHref: "/signup",
  },
  "sign-up": {
    title: "Create your account",
    description: "One account for dashboards, sources, and MCP tools.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/signin",
  },
} as const;

export function AuthForm({ mode, onAuthenticated, verifyCredentials }: AuthFormProps) {
  const copy = COPY[mode];
  const { isDevelopment } = useEnvironment();
  // Demo identity prefill is a development convenience only - production
  // forms always start empty.
  const demoEmail = isDevelopment ? mockSession.email : "";
  const demoName = isDevelopment ? mockSession.name : "";
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawEmail = String(formData.get("email") ?? "").trim();
    const rawPassword = String(formData.get("password") ?? "");
    const emailError = validateEmail(rawEmail);
    const passwordError = validatePassword(rawPassword);
    if (emailError !== null || passwordError !== null) {
      setFormError("Check the highlighted fields and try again.");
      return;
    }
    if (!verifyCredentials) {
      setFormError(null);
      const name =
        String(formData.get("name") ?? "").trim() ||
        rawEmail.split("@")[0] ||
        mockSession.name;
      onAuthenticated({ name, email: rawEmail });
      return;
    }
    setSubmitting(true);
    verifyCredentials(rawEmail, rawPassword)
      .then((failure) => {
        if (failure !== null) {
          setFormError(failure);
          return;
        }
        setFormError(null);
        const name =
          String(formData.get("name") ?? "").trim() ||
          rawEmail.split("@")[0] ||
          mockSession.name;
        onAuthenticated({ name, email: rawEmail });
      })
      .catch(() => {
        setFormError("We couldn't reach the server. Try again in a moment.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Card className="w-full max-w-md">
      <Card.Header>
        <Card.Title>{copy.title}</Card.Title>
        <Card.Description>{copy.description}</Card.Description>
      </Card.Header>
      <Card.Content>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={copy.title}>
          {formError !== null ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          {mode === "sign-up" ? (
            <TextField name="name" defaultValue={demoName}>
              <Label>Name</Label>
              <Input placeholder="Ada Lovelace" variant="secondary" />
            </TextField>
          ) : null}
          <TextField
            isRequired
            name="email"
            type="email"
            defaultValue={demoEmail}
            validate={validateEmail}
          >
            <Label>Email</Label>
            <Input placeholder="you@example.com" variant="secondary" />
            <FieldError />
          </TextField>
          <TextField
            isRequired
            name="password"
            type="password"
            minLength={8}
            validate={validatePassword}
          >
            <Label>Password</Label>
            <Input placeholder="At least 8 characters" variant="secondary" />
            <Description>Must be at least 8 characters</Description>
            <FieldError />
          </TextField>
          <Button type="submit" fullWidth isDisabled={submitting}>
            {submitting ? "Checking..." : copy.submit}
          </Button>
        </Form>
      </Card.Content>
      <Card.Footer>
        <p className="w-full text-center text-sm text-muted">
          {copy.switchPrompt}{" "}
          <Link href={copy.switchHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            {copy.switchLabel}
          </Link>
        </p>
      </Card.Footer>
    </Card>
  );
}
