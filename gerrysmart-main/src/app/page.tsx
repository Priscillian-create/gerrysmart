"use client";

import { type FormEvent, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number | string;
  stock: number | string;
  category?: string | null;
};

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
};

type LoginForm = {
  email: string;
  password: string;
};

type AuthSession = {
  token: string;
  role: string | null;
  email: string | null;
};

const metrics = [
  {
    label: "Core domains",
    value: "8",
    detail: "Inventory, checkout, expenses, purchases, stock, reports, analytics, auth"
  },
  {
    label: "API groups",
    value: "6",
    detail: "Operational endpoints grouped for products, reports, sales flow, and finance"
  },
  {
    label: "Runtime",
    value: "Next.js",
    detail: "App Router foundation with Prisma-backed data access"
  }
];

const sections = [
  {
    title: "Authentication",
    description: "Secure access into the POS workflow with JWT-based sign-in.",
    items: ["POST /api/auth/login"]
  },
  {
    title: "Catalog & stock",
    description: "Manage product records and keep inventory availability visible.",
    items: [
      "GET, POST /api/products",
      "PUT, DELETE /api/products/:id",
      "GET /api/stock"
    ]
  },
  {
    title: "Sales & operations",
    description: "Support checkout flow, expense tracking, and purchase intake.",
    items: [
      "POST /api/checkout",
      "GET, POST /api/expenses",
      "DELETE /api/expenses/:id",
      "GET, POST /api/purchases"
    ]
  },
  {
    title: "Reporting & insights",
    description: "Expose business performance snapshots for daily and category analysis.",
    items: [
      "GET /api/reports/summary",
      "GET /api/reports/daily",
      "GET /api/reports/products",
      "GET /api/reports/categories",
      "GET /api/analytics"
    ]
  }
];

const userFormInitialState: CreateUserForm = {
  name: "",
  email: "",
  password: ""
};

const loginFormInitialState: LoginForm = {
  email: "",
  password: ""
};

const tokenStorageKeys = [
  "token",
  "authToken",
  "accessToken",
  "posToken",
  "pos_access_token",
  "jwt"
];

function getAvailableStorages() {
  const storages: Storage[] = [];

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const probeKey = "__pos_storage_probe__";
      storage.getItem(probeKey);
      storages.push(storage);
    } catch {
      // Ignore blocked storage implementations and keep the page usable.
    }
  }

  return storages;
}

function buildApiUrl(path: string) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";

  if (!configuredBaseUrl) {
    return path;
  }

  return `${configuredBaseUrl.replace(/\/+$/, "")}${path}`;
}

function formatPrice(value: number | string) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(amount);
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));

    return JSON.parse(decoded) as {
      email?: unknown;
      role?: unknown;
    };
  } catch {
    return null;
  }
}

function getStoredAuthSession(): AuthSession | null {
  for (const storage of getAvailableStorages()) {
    for (const key of tokenStorageKeys) {
      const token = storage.getItem(key)?.trim();

      if (!token) {
        continue;
      }

      const payload = decodeJwtPayload(token);

      return {
        token,
        role: typeof payload?.role === "string" ? payload.role : null,
        email: typeof payload?.email === "string" ? payload.email : null
      };
    }
  }

  return null;
}

function clearStoredAuthSession() {
  for (const storage of getAvailableStorages()) {
    for (const key of tokenStorageKeys) {
      storage.removeItem(key);
    }
  }
}

function persistAuthSession(token: string) {
  clearStoredAuthSession();

  for (const storage of getAvailableStorages()) {
    try {
      storage.setItem("authToken", token);
      return;
    } catch {
      // Try the next available storage.
    }
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState<LoginForm>(loginFormInitialState);
  const [loginError, setLoginError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>(userFormInitialState);
  const [createUserError, setCreateUserError] = useState("");
  const [createUserSuccess, setCreateUserSuccess] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const productsApiUrl = buildApiUrl("/api/products");
  const isAdmin = authSession?.role === "admin";
  const isSignedIn = Boolean(authSession?.token);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      if (!isAuthResolved) {
        return;
      }

      if (!authSession?.token) {
        setProducts([]);
        setError("");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(productsApiUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${authSession.token}`
          }
        });

        const result = await response.json().catch(() => null);

        if (response.status === 401) {
          clearStoredAuthSession();
          setAuthSession(null);
          throw new Error(result?.error?.message || "Session expired. Sign in again.");
        }

        if (!response.ok) {
          throw new Error(
            result?.error?.message || result?.message || "Failed to load products."
          );
        }

        setProducts(Array.isArray(result?.data) ? result.data : []);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load products.";

        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [authSession?.token, isAuthResolved, productsApiUrl]);

  useEffect(() => {
    function syncAuthSession() {
      setAuthSession(getStoredAuthSession());
      setIsAuthResolved(true);
    }

    syncAuthSession();
    window.addEventListener("storage", syncAuthSession);

    return () => {
      window.removeEventListener("storage", syncAuthSession);
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setCreateUserError("");
    setCreateUserSuccess("");

    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (!isValidEmail(email)) {
      setLoginError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setLoginError("Password is required.");
      return;
    }

    try {
      setIsSigningIn(true);

      const response = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || typeof result?.token !== "string") {
        throw new Error(
          result?.error?.message || result?.message || "Unable to sign in."
        );
      }

      persistAuthSession(result.token);
      setAuthSession(getStoredAuthSession());
      setLoginForm(loginFormInitialState);
      setError("");
    } catch (loginRequestError) {
      setLoginError(
        loginRequestError instanceof Error
          ? loginRequestError.message
          : "Unable to sign in."
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  function handleLogout() {
    clearStoredAuthSession();
    setAuthSession(null);
    setProducts([]);
    setError("");
    setLoginError("");
    setCreateUserError("");
    setCreateUserSuccess("");
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateUserError("");
    setCreateUserSuccess("");

    if (!isAdmin || !authSession?.token) {
      setCreateUserError("Access denied. Sign in as an admin to create users.");
      return;
    }

    const name = createUserForm.name.trim();
    const email = createUserForm.email.trim().toLowerCase();
    const password = createUserForm.password;

    if (!name) {
      setCreateUserError("Name is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setCreateUserError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setCreateUserError("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsCreatingUser(true);

      const response = await fetch(buildApiUrl("/api/auth/register"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.token}`
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error?.message || result?.message || "Failed to create user."
        );
      }

      setCreateUserForm(userFormInitialState);
      setCreateUserSuccess("User created successfully");
    } catch (createUserRequestError) {
      setCreateUserError(
        createUserRequestError instanceof Error
          ? createUserRequestError.message
          : "Failed to create user."
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px 64px",
        background:
          "radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)"
      }}
    >
      <div
        style={{
          width: "min(1120px, 100%)",
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
            gap: 24,
            background: "rgba(15, 23, 42, 0.92)",
            color: "#e2e8f0",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)"
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                width: "fit-content",
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(59, 130, 246, 0.18)",
                color: "#bfdbfe",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}
            >
              Operations dashboard
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2.25rem, 4vw, 3.5rem)",
                  lineHeight: 1.05
                }}
              >
                POS control center
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 720,
                  fontSize: 18,
                  lineHeight: 1.7,
                  color: "#cbd5e1"
                }}
              >
                A polished overview for the POS platform, giving your team a
                clear entry point into authentication, catalog management,
                checkout operations, purchasing, reporting, and analytics.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "rgba(148, 163, 184, 0.12)",
                  border: "1px solid rgba(148, 163, 184, 0.16)"
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#94a3b8"
                  }}
                >
                  Status
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  Ready for integration
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "rgba(148, 163, 184, 0.12)",
                  border: "1px solid rgba(148, 163, 184, 0.16)"
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#94a3b8"
                  }}
                >
                  Focus
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  API-first POS foundation
                </div>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "rgba(148, 163, 184, 0.12)",
                  border: "1px solid rgba(148, 163, 184, 0.16)"
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#94a3b8"
                  }}
                >
                  Live catalog
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {isLoading ? "Loading products..." : `${products.length} products loaded`}
                </div>
              </div>
            </div>
          </div>

          <aside
            style={{
              display: "grid",
              gap: 16,
              alignContent: "start",
              padding: 24,
              borderRadius: 22,
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.75))",
              border: "1px solid rgba(148, 163, 184, 0.16)"
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#94a3b8"
                }}
              >
                Platform summary
              </span>
              <strong style={{ fontSize: 24, color: "#f8fafc" }}>
                Backend overview
              </strong>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(148, 163, 184, 0.12)"
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#94a3b8"
                    }}
                  >
                    {metric.label}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#f8fafc"
                    }}
                  >
                    {metric.value}
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#cbd5e1",
                      lineHeight: 1.6
                    }}
                  >
                    {metric.detail}
                  </p>
                </div>
              ))}
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(96, 165, 250, 0.2)"
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#93c5fd"
                  }}
                >
                  Products API
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#eff6ff",
                    wordBreak: "break-word"
                  }}
                >
                  {productsApiUrl}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section
          style={{
            display: "grid",
            gap: 18
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                color: "#0f172a"
              }}
            >
              Service map
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "#475569",
                lineHeight: 1.7
              }}
            >
              The homepage now presents the backend surface area like an
              executive dashboard while preserving the same routes and API
              capabilities underneath.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18
            }}
          >
            {sections.map((section) => (
              <article
                key={section.title}
                style={{
                  display: "grid",
                  gap: 14,
                  padding: 24,
                  background: "#ffffff",
                  borderRadius: 22,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)"
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>
                    {section.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#475569",
                      lineHeight: 1.7
                    }}
                  >
                    {section.description}
                  </p>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    color: "#1e293b",
                    lineHeight: 1.8
                  }}
                >
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: 18
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                color: "#0f172a"
              }}
            >
              Login access
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "#475569",
                lineHeight: 1.7
              }}
            >
              Sign in here before loading protected products or using admin-only features.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              padding: 24,
              background: "#ffffff",
              borderRadius: 22,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 20, color: "#0f172a" }}>Session</strong>
                <span style={{ color: "#64748b" }}>
                  {isAuthResolved
                    ? authSession?.email || "Not signed in"
                    : "Checking session..."}
                </span>
              </div>
              <div
                style={{
                  alignSelf: "start",
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: isSignedIn ? "#dcfce7" : "#fee2e2",
                  color: isSignedIn ? "#166534" : "#991b1b",
                  fontWeight: 700
                }}
              >
                {isSignedIn ? `Signed in${isAdmin ? " as admin" : ""}` : "Signed out"}
              </div>
            </div>

            {loginError ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#991b1b"
                }}
              >
                {loginError}
              </div>
            ) : null}

            {isSignedIn ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <span style={{ color: "#475569", lineHeight: 1.7 }}>
                  You can now load products and access features allowed for your role.
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: "fit-content",
                    padding: "14px 22px",
                    border: "none",
                    borderRadius: 14,
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleLogin}
                style={{
                  display: "grid",
                  gap: 16
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gap: 8
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#334155" }}>Email</span>
                  <input
                    type="email"
                    autoComplete="username"
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        email: event.target.value
                      }))
                    }
                    placeholder="Enter admin email"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid #cbd5e1",
                      fontSize: 16,
                      outline: "none"
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 8
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#334155" }}>Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value
                      }))
                    }
                    placeholder="Enter password"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid #cbd5e1",
                      fontSize: 16,
                      outline: "none"
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSigningIn}
                  style={{
                    width: "fit-content",
                    padding: "14px 22px",
                    border: "none",
                    borderRadius: 14,
                    background: isSigningIn ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: isSigningIn ? "not-allowed" : "pointer"
                  }}
                >
                  {isSigningIn ? "Signing in..." : "Sign in"}
                </button>
              </form>
            )}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: 18
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "end",
              gap: 12
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  color: "#0f172a"
                }}
              >
                Product catalog
              </h2>
              <p
                style={{
                  margin: 0,
                  maxWidth: 760,
                  color: "#475569",
                  lineHeight: 1.7
                }}
              >
                Live products now load from the TiDB-backed products API and render the name,
                price, and stock values directly on the frontend.
              </p>
            </div>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                color: "#334155",
                fontWeight: 700
              }}
            >
              {isLoading ? "Loading..." : isSignedIn ? `${products.length} items` : "Sign in first"}
            </div>
          </div>

          {error ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#9a3412"
              }}
            >
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div
              style={{
                padding: 24,
                borderRadius: 22,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
                color: "#475569"
              }}
            >
              Loading products from {productsApiUrl}
            </div>
          ) : !isSignedIn ? (
            <div
              style={{
                padding: 24,
                borderRadius: 22,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
                color: "#475569"
              }}
            >
              Sign in to load products from the protected catalog API.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 18
              }}
            >
              {products.map((product) => (
                <article
                  key={product.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 24,
                    background: "#ffffff",
                    borderRadius: 22,
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)"
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>
                      {product.name}
                    </h3>
                    <p style={{ margin: 0, color: "#64748b" }}>
                      {product.category || "Uncategorized"}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      color: "#1e293b"
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      Price: {formatPrice(product.price)}
                    </p>
                    <p style={{ margin: 0 }}>Stock: {product.stock}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!isLoading && !error && isSignedIn && products.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 22,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
                color: "#475569"
              }}
            >
              No products were returned by the API.
            </div>
          ) : null}
        </section>

        <section
          style={{
            display: "grid",
            gap: 18
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                color: "#0f172a"
              }}
            >
              User Management / Create User
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "#475569",
                lineHeight: 1.7
              }}
            >
              Create dashboard users through the secured registration API. Only admins can
              access this feature.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              padding: 24,
              background: "#ffffff",
              borderRadius: 22,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 20, color: "#0f172a" }}>Admin controls</strong>
                <span style={{ color: "#64748b" }}>
                  {isAuthResolved
                    ? authSession?.email || "No active admin session found"
                    : "Checking session..."}
                </span>
              </div>
              <div
                style={{
                  alignSelf: "start",
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: isAdmin ? "#dcfce7" : "#fee2e2",
                  color: isAdmin ? "#166534" : "#991b1b",
                  fontWeight: 700
                }}
              >
                {isAdmin ? "Admin access" : "Access denied"}
              </div>
            </div>

            {createUserSuccess ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  color: "#166534"
                }}
              >
                {createUserSuccess}
              </div>
            ) : null}

            {createUserError ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#991b1b"
                }}
              >
                {createUserError}
              </div>
            ) : null}

            {isAdmin ? (
              <form
                onSubmit={handleCreateUser}
                style={{
                  display: "grid",
                  gap: 16
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gap: 8
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#334155" }}>Name</span>
                  <input
                    autoComplete="name"
                    value={createUserForm.name}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    placeholder="Enter full name"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid #cbd5e1",
                      fontSize: 16,
                      outline: "none"
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 8
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#334155" }}>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={createUserForm.email}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        email: event.target.value
                      }))
                    }
                    placeholder="Enter email address"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid #cbd5e1",
                      fontSize: 16,
                      outline: "none"
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 8
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#334155" }}>Password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={createUserForm.password}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        password: event.target.value
                      }))
                    }
                    placeholder="Enter password"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid #cbd5e1",
                      fontSize: 16,
                      outline: "none"
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  style={{
                    width: "fit-content",
                    padding: "14px 22px",
                    border: "none",
                    borderRadius: 14,
                    background: isCreatingUser ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: isCreatingUser ? "not-allowed" : "pointer"
                  }}
                >
                  {isCreatingUser ? "Creating User..." : "Create User"}
                </button>
              </form>
            ) : (
              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: "#fff7ed",
                  border: "1px solid #fdba74",
                  color: "#9a3412"
                }}
              >
                Access Denied
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
