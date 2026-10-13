---
name: infographic-craft
title: "信息图表与科学图谱"
description: Use when creating, researching, or refining educational diagrams, scientific infographics, technical blueprints, and grounded visual knowledge aids. Uses Google Search grounding to retrieve verified facts and generates 16:9 high-definition infographics tailored to audience complexity (Elementary to Expert) and aesthetic styles.
---

# Infographic Craft: Grounded Visual Knowledge Engine

Use this skill when teaching complex scientific mechanisms, architectural diagrams, biological structures, chemical processes, engineering blueprints, or historical timelines that require **grounded, accurate, beautiful visual diagrams**.

## When to Call `generate_infographic`

Call `generate_infographic` instead of generic `generate_image` whenever:
1. **Factual accuracy is paramount**: The diagram depicts a real-world scientific, medical, technical, or historical process that benefits from Google Search grounding.
2. **Pedagogical audience matching**: The diagram must be tailored to a specific comprehension level (`Elementary`, `High School`, `College`, `Expert`).
3. **Specific aesthetic design language**: The lesson calls for a specific visual style like `Sketch` (Technical Blueprint), `3D Render` (3D Isometric), `Default` (Standard Scientific), or `Vintage` (Lithograph).

## Tool Invocation Parameters

```json
{
  "stageId": "stage-...",
  "topic": "Krebs citric acid cycle metabolic pathways",
  "complexityLevel": "College",
  "visualStyle": "Default",
  "language": "English"
}
```

### Audience / Complexity Level
- `Elementary`: Friendly, simplified metaphors, vibrant colors, clear large labels.
- `High School`: Standard educational diagrams, labeled components, clear flows.
- `College`: Detailed academic structures, biochemical/mechanical precision, quantitative markers.
- `Expert`: Technical schematics, professional standard notations, dense relational mapping.

### Aesthetic Styles
- `Default`: Standard Scientific illustration (clean, crisp, authoritative white/slate canvas).
- `Sketch`: Technical Blueprint / Engineering schematic (cyan/blueprint grid, precise dimension lines).
- `3D Render`: 3D Isometric cutaway (isometric perspective, depth lighting, modern render).
- `Vintage`: Antique Lithograph / Classic botanical or anatomical print.
- `Futuristic`: Cyberpunk HUD / Digital telemetry diagram.
- `Minimalist`: Clean vector iconography, high whitespace ratio.
- `Realistic`: Photorealistic natural/physical visualization.

## Embedding the Infographic in Slides

`generate_infographic` returns:
- `src`: The persisted local URL (e.g. `/api/classroom-media/stage-.../media/infographic-...png`).
- `facts`: An array of grounded factual statements discovered during research.
- `citations`: Web sources and references from Google Search grounding.

Use `patch_stage` to place the visual onto the slide canvas (1000 × 562.5):

```json
{
  "stageId": "stage-...",
  "path": "/scenes/2",
  "op": "set",
  "value": {
    "elements": [
      {
        "id": "title-1",
        "type": "text",
        "left": 60,
        "top": 50,
        "width": 880,
        "height": 46,
        "content": "Citric Acid Cycle (Krebs Cycle)"
      },
      {
        "id": "infographic-1",
        "type": "image",
        "left": 60,
        "top": 110,
        "width": 880,
        "height": 400,
        "src": "<returned-src>",
        "alt": "Krebs Cycle Infographic"
      }
    ]
  }
}
```

## Grounding Facts in Voice Narration

Always leverage the returned `facts` array in the scene's narration (`generate_tts` or `actions`) to explain the exact labels and processes depicted in the diagram, ensuring complete audio-visual cohesion.
