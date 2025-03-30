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
import { Button } from "@/components/ui/button";
import { ChevronDown, Play, RefreshCw } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { format } from "timeago.js";
import { useGameStore, type Poketree, type ValidMove } from "@/lib/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

// Utility function to count all nodes in a tree
function countNodes(tree: Poketree): number {
  if (!tree) return 0;

  // Count the current node
  let count = 1;

  // Recursively count all children
  for (const child of tree.children) {
    count += countNodes(child);
  }

  return count;
}

export default function Home() {
  const {
    tree,
    loading,
    error,
    initialize,
    resetError,
    activeInstances,
    maxInstances,
  } = useGameStore();

  // Calculate total nodes
  const totalNodes = tree ? countNodes(tree) : 0;

  return (
    <div className="p-4 w-full font-mono">
      <h1 className="text-3xl font-bold mb-4">
        PokeBranch{" "}
        <span className="text-zinc-400 text-xl">({totalNodes} items)</span>
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={resetError}
            className="mt-2"
          >
            Dismiss
          </Button>
        </Alert>
      )}

      <div className="mb-4 flex items-center justify-between gap-4">
        <Button
          onClick={initialize}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {tree ? "Reset Game" : "Start Game"}
        </Button>

        <div className="text-sm text-zinc-400">
          Active Instances: {activeInstances.length} / {maxInstances}
        </div>
      </div>

      {tree ? (
        <div className="bg-secondary/50 p-4">
          <PokeTree tree={tree} />
        </div>
      ) : (
        <div className="bg-secondary/50 p-12 flex items-center justify-center text-zinc-400 rounded-md">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p>Initializing game...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p>Click the Start Game button to begin exploring</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GameboyTimeline({ instanceId }: { instanceId: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [instances, setInstances] = useState<Poketree[]>([]);
  const { tree } = useGameStore();

  useEffect(() => {
    if (!tree) return;

    // Get the path from root to current instance
    const path = getInstancePath(tree, instanceId);
    setInstances(path);
    // Set current to the last item index
    setCurrent(path.length - 1);
  }, [instanceId, tree]);

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
  const { executeMove, splitInstance, shutdownInstance, loading, addBranch } =
    useGameStore();

  const handleMoveClick = async (instanceId: string, move: ValidMove) => {
    // Check if we already have a child with this move
    const existingChild = tree.children.find((child) => child.move === move);

    if (existingChild) {
      // We already have this branch, just toggle visibility
      setSelectedMove(selectedMove === move ? null : move);
    } else {
      // We need to create a new branch

      // 1. Create a new instance by splitting the current one
      const newInstance = await splitInstance(instanceId);

      if (!newInstance) return;

      // 2. Add the branch to our tree
      addBranch(instanceId, newInstance, move);

      // 3. Execute the move on the new instance
      await executeMove(newInstance.instance_id, move);

      // 4. Expand the UI to show the new branch
      setSelectedMove(move);
    }
  };

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
                <Button
                  onClick={() => {
                    if (childForMove) {
                      setSelectedMove(isSelected ? null : move);
                    } else {
                      handleMoveClick(tree.instanceId, move);
                    }
                  }}
                  disabled={loading}
                  className={`px-3 py-1 rounded-sm flex items-center gap-1 ${
                    childForMove
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {move}
                  {loading && !childForMove && selectedMove === move ? (
                    <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
                  ) : childForMove ? (
                    <ChevronDown
                      className={`h-3 w-3 ml-1 transition-transform ${
                        isSelected ? "rotate-180" : ""
                      }`}
                    />
                  ) : null}
                </Button>

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
        src={screenshotUrl || "/placeholder-screenshot.png"}
        alt="Screenshot"
        className="absolute top-28 left-36 w-[13.625rem] h-[12rem] rounded-[4px] bg-zinc-900"
      />
    </div>
  );
}
