"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number | string;
  stock: number | string;
  category?: string | null;
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

const defaultProductsApiUrl =
  "https://gerrysmart-4v36.vercel.app/api/products";

function getProductsApiUrl() {
  if (process.env.NEXT_PUBLIC_PRODUCTS_API_URL) {
    return process.env.NEXT_PUBLIC_PRODUCTS_API_URL;
  }

  return defaultProductsApiUrl;
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

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const productsApiUrl = useMemo(() => getProductsApiUrl(), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(productsApiUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store"
        });

        const result = await response.json();

        console.log("[frontend] Products API response:", result);

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load products.");
        }

        setProducts(Array.isArray(result.data) ? result.data : []);
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
  }, [productsApiUrl]);

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
              {isLoading ? "Loading..." : `${products.length} items`}
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

          {!isLoading && !error && products.length === 0 ? (
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
      </div>
    </main>
  );
}
