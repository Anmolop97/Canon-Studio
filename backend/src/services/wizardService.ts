import { WizardQuestionResponse } from '../types/canonStudio.js';
import { aiService } from './aiService.js';
import { AdaptationInput, LoreAnchor, buildAdaptationContext, formatAdaptationContext } from './adaptationMemory.js';

export interface WizardAnswers extends AdaptationInput {
  keywords?: string;
  genre?: string;
  realism?: string;
  language?: string;
  step4Answer?: string;
  step5Answer?: string;
  step6Answer?: string;
  targetLength?: string; // '400' | '800' | '1400'
}

export class WizardService {
  /**
   * Generates dynamic contextual questions for Steps 4, 5, and 6
   * Return schema: { question: string, hint: string, options: [{ label: string, sub: string }] } (6 options)
   */
  public async generateNextQuestion(
    stepNumber: number,
    answers: WizardAnswers
  ): Promise<WizardQuestionResponse> {
    const contextDescription = `
Genre: ${answers.genre || 'General Fiction'}
World Type: ${answers.realism || 'Real life with a twist'}
Language: ${answers.language || 'English'}
User Seed / Keywords: "${answers.keywords || 'An unexpected occurrence'}"
${answers.step4Answer ? `Protagonist / Lead: ${answers.step4Answer}` : ''}
${answers.step5Answer ? `Setting / Arena: ${answers.step5Answer}` : ''}
`;

    let questionCategory = 'main character';
    if (stepNumber === 5) questionCategory = 'setting and arena';
    if (stepNumber === 6) questionCategory = 'the major obstacle or shocking twist';

    const systemInstruction = `You are an expert story architect for Canon Story Studio.
Your role is to craft one compelling, ultra-tailored multiple choice question for a user creating a story in the "${answers.genre}" genre.
The question must have EXACTLY 6 distinct, imaginative options. Each option must have a concise title "label" (3-6 words) and a vivid explanation "sub" (8-15 words).
You must return strictly valid JSON matching this schema:
{
  "question": "Clear, engaging question text",
  "hint": "Short guiding sentence to help the writer decide",
  "options": [
    { "label": "Option Title", "sub": "Short evocative descriptive detail" },
    { "label": "Option Title", "sub": "Short evocative descriptive detail" },
    { "label": "Option Title", "sub": "Short evocative descriptive detail" },
    { "label": "Option Title", "sub": "Short evocative descriptive detail" },
    { "label": "Option Title", "sub": "Short evocative descriptive detail" },
    { "label": "Option Title", "sub": "Short evocative descriptive detail" }
  ]
}`;

    const prompt = `CURRENT STORY SEED CONTEXT:
${contextDescription}

Create Question Step ${stepNumber}: Focus specifically on ${questionCategory}.
Make all 6 options feel high-stakes, surprising, and distinct.
Return ONLY valid JSON.`;

    if (aiService.isConfigured()) {
      try {
        const result = await aiService.generateStructuredJSON<WizardQuestionResponse>({
          prompt,
          systemInstruction,
          temperature: 0.7
        });
        if (result && result.question && Array.isArray(result.options) && result.options.length >= 6) {
          return {
            question: result.question,
            hint: result.hint || 'Select the option that sparks your imagination most.',
            options: result.options.slice(0, 6)
          };
        }
      } catch (err) {
        console.warn('[WizardService] AI question generation fallback:', err);
      }
    }

    // High quality deterministic fallback generator
    return this.getFallbackQuestion(stepNumber, answers);
  }

  private getFallbackQuestion(stepNumber: number, answers: WizardAnswers): WizardQuestionResponse {
    const genre = (answers.genre || 'Sci-fi').toLowerCase();

    if (stepNumber === 4) {
      if (genre.includes('delulu')) {
        return {
          question: 'Who is our delightfully deluded protagonist?',
          hint: 'Every great comedy of errors begins with an unshakable, absurd conviction.',
          options: [
            { label: 'The Corporate Overthinker', sub: 'Convinced HR emails contain subliminal love confessions meant only for them' },
            { label: 'The Accidental Undercover Agent', sub: 'Believes their mundane neighborhood uncle is the head of an international crime syndicate' },
            { label: 'The Unrequited Stargazer', sub: 'Certain that every lyric on the radio is an encrypted song dedication from their crush' },
            { label: 'The Cafeteria Philosopher', sub: 'Views every spilled coffee cup as an auspicious cosmic sign destined to unite lovers' },
            { label: 'The Startup Visionary', sub: 'Pitching an app to translate cat meows into stock market trading signals' },
            { label: 'The Retro Romantic', sub: 'Convinced they were royalty in a past life and their boss was their treacherous court jester' }
          ]
        };
      } else if (genre.includes('horror')) {
        return {
          question: 'Who is doomed to step into the dark first?',
          hint: 'Vulnerability makes horror visceral. Choose whose eyes we see the terror through.',
          options: [
            { label: 'The Solitary Night-Shift Caretaker', sub: 'Tasked with guarding an condemned Victorian hospital during a blackout' },
            { label: 'The Skeptical Antique Restorer', sub: 'Unsealing an heirloom mirror that was purposefully bricked behind a basement wall' },
            { label: 'The Stranded Foreign Backpacker', sub: 'Lost on a foggy mountain pass where village signposts keep vanishing' },
            { label: 'The Retired Radio Operator', sub: 'Receiving Morse transmissions on a decommissioned emergency naval frequency' },
            { label: 'The Grief-Stricken Archivist', sub: 'Investigating family letters that mention an uninvited guest in every wedding photo' },
            { label: 'The Weary Highway Patrol Officer', sub: 'Responding to a repetitive 911 call from an abandoned telephone booth in the pines' }
          ]
        };
      } else {
        return {
          question: 'Who leads this unfolding story?',
          hint: 'Pick the personality whose decisions will drive the narrative forward.',
          options: [
            { label: 'The Reluctant Veteran Operative', sub: 'Carrying a cybernetic prosthetic and secrets that powerful syndicates kill for' },
            { label: 'The Brilliant Rogue Apprentice', sub: 'Discovered a forbidden manuscript that defies the established laws of reality' },
            { label: 'The Disgraced Former Investigator', sub: 'Seeking redemption through one final cold case nobody else dared touch' },
            { label: 'The Street-Smart Smuggler', sub: 'Knows every back alley and hidden canal, but trapped by an old debt' },
            { label: 'The Diplomat with Divided Loyalties', sub: 'Navigating cutthroat court politics to avert an impending civil catastrophe' },
            { label: 'The Wandering Chronicler', sub: 'Records the final words of dying stars, accompanied by a mute automaton' }
          ]
        };
      }
    }

    if (stepNumber === 5) {
      return {
        question: 'Where does the crucible of the story take place?',
        hint: 'Setting is not just a backdrop—it actively forces characters to react.',
        options: [
          { label: 'The Rain-Soaked Neon Lower City', sub: 'Where acid rain rusts cheap implants and sirens echo through flooded subway tunnels' },
          { label: 'A Cloistered High-Altitude Observatory', sub: 'Perched on razor-sharp peaks above permanent cloud cover, cut off from civilization' },
          { label: 'A Bustling Metro Tea Stall at Midnight', sub: 'Steam rising from brass kettles while rain hammers on blue plastic awnings' },
          { label: 'An Abandoned Coastal Lighthouse', sub: 'Surrounded by jagged rocks where the tide cuts off any escape route for six hours' },
          { label: 'The Opulent Grand Winter Ballroom', sub: 'Gilded mirrors and crystal chandeliers concealing poisonous whispered conspiracies' },
          { label: 'A Drifting Derelict Deep-Space Freighter', sub: 'Emergency amber lighting pulses while the atmospheric scrubbers slowly fail' }
        ]
      };
    }

    // Step 6: Major obstacle or twist
    return {
      question: 'What unexpected complication threatens everything?',
      hint: 'The turning point that shatters expectations and tests the character.',
      options: [
        { label: 'The Trusted Ally Was the Informant', sub: 'Every step taken was anticipated because their closest confidant was compromised from day one' },
        { label: 'The MacGuffin Is a Living Organism', sub: 'What they thought was encrypted data or stolen gold is actually alive and conscious' },
        { label: 'A Sudden Atmospheric Cataclysm', sub: 'An ion storm or sudden flood destroys communications and locks everyone inside together' },
        { label: 'The Dead Return with a Warning', sub: 'A voice believed lost forever speaks through the intercom with a terrifying revelation' },
        { label: 'A Ticking Moral Dilemma', sub: 'To save the person they care for, they must condemn the entire district to darkness' },
        { label: 'The Entire Mission Was a Simulation', sub: 'The reality they fought so hard to defend has been artificial from the very start' }
      ]
    };
  }

  /**
   * Generates or streams the complete narrative story
   */
  public async generateFullStory(answers: WizardAnswers): Promise<{
    title: string;
    content: string;
    sceneContent: string;
    wordCount: number;
    readingTimeMinutes: number;
    activeLoreAnchors: LoreAnchor[];
    styleTone: string;
  }> {
    const adaptationContext = buildAdaptationContext({
      ...answers,
      idea: answers.keywords,
      characterSheet: answers.characterSheet || answers.step4Answer,
      worldLore: answers.worldLore || answers.step5Answer,
      styleTone: answers.styleTone || answers.realism
    });
    const withAdaptation = (story: { title: string; content: string; wordCount: number; readingTimeMinutes: number }) => ({
      ...story,
      sceneContent: story.content,
      activeLoreAnchors: adaptationContext.activeLoreAnchors,
      styleTone: adaptationContext.styleTone
    });
    const targetWords = parseInt(answers.targetLength || '800', 10);
    const lang = answers.language || 'English';
    const isHinglish = lang.toLowerCase().includes('hinglish');
    const isHindi = lang.toLowerCase().includes('hindi') && !isHinglish;

    let languageRule = 'Write in literary, evocative English prose.';
    if (isHinglish) {
      languageRule = 'CRITICAL REQUIREMENT: Write strictly in HINGLISH (conversational Hindi written purely in Roman English letters, e.g. "Rohan ne chai ka cup table par rakha aur bola: \'Bhai, yeh situation bilkul normal nahi lag rahi hai...\'"). Do NOT use Devanagari script.';
    } else if (isHindi) {
      languageRule = 'CRITICAL REQUIREMENT: Write in natural, evocative Hindi in standard Devanagari script.';
    }

    const maxAllowedTokens = Math.min(3000, Math.max(550, Math.round(targetWords * 1.6)));

    const systemInstruction = `You are a master storyteller for Canon Story Studio.
Write a complete, gripping, beautifully paced story based on the writer's inputs.
CRITICAL LENGTH REQUIREMENT: Target word count is EXACTLY approximately ${targetWords} words.
Do NOT write an overlong draft. Conclude and resolve the narrative completely within ~${targetWords} words (strict upper limit: ${Math.round(targetWords * 1.15)} words).

${formatAdaptationContext(adaptationContext)}

${languageRule}

FORMAT:
Start your output with a Markdown title header:
# [Story Title]

Follow immediately with the narrative prose organized into vivid, evocative paragraphs with natural dialogue and rich sensory atmosphere.
Do NOT include preamble, commentary, or meta text.`;

    const prompt = `STORY SPECIFICATION:
- Keywords & Seed: ${answers.keywords || 'An unexpected fateful encounter'}
- Genre: ${answers.genre || 'Thriller'}
- Reality Tone: ${answers.realism || 'Real life with a twist'}
- Protagonist Choice: ${answers.step4Answer || 'A determined investigator'}
- Setting / Arena: ${answers.step5Answer || 'A rain-slicked city district'}
- Twist / Obstacle: ${answers.step6Answer || 'A sudden betrayal from the shadows'}
- Target Length: ~${targetWords} words (respect this limit strictly)

Generate the full story now with its Title header.`;

    if (aiService.isConfigured()) {
      try {
        const text = await aiService.generateText(prompt, systemInstruction, maxAllowedTokens);
        if (text && text.trim().length > 100) {
          return withAdaptation(this.parseStoryOutput(text));
        }
      } catch (err) {
        console.warn('[WizardService] AI story generation failed, using rich narrative fallback:', err);
      }
    }

    return withAdaptation(this.generateFallbackStory(answers, targetWords, isHinglish, isHindi));
  }

  private parseStoryOutput(raw: string): {
    title: string;
    content: string;
    wordCount: number;
    readingTimeMinutes: number;
  } {
    let title = 'The Unwritten Echoes';
    let content = raw.trim();

    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      content = content.replace(/^#\s+.+$/m, '').trim();
    }

    const words = content.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

    return {
      title,
      content,
      wordCount: words,
      readingTimeMinutes
    };
  }

  private generateFallbackStory(
    answers: WizardAnswers,
    targetWords: number,
    isHinglish: boolean,
    isHindi: boolean
  ): {
    title: string;
    content: string;
    wordCount: number;
    readingTimeMinutes: number;
  } {
    const genre = answers.genre || 'Sci-fi';
    const character = answers.step4Answer || 'The lone operative';
    const setting = answers.step5Answer || 'The rain-soaked lower district';
    const twist = answers.step6Answer || 'An unexpected signal';

    let title = `${answers.genre || 'Chronicle'}: Shadows over Veridia`;
    let paragraphs: string[] = [];

    if (isHinglish) {
      title = `Baarish, Chai aur Ek Ajeeb Raaz`;
      paragraphs = [
        `Raat ke theek baarah baje the, aur Hill Road par baarish aisi gir rahi thi jaise badal aasmaan se toot kar gir gaye hon. Ramu Kaka ke tea stall ki neeli tarpaulin ke neeche, steam garam cutting chai se uth rahi thi. Yahan par ${character.toLowerCase()} baitha tha, aankhon mein thakan aur dimaag mein hazaaron sawaal liye.`,
        `Yeh jagah koi aam jagah nahi thi. ${setting}. Har gali ke kone mein neon boards ki roshni paani ke puddles mein jhalak rahi thi. Aas-paas ke log jaldi-jaldi apne chhatri sambhalte hue nikal rahe the, lekin ek shakhs bilkul alag khada tha—black raincoat, haath mein ek purana metallic cylinder pakde hue.`,
        `"Bhai, tumhein lagta hai yeh itna aasan hoga?" ek awaaz aayi. Awaaz Kabir ki thi, jo peeche khada plastic cup mein chai phoonk raha tha. "Jo kuch tum dhoondh rahe ho, woh kisi ko pata chal gaya toh sab khatam ho jayega."`,
        `Lekin sabse bada jhatka tab laga jab us metallic cylinder se ek halki si blue light pulse hui. ${twist}. Yeh koi aam signal nahi tha; yeh wahi frequency thi jo teen saal pehle purane communication towers se sunai deti thi.`,
        `"Chalo," usne dheere se kaha, trench coat ka collar upar karte hue. "Ab peeche mudne ka waqt nikal chuka hai. Agar sach saamne lana hai, toh iss tufaan ko paar karna hi hoga." Aur dono baarish ki andheri chhaon mein gaayab ho gaye.`
      ];
    } else if (isHindi) {
      title = `छाया और मौन का रहस्य`;
      paragraphs = [
        `रात के सन्नाटे में जब बारिश की पहली बूँदें पुरानी इमारतों की छतों पर गिरीं, तो ऐसा लगा जैसे कोई पुराना राज़ फिर से जाग उठा हो। ${setting} के बीचों-बीच, लैंपपोस्ट की पीली रोशनी में ${character.toLowerCase()} चुपचाप खड़ा था।`,
        `हवा में एक अजीब सी ठंडक थी, जैसे तूफान आने से पहले प्रकृति अपनी सांस रोक लेती है। हाथ में थमी पुरानी डायरी के पन्नों पर स्याही थोड़ी धुंधली पड़ चुकी थी, मगर लिखे हुए शब्द अभी भी चेतावनी दे रहे थे।`,
        `अचानक एक हल्की आहट सुनाई दी। कदमों की चाप, जो पानी के छींटों के साथ गूंज रही थी। ${twist} का अहसास होते ही रोंगटे खड़े हो गए। जो सच सालों से पत्थरों के नीचे दबा था, वह अब सामने आने को बेताब था।`,
        `"अब रुकना मुमकिन नहीं है," उसने खुद से कहा और अंधेरी गली की तरफ कदम बढ़ा दिए, जहाँ किस्मत उसका इंतज़ार कर रही थी।`
      ];
    } else {
      title = `Echoes Across the Threshold`;
      paragraphs = [
        `The relentless rain had washed the grit into the gutters of ${setting.toLowerCase()}, leaving the cobblestones slick as polished obsidian. Commander Jack Vance pulled his trench coat tighter across his shoulder, his prosthetic arm clicking softly as temperature fluctuations caused the hydraulic seals to contract.`,
        `He had spent four weeks tracking the faint broadcast signature across three sub-sectors. The character profile pointed to ${character.toLowerCase()}, a figure whispered about in the lower markets as either a ghost or the only soul who possessed the uncorrupted cipher.`,
        `"You shouldn't have come alone," a raspy voice murmured from the alcove behind him. A silhouette emerged from the steam vent, fingers resting poised on a compact thermal discharger. "The patrol sweepers passed through ten minutes ago. If they spot that scanner of yours, neither of us makes it to sunrise."`,
        `Vance didn't flinch. "I came because of what happened at the northern station. You knew what was inside the prototype." He leveled his gaze, the neon amber reflection from a noodle kiosk reflecting across his tired eyes.`,
        `Then came the complication they had both prayed against: ${twist.toLowerCase()}. A high-pitched resonance hummed through the concrete beneath their boots, followed by the blinding sweep of an aerial searchlight arcing down from the overcast clouds.`,
        `"They found us," Vance said, his hand dropping to his side holster with calm, rehearsed precision. "Take the lower duct. I'll buy forty seconds. Make sure that cipher reaches the broadcast mast."`,
        `Without another word, they split into the labyrinth of dark steel and falling water, knowing that whatever came next would reshape the entire city.`
      ];
    }

    // Multiply paragraphs to meet target length if requested
    if (targetWords >= 1400) {
      paragraphs.push(
        `The lower conduit stretched for half a mile beneath the roaring sewer mains. Every iron pipe trembled under the hydraulic surge, vibrating at a frequency that set Jack’s prosthetic humming like a tuning fork. He navigated by touch—three steps forward, duck beneath the cold copper pipe, hand on the reinforced valve. Behind him, the sound of booted footsteps echoed in rhythmic discipline.`,
        `He reached the central maintenance vault where the ancient emergency relays slumbered. Decades of calcium buildup clung to the bronze conduits like frozen stalactites. Drawing a breath of damp, metallic air, he connected the fiber interface. The terminal screen flickered to life, bathing the subterranean chamber in emerald phosphorescence.`,
        `Data cascaded across the visor in relentless columns. It was not merely an inventory log or an operational ledger—it was the recorded truth of the entire sector's founding. Vance read the lines with widening eyes. "They never meant for anyone to leave," he whispered into the dark. "The quarantine wasn't built to keep the disease out. It was built to keep us in."`,
        `Footsteps stopped just outside the bulkhead door. A heavy hydraulic pry-bar slammed against the locking pins. Jack set the transfer timer to three minutes, drew his flechette sidearm with his good hand, and turned to face the doorway with grim, unshakable resolution.`
      );
    }

    const fullContent = paragraphs.join('\n\n');
    const words = fullContent.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

    return {
      title,
      content: fullContent,
      wordCount: words,
      readingTimeMinutes
    };
  }
}

export const wizardService = new WizardService();
