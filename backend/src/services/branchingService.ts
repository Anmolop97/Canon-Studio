import crypto from 'crypto';
import { BranchScene, BranchOption } from '../types/canonStudio.js';
import { aiService } from './aiService.js';

export interface BranchingSetup {
  idea?: string;
  genre?: string;
  realism?: string;
  language?: string;
  maxDecisions: number; // 3, 5, or 8
}

export interface NextSceneRequest {
  storySoFar: string[];
  chosenOptionText: string;
  decisionIndex: number; // current decision count (1-based)
  maxDecisions: number; // 3, 5, or 8
  genre?: string;
  language?: string;
  historyChoices?: string[];
}

export class BranchingService {
  /**
   * Generates Scene 1 (110-170 words) + 3 distinct choices (bold, careful, unexpected)
   */
  public async startStory(setup: BranchingSetup): Promise<BranchScene> {
    const lang = setup.language || 'English';
    const isHinglish = lang.toLowerCase().includes('hinglish');
    const isHindi = lang.toLowerCase().includes('hindi') && !isHinglish;

    let languageRule = 'Write the narrative in evocative, literary English.';
    if (isHinglish) {
      languageRule = 'CRITICAL: Write strictly in HINGLISH (Hindi written purely in Roman English letters, e.g. "Jack ne commlink uthaya aur bola: \'Humein abhi nikalna hoga.\'"). No Devanagari.';
    } else if (isHindi) {
      languageRule = 'CRITICAL: Write in evocative Hindi in Devanagari script.';
    }

    const systemInstruction = `You are the lead branching narrative designer for Canon Story Studio.
Generate Scene 1 of an interactive story.
Word count constraint: EXACTLY between 110 and 170 words.
${languageRule}

Then generate EXACTLY 3 distinct choices that branch in different narrative directions:
- Option 1 (bold): high-risk, aggressive, or audacious action
- Option 2 (careful): cautious, tactical, investigative, or defensive action
- Option 3 (unexpected): unorthodox, mysterious, eccentric, or counter-intuitive action

Return strictly valid JSON matching this schema:
{
  "content": "Narrative prose of scene 1 (110 to 170 words)",
  "options": [
    { "text": "Action description for bold choice", "type": "bold" },
    { "text": "Action description for careful choice", "type": "careful" },
    { "text": "Action description for unexpected choice", "type": "unexpected" }
  ]
}`;

    const prompt = `STORY PREMISE:
- Core Idea: ${setup.idea || 'A stranded courier discovers their cargo is pulsing with an organic heartbeat.'}
- Genre: ${setup.genre || 'Sci-fi'}
- World Realism: ${setup.realism || 'Real life with a twist'}
- Total Decisions before ending: ${setup.maxDecisions}

Craft Scene 1 now with its 3 choices. Return ONLY the JSON.`;

    if (aiService.isConfigured()) {
      try {
        const result = await aiService.generateStructuredJSON<{
          content: string;
          options: Array<{ text: string; type: 'bold' | 'careful' | 'unexpected' }>;
        }>({
          prompt,
          systemInstruction,
          temperature: 0.7
        });

        if (result && result.content && Array.isArray(result.options) && result.options.length === 3) {
          return {
            id: `scene-1`,
            sceneNumber: 1,
            content: result.content.trim(),
            isEnding: false,
            options: result.options.map((opt, i) => ({
              id: `opt-1-${i + 1}`,
              text: opt.text,
              type: opt.type,
              explored: false
            }))
          };
        }
      } catch (err) {
        console.warn('[BranchingService] Gemini startStory fallback:', err);
      }
    }

    // High quality deterministic fallback scene
    return this.getFallbackStartScene(setup, isHinglish, isHindi);
  }

  /**
   * Generates the next scene based on the chosen path
   */
  public async nextScene(req: NextSceneRequest): Promise<BranchScene> {
    const isFinal = req.decisionIndex >= req.maxDecisions;
    const lang = req.language || 'English';
    const isHinglish = lang.toLowerCase().includes('hinglish');
    const isHindi = lang.toLowerCase().includes('hindi') && !isHinglish;

    let languageRule = 'Write the narrative in evocative, literary English.';
    if (isHinglish) {
      languageRule = 'CRITICAL: Write strictly in HINGLISH (Hindi written purely in Roman English letters). No Devanagari.';
    } else if (isHindi) {
      languageRule = 'CRITICAL: Write in evocative Hindi in Devanagari script.';
    }

    const previousStoryText = req.storySoFar.join('\n\n---\n\n');

    if (isFinal) {
      // Generate Ending Scene (110-170 words, reflects past choices, options: [])
      const systemInstruction = `You are the lead branching narrative designer for Canon Story Studio.
Write the CLIMACTIC FINAL SCENE (ending) of the interactive story.
Word count constraint: EXACTLY between 110 and 170 words.
${languageRule}

Reflect the writer's cumulative choices throughout this journey. Deliver a satisfying, memorable resolution.
Return strictly valid JSON matching this schema:
{
  "content": "Climactic resolution prose (110 to 170 words)"
}`;

      const prompt = `STORY SO FAR:
${previousStoryText}

PLAYER'S FINAL DECISIVE ACTION:
"${req.chosenOptionText}"

Write the final scene now. Return ONLY the JSON.`;

      if (aiService.isConfigured()) {
        try {
          const result = await aiService.generateStructuredJSON<{ content: string }>({
            prompt,
            systemInstruction,
            temperature: 0.6
          });
          if (result && result.content) {
            return {
              id: `scene-${req.decisionIndex + 1}`,
              sceneNumber: req.decisionIndex + 1,
              content: result.content.trim(),
              isEnding: true,
              options: [],
              choiceTaken: req.chosenOptionText
            };
          }
        } catch (err) {
          console.warn('[BranchingService] Gemini nextScene ending fallback:', err);
        }
      }

      return this.getFallbackEndingScene(req, isHinglish, isHindi);
    }

    // Not final: Generate next scene (110-170 words) + 3 choices
    const systemInstruction = `You are the lead branching narrative designer for Canon Story Studio.
Generate the next scene following the player's chosen action.
Word count constraint: EXACTLY between 110 and 170 words.
${languageRule}

Then generate EXACTLY 3 distinct choices:
- Option 1 (bold): high-risk, aggressive, or audacious action
- Option 2 (careful): cautious, tactical, investigative, or defensive action
- Option 3 (unexpected): unorthodox, mysterious, eccentric, or counter-intuitive action

Return strictly valid JSON matching this schema:
{
  "content": "Narrative prose of this scene (110 to 170 words)",
  "options": [
    { "text": "Action description for bold choice", "type": "bold" },
    { "text": "Action description for careful choice", "type": "careful" },
    { "text": "Action description for unexpected choice", "type": "unexpected" }
  ]
}`;

    const prompt = `STORY SO FAR:
${previousStoryText}

PLAYER'S CHOSEN ACTION:
"${req.chosenOptionText}"

Current Decision: ${req.decisionIndex} of ${req.maxDecisions}.
Write the consequences and next scene now with 3 new choices. Return ONLY the JSON.`;

    if (aiService.isConfigured()) {
      try {
        const result = await aiService.generateStructuredJSON<{
          content: string;
          options: Array<{ text: string; type: 'bold' | 'careful' | 'unexpected' }>;
        }>({
          prompt,
          systemInstruction,
          temperature: 0.7
        });

        if (result && result.content && Array.isArray(result.options) && result.options.length === 3) {
          return {
            id: `scene-${req.decisionIndex + 1}-${crypto.randomUUID()}`,
            sceneNumber: req.decisionIndex + 1,
            content: result.content.trim(),
            isEnding: false,
            options: result.options.map((opt, i) => ({
              id: `opt-${req.decisionIndex + 1}-${i + 1}`,
              text: opt.text,
              type: opt.type,
              explored: false
            })),
            choiceTaken: req.chosenOptionText
          };
        }
      } catch (err) {
        console.warn('[BranchingService] Gemini nextScene intermediate fallback:', err);
      }
    }

    return this.getFallbackIntermediateScene(req, isHinglish, isHindi);
  }

  private getFallbackStartScene(setup: BranchingSetup, isHinglish: boolean, isHindi: boolean): BranchScene {
    if (isHinglish) {
      return {
        id: 'scene-1',
        sceneNumber: 1,
        content: `Sub-level 3 ki andheri galiyon mein acid rain tez ho chuki thi. Commander Jack Vance ne apna trench coat kaske lapeta. Uske baayein haath ka uncalibrated prosthetic thand ki wajah se halki magnetic humming kar raha tha. Saamne neon light mein Ramu ki chai dukan par ek sealed metal cylinder rakha tha, jiske upar Syndicate ka crimson seal laga hua tha. Cylinder se ek halki si blue pulse nikal rahi thi jaise andar koi zinda cheez saans le rahi ho. Door se police hovercraft ke sirens ki goonj aane lagi. Jack ke paas sirf do minute the.`,
        isEnding: false,
        options: [
          { id: 'opt-1-1', text: 'Cylinder ko zabardasti khol kar dekho ki andar kya chhipa hai.', type: 'bold', explored: false },
          { id: 'opt-1-2', text: 'Cylinder ko coat mein chhipa kar turant sewer tunnel ki taraf bhaago.', type: 'careful', explored: false },
          { id: 'opt-1-3', text: 'Cylinder par lage frequency transmitter se police radio ko signal bhej do.', type: 'unexpected', explored: false }
        ]
      };
    }

    if (isHindi) {
      return {
        id: 'scene-1',
        sceneNumber: 1,
        content: `à¤¸à¤¬-à¤²à¥‡à¤µà¤² 3 à¤•à¥€ à¤¸à¤‚à¤•à¤°à¥€ à¤—à¤²à¤¿à¤¯à¥‹à¤‚ à¤®à¥‡à¤‚ à¤¤à¥‡à¤œà¤¾à¤¬à¥€ à¤¬à¤¾à¤°à¤¿à¤¶ à¤•à¥€ à¤¬à¥‚à¤‚à¤¦à¥‡à¤‚ à¤ªà¥à¤²à¤¾à¤¸à¥à¤Ÿà¤¿à¤• à¤•à¥€ à¤›à¤¤à¥‹à¤‚ à¤ªà¤° à¤…à¤‚à¤—à¤¾à¤°à¥‹à¤‚ à¤•à¥€ à¤¤à¤°à¤¹ à¤Ÿà¤ªà¤• à¤°à¤¹à¥€ à¤¥à¥€à¤‚à¥¤ à¤œà¥ˆà¤• à¤¨à¥‡ à¤…à¤ªà¤¨à¥‡ à¤¬à¤¾à¤à¤‚ à¤•à¥ƒà¤¤à¥à¤°à¤¿à¤® à¤¹à¤¾à¤¥ à¤•à¥‹ à¤•à¥‹à¤Ÿ à¤•à¥‡ à¤­à¥€à¤¤à¤° à¤¸à¤®à¥‡à¤Ÿ à¤²à¤¿à¤¯à¤¾, à¤œà¤¿à¤¸à¤•à¥€ à¤¹à¤¾à¤‡à¤¡à¥à¤°à¥‹à¤²à¤¿à¤• à¤¸à¥€à¤² à¤ à¤‚à¤¡ à¤®à¥‡à¤‚ à¤§à¥€à¤®à¥€ à¤¸à¥€à¤Ÿà¥€ à¤¬à¤œà¤¾ à¤°à¤¹à¥€ à¤¥à¥€à¥¤ à¤¸à¤¾à¤®à¤¨à¥‡ à¤§à¤¾à¤¤à¥ à¤•à¥€ à¤®à¥‡à¤œ à¤ªà¤° à¤à¤• à¤¸à¥€à¤² à¤¬à¤‚à¤¦ à¤¸à¤¿à¤²à¥‡à¤‚à¤¡à¤° à¤°à¤–à¤¾ à¤¥à¤¾, à¤œà¤¿à¤¸ à¤ªà¤° à¤¸à¤¿à¤‚à¤¡à¤¿à¤•à¥‡à¤Ÿ à¤•à¤¾ à¤²à¤¾à¤² à¤ªà¥à¤°à¤¤à¥€à¤• à¤šà¤¿à¤¨à¥à¤¹ à¤šà¤®à¤• à¤°à¤¹à¤¾ à¤¥à¤¾à¥¤ à¤‰à¤¸ à¤¬à¤•à¥à¤¸à¥‡ à¤¸à¥‡ à¤¨à¥€à¤²à¥€ à¤°à¥‹à¤¶à¤¨à¥€ à¤•à¥€ à¤à¤• à¤§à¥€à¤®à¥€ à¤§à¤¡à¤¼à¤•à¤¨ à¤¨à¤¿à¤•à¤² à¤°à¤¹à¥€ à¤¥à¥€, à¤œà¥ˆà¤¸à¥‡ à¤•à¥‹à¤ˆ à¤œà¥€à¤µ à¤¸à¤¾à¤‚à¤¸ à¤²à¥‡ à¤°à¤¹à¤¾ à¤¹à¥‹à¥¤ à¤¦à¥‚à¤° à¤¸à¥‡ à¤¸à¤¾à¤¯à¤°à¤¨ à¤•à¥€ à¤†à¤µà¤¾à¤œà¥‡à¤‚ à¤¤à¥‡à¤œ à¤¹à¥‹à¤¨à¥‡ à¤²à¤—à¥€à¤‚à¥¤ à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤²à¥‡à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¥‡à¤µà¤² à¤¦à¥‹ à¤®à¤¿à¤¨à¤Ÿ à¤¬à¤šà¥‡ à¤¥à¥‡à¥¤`,
        isEnding: false,
        options: [
          { id: 'opt-1-1', text: 'à¤¸à¤¿à¤²à¥‡à¤‚à¤¡à¤° à¤•à¥‹ à¤¤à¥à¤°à¤‚à¤¤ à¤¬à¤²à¤ªà¥‚à¤°à¥à¤µà¤• à¤–à¥‹à¤²à¤•à¤° à¤¸à¤šà¥à¤šà¤¾à¤ˆ à¤•à¤¾ à¤ªà¤¤à¤¾ à¤²à¤—à¤¾à¤à¤‚à¥¤', type: 'bold', explored: false },
          { id: 'opt-1-2', text: 'à¤¸à¤¿à¤²à¥‡à¤‚à¤¡à¤° à¤•à¥‹ à¤›à¤¿à¤ªà¤¾à¤•à¤° à¤—à¥à¤ªà¥à¤¤ à¤¨à¤¾à¤²à¥‡ à¤•à¥‡ à¤°à¤¾à¤¸à¥à¤¤à¥‡ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤¨à¤¿à¤•à¤² à¤œà¤¾à¤à¤‚à¥¤', type: 'careful', explored: false },
          { id: 'opt-1-3', text: 'à¤¸à¤¿à¤²à¥‡à¤‚à¤¡à¤° à¤•à¥‡ à¤Ÿà¥à¤°à¤¾à¤‚à¤¸à¤®à¥€à¤Ÿà¤° à¤¸à¥‡ à¤¸à¥€à¤§à¥‡ à¤ªà¥à¤²à¤¿à¤¸ à¤—à¤¶à¥à¤¤à¥€ à¤¦à¤² à¤•à¥‹ à¤¸à¤‚à¤•à¥‡à¤¤ à¤­à¥‡à¤œà¥‡à¤‚à¥¤', type: 'unexpected', explored: false }
        ]
      };
    }

    return {
      id: 'scene-1',
      sceneNumber: 1,
      content: `The corrosive drizzle in Lower Veridia pattered relentlessly against the corrugated awnings of Sub-level 3. Commander Jack Vance adjusted the collar of his grease-stained trench coat, cradling his uncalibrated industrial prosthetic left arm against the biting wind. On the counter of a closed noodle clinic sat a cold plasteel cylinder, marked with the crimson seal of the Neon Syndicate. A faint sapphire pulse emanated from its seams, beating with the slow, unmistakable cadence of a living heart. In the distance, aerial patrol sirens sliced through the thunder of an approaching Ion Storm. Time was already running out.`,
      isEnding: false,
      options: [
        { id: 'opt-1-1', text: 'Force the pressurized seal open with your combat knife immediately.', type: 'bold', explored: false },
        { id: 'opt-1-2', text: 'Conceal the cylinder beneath your coat and slip into the drainage conduits.', type: 'careful', explored: false },
        { id: 'opt-1-3', text: 'Broadcast the cylinderâ€™s harmonic pulse across the open police channel.', type: 'unexpected', explored: false }
      ]
    };
  }

  private getFallbackIntermediateScene(req: NextSceneRequest, isHinglish: boolean, isHindi: boolean): BranchScene {
    const sceneNum = req.decisionIndex + 1;
    if (isHinglish) {
      return {
        id: `scene-${sceneNum}-${crypto.randomUUID()}`,
        sceneNumber: sceneNum,
        content: `Aapne chuna: "${req.chosenOptionText}". Yeh kadam uthate hi gali ke andhere se ek naya mod saamne aaya. Ek masked drone neeche utra aur uski infrared beam seedhe aapke chehre par aakar tiki. Lekin drone ne fire karne ke bajaye ek encrypted audio snippet play kiya: "Aria abhi zinda hai, lekin sub-station 4 mein locked hai." Ion Storm ki wajah se wireless channels crackle karne lage. Ab aapko faisla lena hai ki is warning par bharosa karein ya aage ka rasta khud banayein.`,
        isEnding: false,
        options: [
          { id: `opt-${sceneNum}-1`, text: 'Sub-station 4 ke main gate ko blow up karke seedhe andar ghus jao.', type: 'bold', explored: false },
          { id: `opt-${sceneNum}-2`, text: 'Ventilation shaft ke raste chupke se power grid ko cut-off karo.', type: 'careful', explored: false },
          { id: `opt-${sceneNum}-3`, text: 'Drone ki memory chip hack karke decoy signal syndicate HQ bhejo.', type: 'unexpected', explored: false }
        ],
        choiceTaken: req.chosenOptionText
      };
    }

    return {
      id: `scene-${sceneNum}-${crypto.randomUUID()}`,
      sceneNumber: sceneNum,
      content: `Responding to your actionâ€”"${req.chosenOptionText}"â€”the immediate environment fractured into heightened tension. A surveillance drone dropped through the rain clouds, its targeting laser sweeping across your chest before abruptly cutting to amber diagnostic mode. A synthesized voice crackled through the interference: "The beacon is active. Aria is trapped inside Sub-station 4, but the lockdown protocol initiates in three minutes." The Ion Storm surged overhead, crackling against the rusted girders and leaving only seconds to maneuver.`,
      isEnding: false,
      options: [
        { id: `opt-${sceneNum}-1`, text: 'Breach the fortified security gates using an overloaded thermal charge.', type: 'bold', explored: false },
        { id: `opt-${sceneNum}-2`, text: 'Infiltrate the drainage vent system to bypass automated turrets silently.', type: 'careful', explored: false },
        { id: `opt-${sceneNum}-3`, text: 'Redirect the substationâ€™s power transformer to trigger a sector-wide blackout.', type: 'unexpected', explored: false }
      ],
      choiceTaken: req.chosenOptionText
    };
  }

  private getFallbackEndingScene(req: NextSceneRequest, isHinglish: boolean, isHindi: boolean): BranchScene {
    const sceneNum = req.decisionIndex + 1;
    if (isHinglish) {
      return {
        id: `scene-ending`,
        sceneNumber: sceneNum,
        content: `Aakhiri faisla liya gaya: "${req.chosenOptionText}". Tufaan ki aakhiri boondon ke beech, Veridia ke aasmaan par saalon baad pehli baar subah ki dhoop chamki. Prototype safe tha aur sacchayi poore shehar ke communication screens par broadcast ho chuki thi. Jack ne apna prosthetic arm saaf kiya aur chai ki chuski li. Jung abhi khatam nahi hui thi, lekin andhere ne apna kabza chhod diya tha. Aapka safar yahan mukammal hota hai.`,
        isEnding: true,
        options: [],
        choiceTaken: req.chosenOptionText
      };
    }

    return {
      id: `scene-ending`,
      sceneNumber: sceneNum,
      content: `With the decisive resolution of "${req.chosenOptionText}", the cascading chain of consequences reached its final equilibrium. As the Ion Storm broke above Lower Veridia, the prototypeâ€™s atmospheric scrubbers ignited, bathing the drowned alleys in crystalline dawn light for the first time in three decades. Aria secured the verified broadcast records while Jack holstered his weapon, the threat of syndicate retaliation broken. Through bold tactics and unyielding resolve, the city had been granted a second chance. Your journey ends here.`,
      isEnding: true,
      options: [],
      choiceTaken: req.chosenOptionText
    };
  }
}

export const branchingService = new BranchingService();

