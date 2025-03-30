import { create } from "zustand";
import { nanoid } from "nanoid";
import { format } from "timeago.js";

// API URLs
const API_BASE_URL = "http://localhost:8080";

// Types
export type ValidMove = "up" | "down" | "left" | "right" | "a" | "b";

export type Poketree = {
  instanceId: string;
  move: ValidMove | null;
  validMoves: ValidMove[];
  screenshotUrl: string;
  children: Poketree[];
  timestamp: string;
};

type Instance = {
  instance_id: string;
  mcp_url: string;
  novnc_url: string;
};

type GameState = {
  collision_map: string;
  coordinates: [number, number];
  game_state: string;
  valid_moves: string[];
};

type ButtonResponse = {
  success: boolean;
  result: {
    result: string;
    screenshot: string;
  };
  game_state: GameState;
  valid_moves: string[];
};

// Store interface
interface GameStore {
  // State
  loading: boolean;
  tree: Poketree | null;
  currentInstanceId: string | null;
  activeInstances: Instance[];
  maxInstances: number;
  error: string | null;
  yoloMode: boolean;

  // Actions
  initialize: () => Promise<void>;
  executeMove: (instanceId: string, move: ValidMove) => Promise<void>;
  splitInstance: (instanceId?: string) => Promise<Instance | null>;
  shutdownInstance: (instanceId: string) => Promise<boolean>;
  getInstances: () => Promise<Instance[]>;
  resetError: () => void;
  addBranch: (
    parentId: string,
    childInstance: Instance,
    move: ValidMove
  ) => void;
  toggleYoloMode: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  loading: false,
  tree: null,
  currentInstanceId: null,
  activeInstances: [],
  maxInstances: 16,
  error: null,
  yoloMode: false,

  toggleYoloMode: () => set((state) => ({ yoloMode: !state.yoloMode })),

  resetError: () => set({ error: null }),

  initialize: async () => {
    try {
      set({ loading: true, error: null });

      // Create a fresh instance
      const instance = await get().splitInstance();

      if (!instance) {
        throw new Error("Failed to create initial instance");
      }

      // Initialize the tree with the root node
      const tree: Poketree = {
        instanceId: instance.instance_id,
        move: null, // Root node has no move
        validMoves: ["up", "down", "left", "right"], // Default moves, will be updated after first API call
        screenshotUrl: "", // Will be populated after first API call
        children: [],
        timestamp: new Date().toISOString(),
      };

      set({
        tree,
        currentInstanceId: instance.instance_id,
        loading: false,
      });

      // Get initial game state by sending a dummy action (we'll use "start")
      await get().executeMove(instance.instance_id, "right");
    } catch (error) {
      console.error("Initialization error:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during initialization",
        loading: false,
      });
    }
  },

  getInstances: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/instances`);

      if (!response.ok) {
        throw new Error(`Failed to get instances: ${response.statusText}`);
      }

      const data = await response.json();
      const instances = data.instances as Instance[];

      set({ activeInstances: instances });
      return instances;
    } catch (error) {
      console.error("Get instances error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to get instances",
      });
      return [];
    }
  },

  splitInstance: async (instanceId?: string) => {
    try {
      set({ loading: true, error: null });

      // Check if we're at max instances
      const instances = await get().getInstances();
      if (instances.length >= get().maxInstances) {
        throw new Error(
          `Maximum number of instances (${get().maxInstances}) reached. Shut down some instances first.`
        );
      }

      // Prepare request body
      const body = instanceId ? { instance_id: instanceId } : {};

      // Call the split API
      const response = await fetch(`${API_BASE_URL}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to split instance: ${response.statusText}`);
      }

      const newInstance = (await response.json()) as Instance;

      // Update active instances
      set((state) => ({
        activeInstances: [...state.activeInstances, newInstance],
        loading: false,
      }));

      return newInstance;
    } catch (error) {
      console.error("Split instance error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to split instance",
        loading: false,
      });
      return null;
    }
  },

  shutdownInstance: async (instanceId: string) => {
    try {
      set({ loading: true, error: null });

      const response = await fetch(
        `${API_BASE_URL}/instance/${instanceId}/shutdown`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to shutdown instance: ${response.statusText}`);
      }

      // Update active instances
      set((state) => ({
        activeInstances: state.activeInstances.filter(
          (instance) => instance.instance_id !== instanceId
        ),
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("Shutdown instance error:", error);
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to shutdown instance",
        loading: false,
      });
      return false;
    }
  },

  executeMove: async (instanceId: string, move: ValidMove) => {
    try {
      set({ loading: true, error: null });

      const response = await fetch(`${API_BASE_URL}/button`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          button: move,
          instance_id: instanceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute move: ${response.statusText}`);
      }

      const data = (await response.json()) as ButtonResponse;

      // Extract validMoves from the response
      const validMoves = data.valid_moves
        .filter((move) =>
          ["up", "down", "left", "right", "a", "b", "start", "select"].includes(
            move
          )
        )
        .map((move) => move as ValidMove);

      // Create a data URL from the base64 screenshot
      const screenshotUrl = `data:image/png;base64,${data.result.screenshot}`;

      // Update the tree
      set((state) => {
        // If tree doesn't exist yet, create a new one
        if (!state.tree) {
          return {
            tree: {
              instanceId,
              move,
              validMoves,
              screenshotUrl,
              children: [],
              timestamp: new Date().toISOString(),
            },
            loading: false,
            currentInstanceId: instanceId,
          };
        }

        // Find the node in the tree and update it
        const updateTreeNode = (node: Poketree): Poketree => {
          if (node.instanceId === instanceId) {
            return {
              ...node,
              validMoves,
              screenshotUrl,
              move: move ?? node.move,
            };
          }

          return {
            ...node,
            children: node.children.map(updateTreeNode),
          };
        };

        return {
          tree: updateTreeNode(state.tree),
          loading: false,
          currentInstanceId: instanceId,
        };
      });
    } catch (error) {
      console.error("Execute move error:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to execute move",
        loading: false,
      });
    }
  },

  // Add a new function to add a child to the tree
  addBranch: (parentId: string, childInstance: Instance, move: ValidMove) => {
    set((state) => {
      if (!state.tree) return state;

      // Create a function to recursively add a child to the correct parent
      const addChildToNode = (node: Poketree): Poketree => {
        if (node.instanceId === parentId) {
          // Create a new child node
          const childNode: Poketree = {
            instanceId: childInstance.instance_id,
            move,
            validMoves: [], // Will be populated when executeMove is called
            screenshotUrl: "", // Will be populated when executeMove is called
            children: [],
            timestamp: new Date().toISOString(),
          };

          // Add to parent's children if it doesn't already exist
          const childExists = node.children.some(
            (child) => child.instanceId === childInstance.instance_id
          );
          if (!childExists) {
            return {
              ...node,
              children: [...node.children, childNode],
            };
          }
          return node;
        }

        // Recursively search in children
        return {
          ...node,
          children: node.children.map(addChildToNode),
        };
      };

      return {
        ...state,
        tree: addChildToNode(state.tree),
      };
    });
  },
}));
