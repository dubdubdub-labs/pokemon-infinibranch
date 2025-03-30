# Pokemon Infinibranch API Documentation

## Overview

we are interfacing with an external API that creates and manages game instances.
an important rule about this service is that we can only have UP TO 16 ACTIVE INSTANCES AT ANY TIME.
in order to create new instances, we must shut down past instances after they have been split.

## Available Endpoints

### Instance Management

- the URL for all instances is `localhost:8080`

- `GET /instances` - List all active game instances

returns

```json
{
  "instances": [
    {
      "instance_id": "morphvm_bf8ybjdy",
      "mcp_url": "https://mcp-morphvm-bf8ybjdy.http.cloud.morph.so",
      "novnc_url": "https://novnc-morphvm-bf8ybjdy.http.cloud.morph.so"
    }
  ]
}
```

- `POST /split` - Create a new instance
  - When provided an instance ID: Creates a clone of the specified instance
  - When no instance ID is provided: Creates a fresh instance

inputs:

```json
{
  "instance_id": "morphvm_i3ho4vcf"
}
```

outputs:

```json
{
  "instance_id": "morphvm_bf8ybjdy",
  "mcp_url": "https://mcp-morphvm-bf8ybjdy.http.cloud.morph.so",
  "novnc_url": "https://novnc-morphvm-bf8ybjdy.http.cloud.morph.so"
}
```

- `POST /instance/{instance_id}/shutdown` - Terminate a specific instance

### Game Actions

- `POST /button` - Execute a button press in a game instance

  - Parameters: `button` (action to take) and `instance_id`
  - Returns: A screenshot of the resulting game state and a list of available actions

inputs:

```json
{
  "button": "left",
  "instance_id": "morphvm_bf8ybjdy"
}
```

outputs:

```json
{
  "success": true,
  "result": {
    "result": "Pressed buttons: left",
    "screenshot": "[BIG BASE64 STRING]"
  },
  "game_state": {
    "collision_map": "+----------+\n|██████████|\n|██████████|\n|···████··█|\n|···█·██S·█|\n|····←·····|\n|█·········|\n|··········|\n|·······███|\n|··········|\n+----------+\n\nLegend:\n█ - Wall/Obstacle\n· - Path/Walkable\nS - Sprite\n↑/↓/←/→ - Player (facing direction)",
    "coordinates": [11, 6],
    "game_state": "Player: CLAUDE\nRival: WACLAUD\nMoney: $2586\nLocation: ROUTE 4\nCoordinates: (11, 6)\nValid Moves: up, down, left, right\nBadges: BOULDER\nInventory:\n  POKé BALL x11\n  ANTIDOTE x1\n  POTION x2\n  TM34 x1\nDialog: None\n\nPokemon Party:\n\nN (NIDORAN M):\nLevel 10 - HP: 29/29\nTypes: POISON\n- TACKLE (PP: 35)\n- LEER (PP: 30)\n- HORN ATTACK (PP: 25)\n\nB (PIDGEY):\nLevel 12 - HP: 34/34\nTypes: NORMAL, FLYING\n- GUST (PP: 35)\n- SAND ATTACK (PP: 15)\n- QUICK ATTACK (PP: 30)\n\nS (BULBASAUR):\nLevel 15 - HP: 44/44\nTypes: GRASS, POISON\n- TACKLE (PP: 35)\n- GROWL (PP: 40)\n- LEECH SEED (PP: 10)\n- VINE WHIP (PP: 10)\n\nP (PIKACHU):\nLevel 12 - HP: 33/33\nTypes: ELECTRIC\n- THUNDERSHOCK (PP: 30)\n- GROWL (PP: 40)\n- THUNDER WAVE (PP: 20)\n",
    "valid_moves": ["up", "down", "left", "right"]
  },
  "valid_moves": ["up", "down", "left", "right"]
}
```

## Exploration Workflow

1. **Initialize**: Create a fresh instance by calling `POST /split` with no instance ID
2. **Navigate**: Send a direction command (e.g., "right" button) via `POST /button`
3. **Analyze**: Process the returned screenshot and list of available actions
4. **Branch**: For each available action:
   - Create a new branch with `POST /split` using the current instance ID
   - Apply the action to this new instance
   - Shutdown the original instance with `POST /instance/{instance_id}/shutdown`
   - Continue exploring from this new state

This workflow enables systematic exploration of all possible paths by creating new instances at each decision point.
