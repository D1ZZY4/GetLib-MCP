"use client";

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
import { mockProviders, mockSession } from "../services/auth.service";
import type { MockSession } from "../../../types/library";
import { PageContainer } from "../../../components/layout/page-container";

type AuthMode = "sign-in" | "sign-up";

interface AuthPageProps {
  onAuthenticated: (session: MockSession) => void;
}

function validateEmail(value: string): string | null {
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
    return "Enter a valid email address";
  }
  return null;
}

function validatePassword(value: string): string | null {
  if (value.length < 8) {
    return "Password must be at least 8 characters";
  }
  return null;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");

  const isSignUp = mode === "sign-up";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? mockSession.email);
    const name =
      String(formData.get("name") ?? "").trim() ||
      email.split("@")[0] ||
      mockSession.name;
    onAuthenticated({ name, email });
  };

  const toggleMode = () => {
    setMode(isSignUp ? "sign-in" : "sign-up");
  };

  return (
    <PageContainer variant="narrow">
      <Card>
        <Card.Header>
          <Card.Title>{isSignUp ? "Create your account" : "Sign in to GetLib"}</Card.Title>
          <Card.Description>
            {isSignUp
              ? "Enter your details below to create a mock account"
              : "Enter your email below to sign in with mock data"}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp ? (
              <TextField isRequired name="name" defaultValue={mockSession.name}>
                <Label>Name</Label>
                <Input placeholder="Demo User" />
              </TextField>
            ) : null}
            <TextField
              isRequired
              name="email"
              type="email"
              defaultValue={mockSession.email}
              validate={validateEmail}
            >
              <Label>Email</Label>
              <Input placeholder="demo@example.com" />
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
              <Input placeholder="••••••••" />
              <Description>Must be at least 8 characters</Description>
              <FieldError />
            </TextField>
            <Button type="submit" fullWidth>
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              onPress={() => onAuthenticated(mockSession)}
            >
              Continue with {mockProviders[0]}
            </Button>
          </Form>
        </Card.Content>
        <Card.Footer>
          <p className="w-full text-center text-sm text-muted">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </Card.Footer>
      </Card>
    </PageContainer>
  );
}
