# 📜 SagaForge API Contract & Integration Guide

**Base URL**: `http://localhost:5000`  
**CORS**: Enabled (`*`)  
**Format**: Strict JSON (`application/json`)

Welcome frontend partner! 👋 This document contains the exact REST endpoints, JSON payload schemas, and ready-to-use TypeScript fetch snippets you need to build the UI without waiting or guessing.

---

## 1. Health & Server Status
Check if the AI engine and Gemini model are online.

* **Endpoint**: `GET /api/health`
* **Response `200 OK`**:
```json
{
  "status": "ONLINE",
  "service": "SagaForge AI Narrative Engine",
  "geminiConfigured": true,
  "model": "gemini-3.5-flash-lite",
  "timestamp": "2026-11-10T02:05:00.000Z"
}
```

---

## 2. Real-Time Lore Continuity Audit ("Continuity Cop")
Pass newly typed scene prose or dialogue. The AI cross-references the Master Story Bible, character physical states, and world physics to catch contradictions and plot holes.

* **Endpoint**: `POST /api/audit-lore`
* **Request Body**:
```json
{
  "scriptText": "EXT. ROOFTOP - NIGHT\nAn intense Ion Storm rages overhead. Jack Vance picks up his wireless commlink and aims a two-handed assault rifle with both hands.",
  "activeNodeId": "node-ep1-scene1" // (Optional) will use branch state if provided
}
```

* **Response `200 OK`**:
```json
{
  "hasViolations": true,
  "totalViolations": 2,
  "canonConsistencyScore": 35,
  "auditSummary": "Detected 2 canon contradictions in the scene.",
  "violations": [
    {
      "id": "VIOLATION-01",
      "severity": "CRITICAL",
      "category": "LORE_PHYSICS",
      "flaggedText": "Jack Vance picks up his wireless commlink",
      "violatedRule": "RULE-PHYS-01 (Atmospheric Ion Storm Interference)",
      "explanation": "During high-altitude Ion Storms over Neo-Kyoto, all wireless RF/cellular communications are disabled.",
      "suggestedFix": "Change the action to Vance using a hardline terminal or laser-line-of-sight relay device."
    },
    {
      "id": "VIOLATION-02",
      "severity": "HIGH",
      "category": "CHARACTER_STATE",
      "flaggedText": "aims a two-handed assault rifle with both hands",
      "violatedRule": "RULE-CHAR-03 (Commander Jack Vance Physical State)",
      "explanation": "Commander Jack Vance lost his left biological arm and his industrial prosthetic cannot hold two-handed firearms.",
      "suggestedFix": "Have Jack fire his single-handed 9mm Flechette pistol or rest the barrel on cover."
    }
  ]
}
```

---

## 3. Dialogue Voice Fidelity Analyzer
Pass a character's name and a line of dialogue. Checks whether the line sounds authentic to their dialect, mannerisms, and vocabulary or sounds like generic bot prose.

* **Endpoint**: `POST /api/analyze-voice`
* **Request Body**:
```json
{
  "characterName": "Jack Vance",
  "dialogueLine": "Excuse me, Dr. Chen! I am terribly sorry for any inconvenience caused by our delay."
}
```

* **Response `200 OK`**:
```json
{
  "character": "Commander Jack Vance",
  "fidelityScore": 0,
  "verdict": "OUT_OF_CHARACTER",
  "voiceDriftReason": "Complete violation of voice fingerprint. Uses polite apologies ('Excuse me', 'terribly sorry') and a submissive tone utterly antithetical to a cynical mercenary.",
  "detectedMetrics": {
    "formality": 85,
    "cynicism": 10,
    "aggression": 5
  },
  "recommendedRewrite": "Save the sermon, Chen. We move now."
}
```

---

## 4. Co-Writer Scene Generator
Generates high-impact screenplay beats matching active character state and canon.

* **Endpoint**: `POST /api/story/generate-beat`
* **Request Body**:
```json
{
  "promptInstruction": "Jack confronts the syndicate broker about the tampered shard.",
  "activeNodeId": "node-ep1-scene1",
  "tone": "Gritty, tense, cinematic"
}
```

* **Response `200 OK`**:
```json
{
  "sceneScript": "EXT. SUB-LEVEL 3 ALLEY - NIGHT\n\nRain hammers against the rusted zinc roof like scattershot...\n\nJACK\nYou're three minutes late...",
  "universe": "Neon Eclipse: Neo-Kyoto 2142",
  "activeState": {
    "inventory": ["Broken Level 4 Cyberdeck", "Silenced 9mm Flechette Pistol"],
    "characterStatus": { "Jack_Vance": "Injured left arm" }
  }
}
```

---

## 5. Vector Memory Tree & Branching State
Retrieve the full episodic graph or dynamically create unscripted narrative branches.

* **Endpoint**: `GET /api/story-tree`
* **Response `200 OK`**:
```json
{
  "totalNodes": 3,
  "nodes": [
    {
      "id": "node-ep1-scene1",
      "episodeNumber": 1,
      "sceneTitle": "The Rainy Alley of Sub-Level 3",
      "summary": "Jack meets Dr. Aria Chen...",
      "activeState": {
        "factionReputation": { "Arasaka_Zaibatsu": -40, "Neon_Syndicate": 20 },
        "inventory": ["Silenced 9mm Flechette Pistol"],
        "unlockedSecrets": ["Project Chimera coordinates"],
        "characterStatus": { "Jack_Vance": "Injured left arm" }
      },
      "choices": [
        {
          "id": "choice-1a",
          "choiceText": "Decrypt the Data Shard immediately using the noodle bar terminal.",
          "targetNodeId": "node-ep1-scene2-branchA",
          "stateDelta": { "factionReputation": { "Neon_Syndicate": -10 } }
        }
      ]
    }
  ]
}
```

* **Create New Branch**: `POST /api/story-tree/branch`
```json
{
  "parentNodeId": "node-ep1-scene1",
  "choiceText": "Threaten the bartender for a secret underground access tunnel.",
  "newSceneTitle": "Branch C: The Sewer Infiltration",
  "newSummary": "Jack and Aria escape through toxic sub-tunnels beneath the city.",
  "stateDelta": {
    "factionReputation": { "Metro_Police": -10 },
    "inventoryChanges": ["+Sewer Maintenance Keycard"]
  }
}
```

---

## 6. Context Caching Benchmark Metrics (For Judge UI)
Display real-time token economics and latency reduction powered by Gemini Context Caching.

* **Endpoint**: `GET /api/context-cache-stats`
* **Response `200 OK`**:
```json
{
  "contextCachingActive": true,
  "cachedTokens": 148500,
  "tokenSavingsPercent": 75.2,
  "latencyReductionPercent": 88.1,
  "benchmark": {
    "standardLatencyMs": 3800,
    "cachedLatencyMs": 450,
    "standardSessionCostUsd": 0.8353,
    "cachedSessionCostUsd": 0.2072
  }
}
```

---

## 🚀 Ready-to-Paste Frontend API Helper (`apiClient.ts`)

```typescript
const BASE_URL = 'http://localhost:5000/api';

export const sagaApi = {
  async auditLore(scriptText: string, activeNodeId?: string) {
    const res = await fetch(`${BASE_URL}/audit-lore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptText, activeNodeId })
    });
    return res.json();
  },

  async analyzeVoice(characterName: string, dialogueLine: string) {
    const res = await fetch(`${BASE_URL}/analyze-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName, dialogueLine })
    });
    return res.json();
  },

  async generateBeat(promptInstruction: string, activeNodeId?: string) {
    const res = await fetch(`${BASE_URL}/story/generate-beat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptInstruction, activeNodeId })
    });
    return res.json();
  },

  async getStoryTree() {
    const res = await fetch(`${BASE_URL}/story-tree`);
    return res.json();
  },

  async getCacheStats() {
    const res = await fetch(`${BASE_URL}/context-cache-stats`);
    return res.json();
  }
};
```
