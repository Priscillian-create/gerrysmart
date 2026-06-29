export default function SayingPage() {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
      }}
    >
      <section
        style={{
          width: "min(820px, 100%)",
          background: "#ffffff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Saying</h1>
        <p>This is a placeholder route at /saying. The server must be running to view it.</p>
      </section>
    </main>
  );
}
