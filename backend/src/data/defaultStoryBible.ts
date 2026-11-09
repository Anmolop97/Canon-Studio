import { StoryBible, StoryNode } from '../types/index.js';

export const cyberpunkUniverse: StoryBible = {
  universeName: 'Neon Eclipse: Neo-Kyoto 2142',
  universeLogline: 'A rainy, corporate-dominated metropolis where neural cyberware is subject to magnetic atmospheric storms and corporate espionage.',
  rules: [
    {
      ruleId: 'RULE-PHYS-01',
      title: 'Atmospheric Ion Storm Interference',
      category: 'LORE_PHYSICS',
      content: 'During the high-altitude Ion Storms over Neo-Kyoto, all long-range wireless RF/cellular communications are disabled. Only fiber-optic hardlines and laser-line-of-sight relays function.'
    },
    {
      ruleId: 'RULE-TECH-02',
      title: 'Overclocking Neural Cyberdecks',
      category: 'MAGIC_TECH_RULE',
      content: 'A Level 4 cyberdeck cannot breach military-grade Black ICE without external liquid helium cooling. Attempting to do so triggers a neuro-feedback stroke that renders the user unconscious.'
    },
    {
      ruleId: 'RULE-CHAR-03',
      title: 'Commander Jack Vance Physical State',
      category: 'CHARACTER_STATE',
      content: 'In Episode 1, Commander Jack Vance lost his left biological arm during the dockside ambush. He currently has an uncalibrated industrial prosthetic that cannot hold two-handed firearms or execute precision lockpicking.'
    },
    {
      ruleId: 'RULE-GEO-04',
      title: 'The Sunken District Quarantine',
      category: 'WORLD_GEOGRAPHY',
      content: 'The Sub-Level 7 flooded wards are sealed by heavy hydraulic blast doors. Nobody can enter or exit without an authorized Megacorp biometric keycard or an explosive thermite charge.'
    }
  ],
  characters: [
    {
      characterId: 'char-jack-vance',
      name: 'Commander Jack Vance',
      archetype: 'Grizzled, cynical ex-military mercenary',
      formality: 15,
      cynicism: 90,
      aggression: 80,
      signaturePhrases: ['Save the sermon', 'Credits talk, chrome walks', 'Another dead-end street'],
      forbiddenPatterns: ['Polite apologies', 'Academic terminology', 'Cheery greetings', 'Modern tech buzzwords like synergy or vibe'],
      speechMannerisms: 'Speaks in clipped, dry, hardboiled sentences. Never asks twice. Never uses pleasantries.'
    },
    {
      characterId: 'char-aria-chen',
      name: 'Dr. Aria Chen',
      archetype: 'Brilliant, cold, high-society neuro-technologist',
      formality: 95,
      cynicism: 60,
      aggression: 35,
      signaturePhrases: ['Statistically negligible', 'The neural telemetry does not lie', 'Patience is a prerequisite'],
      forbiddenPatterns: ['Street slang', 'Contractions like gotta/wanna', 'Vulgar profanity', 'Unemotional panic'],
      speechMannerisms: 'Eloquent, precise, clinical vocabulary. Speaks with razor-sharp surgical detachment.'
    }
  ],
  initialState: {
    factionReputation: {
      'Arasaka_Zaibatsu': -40,
      'Neon_Syndicate': +20,
      'Metro_Police': 0
    },
    inventory: ['Broken Level 4 Cyberdeck', 'Silenced 9mm Flechette Pistol', 'Stolen Data Shard'],
    unlockedSecrets: ['Project Chimera coordinates'],
    characterStatus: {
      'Jack_Vance': 'Injured left arm, severe cyberware burnout',
      'Dr_Aria': 'Under corporate surveillance'
    }
  }
};

export const sampleStoryTree: StoryNode[] = [
  {
    id: 'node-ep1-scene1',
    episodeNumber: 1,
    sceneTitle: 'The Rainy Alley of Sub-Level 3',
    summary: 'Jack meets Dr. Aria Chen in an abandoned noodle bar while an Ion Storm brews overhead. They must decide whether to decrypt the stolen corporate shard or hand it to the Syndicate.',
    activeState: cyberpunkUniverse.initialState,
    choices: [
      {
        id: 'choice-1a',
        choiceText: 'Decrypt the Data Shard immediately using the noodle bar’s bootleg server terminal.',
        targetNodeId: 'node-ep1-scene2-branchA',
        stateDelta: {
          factionReputation: { 'Neon_Syndicate': -10, 'Arasaka_Zaibatsu': -50 },
          inventoryChanges: ['+Decrypted Project Chimera Files'],
          secretsUnlocked: ['The Director is an AI clone'],
          statusChanges: { 'Jack_Vance': 'Trace protocol active on Jack neural link' }
        }
      },
      {
        id: 'choice-1b',
        choiceText: 'Sell the locked Shard to the Neon Syndicate for 50,000 credits and emergency medical surgery.',
        targetNodeId: 'node-ep1-scene2-branchB',
        stateDelta: {
          factionReputation: { 'Neon_Syndicate': +40, 'Metro_Police': -20 },
          inventoryChanges: ['-Stolen Data Shard', '+50,000 Credits', '+Military Chrome Arm'],
          statusChanges: { 'Jack_Vance': 'Left arm upgraded with hydraulic servo' }
        }
      }
    ]
  },
  {
    id: 'node-ep1-scene2-branchA',
    episodeNumber: 1,
    sceneTitle: 'Branch A: The AI Conspiracy Unveiled',
    summary: 'The shard triggers an emergency wipe protocol. Jack and Aria learn the horrifying truth about Project Chimera, but corporate death squads converge on their location.',
    activeState: {
      factionReputation: { 'Arasaka_Zaibatsu': -90, 'Neon_Syndicate': +10, 'Metro_Police': -30 },
      inventory: ['Decrypted Project Chimera Files', 'Silenced 9mm Flechette Pistol'],
      unlockedSecrets: ['Project Chimera coordinates', 'The Director is an AI clone'],
      characterStatus: { 'Jack_Vance': 'Hunted by Black Ops', 'Dr_Aria': 'Marked for termination' }
    },
    choices: []
  },
  {
    id: 'node-ep1-scene2-branchB',
    episodeNumber: 1,
    sceneTitle: 'Branch B: Syndicate Muscle',
    summary: 'Jack takes the Syndicate deal. A back-alley ripperdoc fits him with a heavy military cyber-arm, but the Syndicate boss demands Jack execute a hit on Dr. Aria.',
    activeState: {
      factionReputation: { 'Neon_Syndicate': +60, 'Arasaka_Zaibatsu': -40, 'Metro_Police': -20 },
      inventory: ['50,000 Credits', 'Military Chrome Arm', 'Silenced 9mm Flechette Pistol'],
      unlockedSecrets: ['Syndicate Boss holds leverage on Aria'],
      characterStatus: { 'Jack_Vance': 'Cyber-arm calibrated (+100 strength)', 'Dr_Aria': 'Hostage in Syndicate penthouse' }
    },
    choices: []
  }
];
