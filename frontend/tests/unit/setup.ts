import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { setAuthToken, setOnUnauthorized } from "@/api/client";

import { server } from "./helpers/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
  setAuthToken(null);
  setOnUnauthorized(null);
});

afterAll(() => {
  server.close();
});
