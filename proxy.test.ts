import { middleware } from "./proxy";
import { NextRequest } from "next/server";

describe("middleware auth guard", () => {
  it("redirects unauthenticated requests to /login", () => {
    const req = new NextRequest("http://localhost/dashboard");
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("preserves the original path in the `from` query param", () => {
    const req = new NextRequest("http://localhost/dashboard");
    const res = middleware(req);
    expect(res.headers.get("location")).toContain("from=%2Fdashboard");
  });

  it("passes through when session cookie is present", () => {
    const req = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "session=some-jwt-value" },
    });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("does not redirect /login (public path)", () => {
    const req = new NextRequest("http://localhost/login");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it("does not redirect unprotected paths", () => {
    const req = new NextRequest("http://localhost/some-other-page");
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it.each(["/dashboard", "/users", "/assets", "/tickets", "/reports", "/monitoring"])(
    "protects %s without a token",
    (path) => {
      const req = new NextRequest(`http://localhost${path}`);
      const res = middleware(req);
      expect(res.status).toBe(307);
    }
  );
});
