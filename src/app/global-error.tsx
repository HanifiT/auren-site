"use client";

/**
 * The last resort: a failure in the root layout itself, where `error.tsx`
 * never gets to render because the layout it lives inside is the thing that
 * broke. This one has to bring its own <html> and its own colours.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: "#e9dec2",
          color: "#2a2016",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 500, margin: 0 }}>
            The roll is closed.
          </h1>
          <p style={{ color: "#5b4c3a" }}>
            Something failed before the page could be drawn. Nothing was
            entered.
          </p>
          <button
            onClick={reset}
            style={{
              font: "inherit",
              marginTop: "1.5rem",
              padding: "0.7em 1.8em",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              color: "#f6eedc",
              background: "#94301e",
              border: "1px solid #94301e",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
