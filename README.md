# HELM // Adversarial Strategy Simulation Engine

Software für Unternehmen, um taktische und strategische Entscheidungen
von Wettbewerbern über mehrere Runden und Szenarien zu simulieren.
HELM erlaubt es, **3–5 Züge vorauszudenken** und so eine langfristige,
weniger sichtbare Strategie zu fahren, bei der die wahrscheinlichen
Reaktionen des Gegners bereits eingepreist sind.

## Konzept

Klassische strategische Planung ist reaktiv: man entscheidet, der
Wettbewerber antwortet, man passt an. HELM dreht das um. Aus
beobachteten Signalen, Posture, Kriegskasse, Markenmacht und
Leadership-Bias des Gegners wird ein **probabilistischer Spielbaum**
erzeugt, in dem sich Eigenzüge und gegnerische Antworten über mehrere
Runden verschränken.

```
T0          T1          T2          T3          T4
SELF   →   OPP    →   SELF   →   OPP    →   SELF
            ├── ...
            ├── ...
            └── ...
```

Jeder Knoten trägt:

- **Conditional Probability** (gegeben Eltern-Knoten)
- **Cumulative Probability** (Pfad-Wahrscheinlichkeit)
- **Threat-Wert** (0–100, Schaden für uns wenn ausgeführt)
- **Opp-Cost** (was es den Gegner kostet)
- **Counter-Move-Bibliothek** (kuratiert pro Kategorie)
- **Rationale** (warum dieser Zug zur Posture/zum Profil passt)

Aus dem Baum werden vier Sichten aggregiert:

1. **Threat Index** — EV-gewichtetes Composite (0–100)
2. **Pressure Heatmap** — wo der Gegner über alle Pfade Druck aufbaut
   (PRICING, M&A, GEO, REGULATORY, …)
3. **Top Trajectories** — die fünf gefährlichsten Pfade (Σ Threat × P)
4. **Node Inspector** — Trajektorie, Begründung, empfohlene Counter

## Tech

- Next.js 14 (App Router) · React 18 · TypeScript strict
- Tailwind CSS · Inter / JetBrains Mono
- Reine clientseitige Heuristik-Engine (`src/lib/engine.ts`),
  deterministisch geseedet — austauschbar gegen ein LLM-basiertes
  Reasoner-Backend ohne UI-Änderungen.

## Design

Monochrom — nur Weiß, Schwarz und Grautöne. Sharp corners, dichte
Information, monospaced technische Labels, Klassifikations-Banner.
Modern defence deep-tech premium.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```
