"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMaterial, type MaterialDetail } from "../data";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  const materials = useMemo(() => {
    if (!idsParam) return [];
    const ids = idsParam.split(",");
    return ids
      .map((id) => getMaterial(id))
      .filter((m): m is MaterialDetail => m !== undefined);
  }, [idsParam]);

  if (materials.length === 0) {
    return (
      <div className="gc-page" style={{ minHeight: "100vh" }}>
        <div
          className="gc-container"
          style={{
            textAlign: "center",
            paddingTop: "4rem",
            paddingBottom: "4rem",
          }}
        >
          <h1 className="gc-catalog-title">No materials selected</h1>
          <p
            className="gc-catalog-subtitle"
            style={{ marginBottom: "2rem" }}
          >
            Please select materials from the catalog to compare.
          </p>
          <Link href="/catalog" className="gc-btn gc-btn-primary">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-page" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="gc-catalog-header">
        <div className="gc-container gc-catalog-header-inner">
          <div className="gc-catalog-header-content">
            <Link
              href="/catalog"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--gc-slate-600)",
                textDecoration: "none",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              ← Back to Catalog
            </Link>
            <h1 className="gc-catalog-title">Compare Materials</h1>
            <p className="gc-catalog-subtitle">
              Comparing {materials.length} products
            </p>
          </div>
        </div>
      </div>

      <div className="gc-container" style={{ paddingBottom: "4rem" }}>
        <div className="gc-card" style={{ overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    minWidth: "200px",
                    background: "var(--gc-slate-50)",
                    borderBottom: "1px solid var(--gc-slate-200)",
                  }}
                >
                  Product
                </th>
                {materials.map((m) => (
                  <th
                    key={m.id}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      minWidth: "200px",
                      background: "white",
                      borderBottom: "1px solid var(--gc-slate-200)",
                      borderLeft: "1px solid var(--gc-slate-100)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "120px",
                          borderRadius: "var(--gc-radius)",
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          src={m.image || "/placeholder-material.png"}
                          alt={m.name}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <Link
                        href={`/catalog/${m.id}`}
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "var(--gc-slate-900)",
                          textDecoration: "none",
                        }}
                      >
                        {m.name}
                      </Link>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--gc-slate-500)",
                        }}
                      >
                        {m.manufacturer}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sustainability Score */}
              <tr>
                <td
                  style={{
                    padding: "1rem",
                    fontWeight: 700,
                    color: "var(--gc-slate-700)",
                    borderBottom: "1px solid var(--gc-slate-100)",
                  }}
                >
                  Sustainability Score
                </td>
                {materials.map((m) => (
                  <td
                    key={m.id}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      borderBottom: "1px solid var(--gc-slate-100)",
                      borderLeft: "1px solid var(--gc-slate-100)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "99px",
                        background:
                          m.sustainabilityScore >= 80
                            ? "var(--gc-emerald-100)"
                            : m.sustainabilityScore >= 60
                              ? "var(--gc-teal-100)"
                              : "#fef3c7",
                        color:
                          m.sustainabilityScore >= 80
                            ? "var(--gc-emerald-700)"
                            : m.sustainabilityScore >= 60
                              ? "var(--gc-teal-700)"
                              : "#92400e",
                        fontWeight: 800,
                        fontSize: "1.125rem",
                      }}
                    >
                      {m.sustainabilityScore}
                    </span>
                  </td>
                ))}
              </tr>

              {/* GWP (Comparison Highlight) */}
              <tr>
                <td
                  style={{
                    padding: "1rem",
                    fontWeight: 700,
                    color: "var(--gc-slate-700)",
                    borderBottom: "1px solid var(--gc-slate-100)",
                  }}
                >
                  Global Warming Potential (GWP)
                </td>
                {materials.map((m) => {
                  const minGWP = Math.min(
                    ...materials
                      .map((mat) => mat.environmentalData.gwp)
                      .filter((val): val is number => val !== undefined)
                  );
                  const isBest =
                    m.environmentalData.gwp !== undefined &&
                    m.environmentalData.gwp === minGWP;

                  return (
                    <td
                      key={m.id}
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        borderBottom: "1px solid var(--gc-slate-100)",
                        borderLeft: "1px solid var(--gc-slate-100)",
                        background: isBest ? "var(--gc-emerald-50)" : "white",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: isBest
                            ? "var(--gc-emerald-700)"
                            : "var(--gc-slate-900)",
                        }}
                      >
                        {m.environmentalData.gwp ?? "N/A"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--gc-slate-500)",
                        }}
                      >
                        kg CO2e
                      </div>
                      {isBest && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--gc-emerald-600)",
                            marginTop: "0.25rem",
                            fontWeight: 600,
                          }}
                        >
                          Best Choice
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Other Environmental Data */}
              <tr>
                <td
                  style={{
                    padding: "1rem",
                    fontWeight: 700,
                    color: "var(--gc-slate-700)",
                    borderBottom: "1px solid var(--gc-slate-100)",
                  }}
                >
                  Recycled Content
                </td>
                {materials.map((m) => (
                  <td
                    key={m.id}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      borderBottom: "1px solid var(--gc-slate-100)",
                      borderLeft: "1px solid var(--gc-slate-100)",
                    }}
                  >
                    {m.recycledContent}%
                  </td>
                ))}
              </tr>

              {/* Price Range */}
              <tr>
                <td
                  style={{
                    padding: "1rem",
                    fontWeight: 700,
                    color: "var(--gc-slate-700)",
                    borderBottom: "1px solid var(--gc-slate-100)",
                  }}
                >
                  Price Range
                </td>
                {materials.map((m) => (
                  <td
                    key={m.id}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      borderBottom: "1px solid var(--gc-slate-100)",
                      borderLeft: "1px solid var(--gc-slate-100)",
                    }}
                  >
                    {m.priceRange ?? "N/A"}
                  </td>
                ))}
              </tr>

              {/* Certifications */}
              <tr>
                <td
                  style={{
                    padding: "1rem",
                    fontWeight: 700,
                    color: "var(--gc-slate-700)",
                    borderBottom: "1px solid var(--gc-slate-100)",
                  }}
                >
                  Certifications
                </td>
                {materials.map((m) => (
                  <td
                    key={m.id}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      borderBottom: "1px solid var(--gc-slate-100)",
                      borderLeft: "1px solid var(--gc-slate-100)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        justifyContent: "center",
                      }}
                    >
                      {m.certificationDetails?.map((cert) => (
                        <span
                          key={cert.name}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "var(--gc-slate-100)",
                            borderRadius: "var(--gc-radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--gc-slate-700)",
                          }}
                        >
                          {cert.name}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Request Quote Button */}
              <tr>
                <td
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid var(--gc-slate-100)",
                  }}
                ></td>
                {materials.map((m) => (
                  <td
                    key={m.id}
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      borderBottom: "1px solid var(--gc-slate-100)",
                      borderLeft: "1px solid var(--gc-slate-100)",
                    }}
                  >
                    <Link
                      href={`/rfqs/new?material=${m.id}`}
                      className="gc-btn gc-btn-primary"
                      style={{ width: "100%" }}
                    >
                      Request Quote
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
