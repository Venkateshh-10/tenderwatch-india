"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EvidenceEdge, EvidenceNode } from "@/lib/tender/graph";

type NodeData = {
  label: string;
  kind: string;
  evidence?: string;
  url?: string;
};

export function EvidenceGraph({ nodes, edges }: { nodes: EvidenceNode[]; edges: EvidenceEdge[] }) {
  const [selected, setSelected] = useState<NodeData | null>(null);
  const flowNodes = useMemo<Node<NodeData>[]>(
    () =>
      nodes.map((node, index) => ({
        id: node.id,
        position: index === 0 ? { x: 24, y: 150 } : { x: 320, y: 16 + (index - 1) * 92 },
        data: { label: `${node.type}: ${node.label}`, kind: node.type, evidence: node.evidence, url: node.url },
        style: {
          width: 240,
          fontSize: 12,
          lineHeight: 1.35,
          border: "1px solid #cfc4ad",
          borderRadius: 10,
          background: "#fff",
          padding: 8,
        },
      })),
    [nodes],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      })),
    [edges],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#5c564c]">
        Nodes come from stored buyer, department, official sources, change evidence, and notices with the same buyer.
      </p>
      <div className="h-[420px] overflow-hidden rounded-lg border border-[#e4dccb]">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_event, node) => setSelected(node.data)}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="rounded-lg border border-[#efe8da] bg-[#fbf7ef] p-3 text-sm">
        {selected ? (
          <div className="space-y-1">
            <p className="font-medium">{selected.kind}</p>
            <p>{selected.label}</p>
            <p>{selected.evidence ?? "No extra passage is stored on this node."}</p>
            {selected.url?.startsWith("/") ? (
              <Link className="underline" href={selected.url}>
                Open related notice
              </Link>
            ) : null}
            {selected.url && !selected.url.startsWith("/") ? (
              <a className="underline" href={selected.url} target="_blank" rel="noreferrer">
                Open source
              </a>
            ) : null}
          </div>
        ) : (
          <p>Select a node to read the stored evidence behind it.</p>
        )}
      </div>
    </div>
  );
}
