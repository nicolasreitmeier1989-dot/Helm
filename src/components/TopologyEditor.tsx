"use client";

import { useState } from "react";
import type {
  BMCBlock,
  BMCBlockKind,
  Capability,
  CapabilityDimension,
  StrategicTopology,
  VPCItem,
  ValuePropositionCanvas,
} from "@/lib/types";
import { vpcFit } from "@/lib/topology";
import { BarMeter, Card, Label } from "./Chrome";

// ---------- ID helper ----------

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- tabs ----------

type TabKey = "CAPABILITIES" | "BMC" | "VPC";

export function TopologyEditor({
  which,
  name,
  topology,
  onChange,
}: {
  which: "OWN" | "OPPONENT";
  name: string;
  topology: StrategicTopology;
  onChange: (next: StrategicTopology) => void;
}) {
  const [tab, setTab] = useState<TabKey>("CAPABILITIES");
  const sideLabel = which === "OWN" ? "OWN POSITION" : "OPPONENT TOPOLOGY";

  return (
    <Card title={`TOPOLOGY // ${name}`} meta={sideLabel}>
      <div className="flex items-center gap-1 mb-3 border-b border-ink-300/60 -mx-4 px-4 pb-1.5">
        {(["CAPABILITIES", "BMC", "VPC"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-mono text-[10px] tracking-widest px-2.5 py-1 border transition-colors ${
              tab === t
                ? "border-ink-900 bg-ink-900 text-ink-0"
                : "border-ink-300/60 text-ink-700 hover:border-ink-700 hover:text-ink-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "CAPABILITIES" && (
        <CapabilitiesTab topology={topology} onChange={onChange} />
      )}
      {tab === "BMC" && <BMCTab topology={topology} onChange={onChange} />}
      {tab === "VPC" && <VPCTab topology={topology} onChange={onChange} />}
    </Card>
  );
}

// ---------- CAPABILITIES TAB ----------

const DIMS: CapabilityDimension[] = ["PEOPLE", "TECH", "ORG", "PROCESSES"];

function CapabilitiesTab({
  topology,
  onChange,
}: {
  topology: StrategicTopology;
  onChange: (next: StrategicTopology) => void;
}) {
  const setCaps = (next: Capability[]) =>
    onChange({ ...topology, capabilities: next });

  const update = (id: string, patch: Partial<Capability>) =>
    setCaps(topology.capabilities.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const remove = (id: string) =>
    setCaps(topology.capabilities.filter((c) => c.id !== id));

  const add = (dim: CapabilityDimension) =>
    setCaps([
      ...topology.capabilities,
      {
        id: uid("cap"),
        dimension: dim,
        label: "Neue Capability",
        level: 50,
        importance: 50,
      },
    ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {DIMS.map((dim) => {
        const caps = topology.capabilities.filter((c) => c.dimension === dim);
        return (
          <div key={dim} className="border border-ink-300/60 bg-ink-100/30 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] tracking-widest text-ink-900">
                {dim}
              </span>
              <span className="font-mono text-[9px] text-ink-500">{caps.length}</span>
            </div>
            <ul className="space-y-2">
              {caps.map((c) => (
                <li key={c.id} className="border border-ink-300/60 bg-ink-50 p-2">
                  <div className="flex items-start gap-1.5">
                    <input
                      value={c.label}
                      onChange={(e) => update(c.id, { label: e.target.value })}
                      className="flex-1 bg-transparent border-b border-dashed border-ink-300 focus:border-ink-700 outline-none py-0.5 text-[11.5px] text-ink-900"
                    />
                    <button
                      onClick={() => remove(c.id)}
                      aria-label="remove capability"
                      className="font-mono text-[10px] text-ink-500 hover:text-ink-900 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <RangeMini
                      label="LVL"
                      value={c.level}
                      onChange={(v) => update(c.id, { level: v })}
                    />
                    <RangeMini
                      label="IMP"
                      value={c.importance}
                      onChange={(v) => update(c.id, { importance: v })}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => add(dim)}
              className="mt-2 w-full font-mono text-[10px] tracking-widest text-ink-600 border border-dashed border-ink-300 py-1 hover:text-ink-900 hover:border-ink-700 transition-colors"
            >
              + ADD CAPABILITY
            </button>
          </div>
        );
      })}
    </div>
  );
}

function RangeMini({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] tracking-widest text-ink-500">{label}</span>
        <span className="font-mono text-[10px] text-ink-900">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink-900 cursor-pointer"
      />
    </div>
  );
}

// ---------- BMC TAB ----------

const BMC_KINDS: { key: BMCBlockKind; label: string }[] = [
  { key: "KEY_PARTNERS", label: "Key Partners" },
  { key: "KEY_ACTIVITIES", label: "Key Activities" },
  { key: "KEY_RESOURCES", label: "Key Resources" },
  { key: "VALUE_PROPOSITIONS", label: "Value Propositions" },
  { key: "CUSTOMER_RELATIONSHIPS", label: "Customer Relationships" },
  { key: "CHANNELS", label: "Channels" },
  { key: "CUSTOMER_SEGMENTS", label: "Customer Segments" },
  { key: "COST_STRUCTURE", label: "Cost Structure" },
  { key: "REVENUE_STREAMS", label: "Revenue Streams" },
];

function BMCTab({
  topology,
  onChange,
}: {
  topology: StrategicTopology;
  onChange: (next: StrategicTopology) => void;
}) {
  const setBlocks = (next: BMCBlock[]) =>
    onChange({ ...topology, bmc: { blocks: next } });

  const blocksFor = (k: BMCBlockKind) =>
    topology.bmc.blocks.filter((b) => b.kind === k);

  const update = (id: string, patch: Partial<BMCBlock>) =>
    setBlocks(topology.bmc.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const remove = (id: string) =>
    setBlocks(topology.bmc.blocks.filter((b) => b.id !== id));

  const add = (kind: BMCBlockKind) =>
    setBlocks([
      ...topology.bmc.blocks,
      {
        id: uid("bmc"),
        kind,
        label: "Neuer Eintrag",
        strength: 50,
      },
    ]);

  const renderBlock = (k: BMCBlockKind, label: string) => (
    <div className="border border-ink-300/60 bg-ink-100/30 p-2 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] tracking-widest text-ink-700 uppercase">
          {label}
        </span>
        <span className="font-mono text-[9px] text-ink-500">
          {blocksFor(k).length}
        </span>
      </div>
      <ul className="space-y-1 flex-1">
        {blocksFor(k).map((b) => (
          <li key={b.id} className="border border-ink-300/60 bg-ink-50 p-1.5">
            <div className="flex items-start gap-1">
              <input
                value={b.label}
                onChange={(e) => update(b.id, { label: e.target.value })}
                className="flex-1 bg-transparent border-b border-dashed border-ink-300 focus:border-ink-700 outline-none py-0.5 text-[11px] text-ink-900 min-w-0"
              />
              <button
                onClick={() => remove(b.id)}
                aria-label="remove block"
                className="font-mono text-[9px] text-ink-500 hover:text-ink-900 shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={b.strength}
                onChange={(e) => update(b.id, { strength: Number(e.target.value) })}
                className="flex-1 accent-ink-900 cursor-pointer"
              />
              <span className="font-mono text-[10px] text-ink-900 w-7 text-right">
                {b.strength}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={() => add(k)}
        className="mt-1.5 font-mono text-[9px] tracking-widest text-ink-600 border border-dashed border-ink-300 py-1 hover:text-ink-900 hover:border-ink-700 transition-colors"
      >
        + ADD
      </button>
    </div>
  );

  // Osterwalder layout — 5 cols × 3 rows
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="grid grid-cols-1 grid-rows-2 gap-2">
          {renderBlock("KEY_PARTNERS", "Key Partners")}
        </div>
        <div className="grid grid-cols-1 grid-rows-2 gap-2">
          {renderBlock("KEY_ACTIVITIES", "Key Activities")}
          {renderBlock("KEY_RESOURCES", "Key Resources")}
        </div>
        <div className="grid grid-cols-1 grid-rows-2 gap-2">
          {renderBlock("VALUE_PROPOSITIONS", "Value Propositions")}
        </div>
        <div className="grid grid-cols-1 grid-rows-2 gap-2">
          {renderBlock("CUSTOMER_RELATIONSHIPS", "Customer Relationships")}
          {renderBlock("CHANNELS", "Channels")}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-2">
        {renderBlock("CUSTOMER_SEGMENTS", "Customer Segments")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {renderBlock("COST_STRUCTURE", "Cost Structure")}
        {renderBlock("REVENUE_STREAMS", "Revenue Streams")}
      </div>
    </div>
  );
}

// ---------- VPC TAB ----------

function VPCTab({
  topology,
  onChange,
}: {
  topology: StrategicTopology;
  onChange: (next: StrategicTopology) => void;
}) {
  const segments = topology.bmc.blocks.filter((b) => b.kind === "CUSTOMER_SEGMENTS");

  if (segments.length === 0) {
    return (
      <div className="font-mono text-[10px] text-ink-500 leading-relaxed">
        Noch keine Customer-Segments definiert. Wechsel zum BMC-Tab und füge ein
        Segment hinzu.
      </div>
    );
  }

  const upsertVpc = (vpc: ValuePropositionCanvas) => {
    const exists = topology.vpcs.some((v) => v.id === vpc.id);
    const next = exists
      ? topology.vpcs.map((v) => (v.id === vpc.id ? vpc : v))
      : [...topology.vpcs, vpc];
    onChange({ ...topology, vpcs: next });
  };

  return (
    <div className="space-y-3">
      {segments.map((seg) => {
        let vpc = topology.vpcs.find((v) => v.customerSegmentBlockId === seg.id);
        if (!vpc) {
          vpc = {
            id: uid("vpc"),
            customerSegmentBlockId: seg.id,
            customerProfile: { jobs: [], pains: [], gains: [] },
            valueMap: { productsServices: [], painRelievers: [], gainCreators: [] },
          };
        }
        return (
          <SingleVPC key={seg.id} seg={seg} vpc={vpc} onChange={upsertVpc} />
        );
      })}
    </div>
  );
}

function SingleVPC({
  seg,
  vpc,
  onChange,
}: {
  seg: BMCBlock;
  vpc: ValuePropositionCanvas;
  onChange: (v: ValuePropositionCanvas) => void;
}) {
  const fit = vpcFit(vpc);

  const updateList = (
    side: "customerProfile" | "valueMap",
    key:
      | "jobs" | "pains" | "gains"
      | "productsServices" | "painRelievers" | "gainCreators",
    items: VPCItem[],
  ) => {
    const next: ValuePropositionCanvas = {
      ...vpc,
      [side]: {
        ...vpc[side],
        [key]: items,
      },
    } as ValuePropositionCanvas;
    onChange(next);
  };

  return (
    <div className="border border-ink-300/60 bg-ink-100/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <Label>CUSTOMER SEGMENT</Label>
          <div className="font-mono text-[11.5px] text-ink-900">{seg.label}</div>
        </div>
        <div className="text-right">
          <Label>VPC FIT</Label>
          <div className="font-mono text-[14px] text-ink-900">{fit}/100</div>
        </div>
      </div>
      <div className="mb-2">
        <BarMeter value={fit} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-ink-300/60 bg-ink-50 p-2">
          <Label>CUSTOMER PROFILE</Label>
          <VPCList
            heading="JOBS"
            items={vpc.customerProfile.jobs}
            onChange={(items) => updateList("customerProfile", "jobs", items)}
          />
          <VPCList
            heading="PAINS"
            items={vpc.customerProfile.pains}
            onChange={(items) => updateList("customerProfile", "pains", items)}
          />
          <VPCList
            heading="GAINS"
            items={vpc.customerProfile.gains}
            onChange={(items) => updateList("customerProfile", "gains", items)}
          />
        </div>
        <div className="border border-ink-300/60 bg-ink-50 p-2">
          <Label>VALUE MAP</Label>
          <VPCList
            heading="PRODUCTS & SERVICES"
            items={vpc.valueMap.productsServices}
            onChange={(items) => updateList("valueMap", "productsServices", items)}
          />
          <VPCList
            heading="PAIN RELIEVERS"
            items={vpc.valueMap.painRelievers}
            onChange={(items) => updateList("valueMap", "painRelievers", items)}
          />
          <VPCList
            heading="GAIN CREATORS"
            items={vpc.valueMap.gainCreators}
            onChange={(items) => updateList("valueMap", "gainCreators", items)}
          />
        </div>
      </div>
    </div>
  );
}

function VPCList({
  heading,
  items,
  onChange,
}: {
  heading: string;
  items: VPCItem[];
  onChange: (next: VPCItem[]) => void;
}) {
  const update = (id: string, patch: Partial<VPCItem>) =>
    onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => onChange(items.filter((x) => x.id !== id));
  const add = () =>
    onChange([...items, { id: uid("vi"), label: "Neu", weight: 50 }]);
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[9px] tracking-widest text-ink-500">{heading}</span>
        <button
          onClick={add}
          className="font-mono text-[9px] tracking-widest text-ink-600 hover:text-ink-900"
        >
          + ADD
        </button>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-1.5">
            <input
              value={it.label}
              onChange={(e) => update(it.id, { label: e.target.value })}
              className="flex-1 bg-transparent border-b border-dashed border-ink-300 focus:border-ink-700 outline-none py-0.5 text-[11px] text-ink-900 min-w-0"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={it.weight}
              onChange={(e) =>
                update(it.id, {
                  weight: Math.max(0, Math.min(100, Number(e.target.value))),
                })
              }
              className="w-12 bg-ink-100 border border-ink-300/60 text-ink-900 px-1 py-0.5 font-mono text-[10px] outline-none"
            />
            <button
              onClick={() => remove(it.id)}
              aria-label="remove item"
              className="font-mono text-[9px] text-ink-500 hover:text-ink-900"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
