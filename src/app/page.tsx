"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown } from "lucide-react";
import { nanoid } from "nanoid";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { format } from "timeago.js";

type ValidMove =
  | "up"
  | "down"
  | "left"
  | "right"
  | "a"
  | "b"
  | "start"
  | "select";

type Poketree = {
  instanceId: string;
  move: ValidMove;
  validMoves: ValidMove[];
  screenshotUrl: string;
  children: Poketree[];
  timestamp: string;
};

// Utility function to get all parent instances for a given instance ID
function getInstancePath(tree: Poketree, targetId: string): Poketree[] {
  if (tree.instanceId === targetId) {
    return [tree];
  }

  for (const child of tree.children) {
    const path = getInstancePath(child, targetId);
    if (path.length > 0) {
      return [tree, ...path];
    }
  }

  return [];
}

// Generate mock Poketree data with random moves and IDs
function mockPoketree(
  depth = 10,
  move?: ValidMove,
  baseTime = new Date(),
  currentDepth = 0
): Poketree {
  // All possible valid moves
  const allMoves: ValidMove[] = [
    "up",
    "down",
    "left",
    "right",
    "a",
    "b",
    "start",
    "select",
  ];

  // Generate 1-4 random valid moves
  const numValidMoves = Math.floor(Math.random() * 4) + 1;
  const validMoves: ValidMove[] = [];

  for (let i = 0; i < numValidMoves; i++) {
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    if (!validMoves.includes(randomMove)) {
      validMoves.push(randomMove);
    }
  }

  // Random time increment between 1-5 seconds
  const timeIncrement = Math.floor(Math.random() * 5000) + 1000;
  const timestamp = new Date(baseTime.getTime() + timeIncrement);

  // Create node
  const node: Poketree = {
    instanceId: nanoid(),
    move: move || allMoves[Math.floor(Math.random() * allMoves.length)],
    validMoves,
    screenshotUrl: "https://example.com/screenshot.png",
    timestamp: timestamp.toISOString(),
    children: [],
  };

  // Add children if not at max depth
  if (currentDepth < depth) {
    node.children = validMoves.map((childMove) =>
      mockPoketree(depth, childMove, timestamp, currentDepth + 1)
    );
  }

  return node;
}

// Utility function to count all nodes in a tree
function countNodes(tree: Poketree): number {
  // Count the current node
  let count = 1;

  // Recursively count all children
  for (const child of tree.children) {
    count += countNodes(child);
  }

  return count;
}

// Use mockPoketree with a smaller depth for better performance
const pokeTree: Poketree = mockPoketree(5); // Using depth of 3 to avoid too many nodes

export default function Home() {
  // Calculate total nodes
  const totalNodes = countNodes(pokeTree);

  return (
    <div className="p-4 w-full font-mono">
      <h1 className="text-3xl font-bold mb-4">
        PokeBranch{" "}
        <span className="text-zinc-400 text-xl">({totalNodes} items)</span>
      </h1>
      <div className="bg-secondary/50 p-4">
        <PokeTree tree={pokeTree} />
      </div>
    </div>
  );
}

function GameboyTimeline({ instanceId }: { instanceId: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [instances, setInstances] = useState<Poketree[]>([]);

  useEffect(() => {
    // Get the path from root to current instance
    const path = getInstancePath(pokeTree, instanceId);
    setInstances(path);
    // Set current to the last item index
    setCurrent(path.length - 1);
  }, [instanceId]);

  useEffect(() => {
    if (!api) return;

    // When API is ready, scroll to the last item
    if (instances.length > 0) {
      api.scrollTo(instances.length - 1);
    }

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    return () => {
      api.off("select", () => {
        // Cleanup event listener
      });
    };
  }, [api, instances]);

  const handleSlideClick = (index: number) => {
    if (api) {
      api.scrollTo(index);
      setCurrent(index);
    }
  };

  const handleTimelineClick = (index: number) => {
    if (api) {
      api.scrollTo(index);
      setCurrent(index);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (api && value.length > 0) {
      const index = Math.round(value[0]);
      api.scrollTo(index);
      setCurrent(index);
    }
  };

  if (instances.length === 0) return null;

  return (
    <div className="w-full relative">
      {/* Breadcrumb showing the move path */}
      <div className="mb-4 bg-zinc-800/40 rounded-md p-3">
        <Breadcrumb>
          <BreadcrumbList>
            {instances.map((instance, index) => (
              <React.Fragment key={instance.instanceId}>
                <BreadcrumbItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {index === instances.length - 1 ? (
                        <BreadcrumbPage>
                          {instance.move ? (
                            <span className="bg-zinc-700/50 px-2 py-0.5 rounded text-emerald-400 font-medium uppercase">
                              {instance.move}
                            </span>
                          ) : (
                            "Root"
                          )}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          className="cursor-default"
                          onClick={(e) => e.preventDefault()}
                        >
                          {instance.move ? (
                            <span className="bg-zinc-700/50 px-2 py-0.5 rounded text-emerald-400 font-medium uppercase">
                              {instance.move}
                            </span>
                          ) : (
                            "Root"
                          )}
                        </BreadcrumbLink>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Instance ID: {instance.instanceId}</p>
                    </TooltipContent>
                  </Tooltip>
                </BreadcrumbItem>
                {index < instances.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Carousel
        className="w-full"
        setApi={setApi}
        opts={{
          align: "center",
          loop: false,
        }}
      >
        <CarouselContent className="-ml-4">
          {instances.map((instance, idx) => (
            <CarouselItem
              key={instance.instanceId}
              className="pl-4 md:basis-1/2 lg:basis-2/5 cursor-pointer"
              onClick={() => handleSlideClick(idx)}
            >
              <div
                className={`p-1 transition-opacity duration-300 ${idx === current ? "opacity-100" : "opacity-40"}`}
              >
                <RenderGameboy screenshotUrl={instance.screenshotUrl} />
                <div className="mt-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-zinc-400">Instance</span>
                    <span className="font-medium text-zinc-200 font-mono">
                      {instance.instanceId}
                    </span>
                  </div>
                  {instance.move && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-zinc-400">Move</span>
                      <span className="bg-zinc-700/50 px-2 py-0.5 rounded text-emerald-400 font-medium uppercase">
                        {instance.move}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 opacity-80 hover:opacity-100" />
        <CarouselNext className="right-4 opacity-80 hover:opacity-100" />
      </Carousel>

      {/* Mini timeline for navigation */}
      <div className="mt-4 bg-zinc-800/40 rounded-md p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Timeline</div>
          <div className="text-sm text-zinc-400 font-mono">
            {current + 1} / {instances.length}
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 h-8">
          {instances.map((instance, index) => (
            <Tooltip key={instance.instanceId}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleTimelineClick(index)}
                  className={`transition-all flex items-center justify-center ${
                    index === current
                      ? "bg-primary text-primary-foreground px-2 py-1 rounded-md"
                      : "bg-zinc-700/50 hover:bg-zinc-600/50 w-4 h-4 rounded-full"
                  }`}
                  aria-label={`Go to instance ${instance.instanceId}`}
                >
                  {index === current ? `#${instance.instanceId}` : ""}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Instance ID: {instance.instanceId}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Timeline scrubber slider */}
        <div className="mt-4">
          <Slider
            value={[current]}
            min={0}
            max={instances.length - 1}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function PokeTree({ tree, depth = 0 }: { tree: Poketree; depth?: number }) {
  const [selectedMove, setSelectedMove] = useState<ValidMove | null>(null);

  return (
    <div className="mb-8" style={{ marginLeft: `${depth * 16}px` }}>
      <div className="mb-4 bg-zinc-800/50 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Instance</span>
            <span className="font-medium text-zinc-200 font-mono">
              {tree.instanceId}
            </span>
          </div>
          {tree.move && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Move</span>
              <span className="bg-zinc-700/50 px-2 py-0.5 rounded text-emerald-400 font-medium uppercase">
                {tree.move}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>{new Date(tree.timestamp).toLocaleString()}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-500">{format(tree.timestamp)}</span>
        </div>
      </div>

      <GameboyTimeline instanceId={tree.instanceId} />

      <div className="mt-4">
        <div className="text-sm font-medium mb-2">Valid Moves:</div>
        <div className="flex flex-col gap-2">
          {tree.validMoves.map((move) => {
            const childForMove = tree.children.find(
              (child) => child.move === move
            );
            const isSelected = selectedMove === move;

            return (
              <div key={move} className="flex flex-col">
                <button
                  onClick={() => setSelectedMove(isSelected ? null : move)}
                  className={`px-3 py-1 rounded-sm flex items-center gap-1 ${
                    childForMove
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {move}
                  {childForMove && (
                    <ChevronDown
                      className={`h-3 w-3 ml-1 transition-transform ${
                        isSelected ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {childForMove && isSelected && (
                  <div className="mt-4">
                    <PokeTree tree={childForMove} depth={depth + 1} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RenderGameboy({ screenshotUrl }: { screenshotUrl: string }) {
  return (
    <div className="relative w-128">
      <Image
        src="/gb.png"
        alt="Gameboy"
        width={600}
        height={1000}
        className="w-full"
      />
      <img
        src={screenshotUrl}
        alt="Screenshot"
        className="absolute top-28 left-36 w-[13.625rem] h-[12rem] rounded-[4px] bg-red-500"
      />
    </div>
  );
}
