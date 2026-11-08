import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class TestIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = TestIntersectionObserver;

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});
