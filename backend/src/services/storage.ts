import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'url';
import {
  User,
  Draft,
  Book,
  LikeRecord,
  RatingRecord,
  BookCardData,
} from '../types/canonStudio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DatabaseSchema {
  users: User[];
  userPasswords: Record<string, string>; // userId -> password hash
  drafts: Draft[];
  books: Book[];
  likes: LikeRecord[];
  ratings: RatingRecord[];
}

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PBKDF2_ITERATIONS = 220_000;
const MAX_USERS = 10_000;
const MAX_DRAFTS_PER_USER = 50;
const MAX_DRAFT_BYTES = 1_000_000;
const MAX_USER_DRAFT_BYTES = 10_000_000;

// Pre-seeded initial data
const SEED_USERS: User[] = [
  {
    id: 'user-anya',
    email: 'anya@canonstory.studio',
    displayName: 'Anya Sharma',
    createdAt: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 'user-dev',
    email: 'dev@canonstory.studio',
    displayName: 'Devraj Sen',
    createdAt: '2026-09-05T12:00:00.000Z'
  },
  {
    id: 'user-guest',
    email: 'guest@canonstory.studio',
    displayName: 'Guest Writer',
    createdAt: '2026-10-01T08:00:00.000Z'
  },
  {
    id: 'user-anand',
    email: 'anand@canonstory.studio',
    displayName: 'Anand',
    createdAt: '2026-11-11T00:00:00.000Z'
  },
  {
    id: 'user-anmol',
    email: 'anmol@canonstory.studio',
    displayName: 'Anmol',
    createdAt: '2026-11-11T00:00:00.000Z'
  }
];

const SEED_BOOKS: Book[] = [
  {
    id: 'book-shadow-chronicles',
    draftId: 'draft-shadow',
    authorId: 'user-anya',
    authorName: 'Anya Sharma',
    title: 'The Rain of Lower Veridia',
    genre: 'Sci-fi',
    blurb: 'In the submerged neon undercity, augmentations rust and memories are contraband. Jack Vance races against an atmospheric Ion Storm.',
    episodes: [
      {
        id: 'ep-sc-1',
        order: 1,
        title: 'Episode 1: Acid on Carbon',
        content: `The corrosive acid rain in Lower Veridia began at twilight, pattering against the corrugated plasteel awnings like shrapnel. Commander Jack Vance pulled his threadbare trench coat tight over his left shoulder, feeling the cold weight of his uncalibrated industrial prosthetic.

Across the waterlogged alley, the neon glow of Dr. Aria Chen’s synth-noodle clinic flickered. Jack stepped into the doorway, water dripping from his jaw.

"You're late, Vance," Aria murmured without glancing up from her soldering iron. A cyber-retina glowed cobalt in her right eye. "The Syndicate intercepted two encrypted packets from Sub-level 3. They know about the Chimera prototype."

"They know what I let them know," Jack replied, resting his flechette pistol on the metal counter. "Can you decrypt the drive before the Ion Storm hits the upper grid?"

Aria looked up, meeting his gaze. "Only if you swear you haven't activated the beacon. If that signal pulses, Veridia drowns in corporate sweepers."`,
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z'
      },
      {
        id: 'ep-sc-2',
        order: 2,
        title: 'Episode 2: The Silent Frequency',
        content: `The hum of the Ion Storm deepened into a bone-rattling vibration. Outside, the streetlights sputtered out one by one, plunging the lower canals into greasy darkness.

Jack leaned against the reinforced doorframe, keeping his single operable hand on his holster. Aria worked in silence, fingers dancing across the ceramic interface of the neural decryptor.

"The encryption has an organic signature," Aria whispered, her breath misting in the cooling clinic. "It's not corporate code. It's biological RNA sequencing."

Suddenly, the clinic's glass shuddered. A heavy knock echoed through the plasteel. Three knocks, followed by the scrape of tungsten claws against the lock.

"They didn't wait for the storm to clear," Jack said, his voice flat and steady. "Step into the refrigeration shaft. I'll buy four minutes."`,
        createdAt: '2026-10-05T14:30:00.000Z',
        updatedAt: '2026-10-05T14:30:00.000Z'
      },
      {
        id: 'ep-sc-3',
        order: 3,
        title: 'Episode 3: The Chimera Core',
        content: `The door gave way with an ear-splitting shriek of sheared metal. Two heavy-armored Syndicate enforcers spilled through the breach, their thermal goggles flaring crimson in the gloom.

Jack didn't hesitate. He swung the reinforced counter into their path, firing three flechette rounds into the lead enforcer's hydraulic knee joint. Sparks sprayed across the wet floor tiles.

"Chen! The drive!" Jack bellowed, ducking as a plasma beam melted the shelving above his skull.

Aria burst from the side console, holding a glowing amber sphere no larger than a bird's egg. "It's not a weapon, Jack! It's an atmospheric scrub engine. It cleans the sky!"

Jack grabbed her collar, hauling her toward the drainage tunnel. "Then let's make sure we live long enough to breathe it."`,
        createdAt: '2026-10-09T18:00:00.000Z',
        updatedAt: '2026-10-09T18:00:00.000Z'
      }
    ],
    publishedAt: '2026-10-09T19:00:00.000Z',
    updatedAt: '2026-10-09T19:00:00.000Z'
  },
  {
    id: 'book-delulu-monsoon',
    draftId: 'draft-delulu',
    authorId: 'user-dev',
    authorName: 'Devraj Sen',
    title: 'Monsoon Chai and Grand Delusions',
    genre: 'Delulu',
    blurb: 'Rohan is 100% convinced the cute girl at the Bandra tea stall is an undercover spy sending him coded messages through biscuit crumbs.',
    episodes: [
      {
        id: 'ep-dm-1',
        order: 1,
        title: 'Episode 1: The Parle-G Cipher',
        content: `It was pouring over Hill Road. Water cascaded from the blue tarpaulin of Ramu Kaka’s tea stall, and there she sat—trench coat, sunglasses on a rainy morning, sipping cutting chai with military precision.

Rohan watched her from two stools away. Her biscuit broke into exactly three triangular pieces. 

"Three pieces," Rohan muttered to his friend Kabir under his breath. "Did you see that? Triangle equals Delta. Delta means clandestine rendezvous at Marine Drive."

"Bhai, she just dropped her biscuit because it was soggy," Kabir sighed, massaging his temples. "You have watched four espionage thrillers in two days and your brain is melted cheese."

"Watch her hands," Rohan insisted. She tapped her glass twice against the wooden bench. "Morse code. Double tap. Signal confirmed. She needs extraction."`,
        createdAt: '2026-10-12T11:00:00.000Z',
        updatedAt: '2026-10-12T11:00:00.000Z'
      },
      {
        id: 'ep-dm-2',
        order: 2,
        title: 'Episode 2: Operation Bun Maska',
        content: `By 4 PM the rain had slackened into a humid mist. Rohan stood outside the vintage bakery across the street, pretending to examine an obsolete pocket watch he bought for three hundred rupees.

The mystery operative entered the bakery. Rohan slipped in right behind her, adjusting his imaginary earpiece.

"Ek bun maska aur cold coffee, please," she said to the cashier.

Rohan stepped up beside her with suave gravity. "The eagle flies south when the butter is salted," he whispered knowingly.

She turned slowly, lower lip twitching. "Excuse me? Are you talking to me?"

"Code phrase unacknowledged," Rohan noted mentally. "She is deep undercover. Testing my resolve." He nodded briskly. "Understood, Agent. Your cover is safe with me."`,
        createdAt: '2026-10-14T15:00:00.000Z',
        updatedAt: '2026-10-14T15:00:00.000Z'
      }
    ],
    publishedAt: '2026-10-14T16:00:00.000Z',
    updatedAt: '2026-10-14T16:00:00.000Z'
  },
  {
    id: 'book-haunting-whispers',
    draftId: 'draft-horror',
    authorId: 'user-anya',
    authorName: 'Anya Sharma',
    title: 'The Bell of Kilmarnock',
    genre: 'Horror',
    blurb: 'A 19th-century coastal lighthouse bell tolls every midnight, even though the clapper was removed eighty years ago.',
    episodes: [
      {
        id: 'ep-hw-1',
        order: 1,
        title: 'Episode 1: The Sound of Iron',
        content: `The fog rolled in from the North Atlantic like wet wool, choking the jagged cliffs of Kilmarnock Head. Callum had accepted the lighthouse keeper post because nobody else would take it for three times the wage.

On his first night, the silence was shattered at exactly twelve o’clock.

BONG.

A resonant, bronze clang vibrated through the granite floorboards. Callum dropped his pen, ink splashing across the maritime log. He sprinted up the spiral stairs, heart pounding against his ribs.

In the belfry above the lantern room, the iron bell hung hollow and empty. The iron clapper sat sealed in a glass museum case six feet away. Yet the bell was swaying, sending heavy shockwaves out into the dark ocean.

And beneath the sound of the metal, someone was breathing inside the bell.`,
        createdAt: '2026-10-18T20:00:00.000Z',
        updatedAt: '2026-10-18T20:00:00.000Z'
      }
    ],
    publishedAt: '2026-10-18T21:00:00.000Z',
    updatedAt: '2026-10-18T21:00:00.000Z'
  },
  {
    id: 'book-eternal-echoes',
    draftId: 'draft-fantasy',
    authorId: 'user-dev',
    authorName: 'Devraj Sen',
    title: 'The Glass Alchemist of Oakhaven',
    genre: 'Fantasy',
    blurb: 'In a city where sound can be crystallized into jewels, a rogue artisan accidentally captures the final word spoken by the sleeping gods.',
    episodes: [
      {
        id: 'ep-ee-1',
        order: 1,
        title: 'Episode 1: Singing Silica',
        content: `Mira spun the blowpipe until the molten quartz turned cherry red against the forge fire. With careful breath, she whispered a forgotten song of water and stone into the pipe stem.

The glass bulb expanded, glowing iridescent violet. As it cooled in the salt bath, the melody locked inside the crystal matrix, chiming softly whenever moonlight touched the facets.

Sound jewels were the aristocracy’s greatest obsession. A lullaby in sapphire for sleepless princes; an insult in obsidian for bitter duels.

Then came the tremor from the catacombs beneath Oakhaven. A sound like thunder breaking through an underground lake reverberated through the stones. Mira raised an empty crystal crucible instinctively.

The crystal drank the shockwave. It turned an unearthly, blinding gold. Inside the glass, a voice spoke in a tongue that made the mortar between the stone walls crumble to powder.`,
        createdAt: '2026-10-22T09:00:00.000Z',
        updatedAt: '2026-10-22T09:00:00.000Z'
      }
    ],
    publishedAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z'
  }
];

const SEED_LIKES: LikeRecord[] = [
  { id: 'like-1', bookId: 'book-shadow-chronicles', userId: 'user-dev', createdAt: '2026-10-10T10:00:00.000Z' },
  { id: 'like-2', bookId: 'book-shadow-chronicles', userId: 'user-guest', createdAt: '2026-10-11T12:00:00.000Z' },
  { id: 'like-3', bookId: 'book-delulu-monsoon', userId: 'user-anya', createdAt: '2026-10-15T09:00:00.000Z' },
  { id: 'like-4', bookId: 'book-delulu-monsoon', userId: 'user-guest', createdAt: '2026-10-16T14:00:00.000Z' },
  { id: 'like-5', bookId: 'book-eternal-echoes', userId: 'user-anya', createdAt: '2026-10-23T11:00:00.000Z' },
];

const SEED_RATINGS: RatingRecord[] = [
  { id: 'rat-1', bookId: 'book-shadow-chronicles', userId: 'user-dev', score: 5, createdAt: '2026-10-10T10:00:00.000Z', updatedAt: '2026-10-10T10:00:00.000Z' },
  { id: 'rat-2', bookId: 'book-shadow-chronicles', userId: 'user-guest', score: 5, createdAt: '2026-10-11T12:00:00.000Z', updatedAt: '2026-10-11T12:00:00.000Z' },
  { id: 'rat-3', bookId: 'book-delulu-monsoon', userId: 'user-anya', score: 4, createdAt: '2026-10-15T09:00:00.000Z', updatedAt: '2026-10-15T09:00:00.000Z' },
  { id: 'rat-4', bookId: 'book-delulu-monsoon', userId: 'user-guest', score: 5, createdAt: '2026-10-16T14:00:00.000Z', updatedAt: '2026-10-16T14:00:00.000Z' },
  { id: 'rat-5', bookId: 'book-haunting-whispers', userId: 'user-dev', score: 4, createdAt: '2026-10-19T18:00:00.000Z', updatedAt: '2026-10-19T18:00:00.000Z' },
  { id: 'rat-6', bookId: 'book-eternal-echoes', userId: 'user-anya', score: 5, createdAt: '2026-10-23T11:00:00.000Z', updatedAt: '2026-10-23T11:00:00.000Z' },
];

class StorageService {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.db = this.loadDatabase();
    this.migrateLegacyPasswords();
    this.ensureLocalDemoUsers();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  public hashPassword(password: string, salt?: string): string {
    const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, effectiveSalt, PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
    return `pbkdf2-sha512$${PBKDF2_ITERATIONS}$${effectiveSalt}$${hash}`;
  }

  private createInitialDatabase(): DatabaseSchema {
    if (process.env.NODE_ENV === 'production') {
      return { users: [], userPasswords: {}, drafts: [], books: [], likes: [], ratings: [] };
    }
    return {
      users: SEED_USERS,
      userPasswords: {
        'user-anya': this.hashPassword('anya123'),
        'user-dev': this.hashPassword('dev123'),
        'user-guest': this.hashPassword('guest123'),
        'user-anand': this.hashPassword('anandanand'),
        'user-anmol': this.hashPassword('kakashi_op_97'),
      },
      drafts: [
        {
          id: 'draft-shadow',
          userId: 'user-anya',
          title: 'The Rain of Lower Veridia',
          genre: 'Sci-fi',
          blurb: 'In the submerged neon undercity, augmentations rust and memories are contraband. Jack Vance races against an atmospheric Ion Storm.',
          episodes: SEED_BOOKS[0].episodes,
          canonFacts: [
            {
              id: 'fact-1',
              subject: 'Jack Vance',
              quote: 'feeling the cold weight of his uncalibrated industrial prosthetic',
              text: 'Jack Vance has an uncalibrated industrial prosthetic left arm and cannot wield two-handed firearms.',
              episodeNumber: 1,
              removable: true
            },
            {
              id: 'fact-2',
              subject: 'Atmospheric Physics',
              quote: 'Can you decrypt the drive before the Ion Storm hits the upper grid?',
              text: 'Ion Storms disable long-range RF/cellular wireless transmissions across Neo-Veridia.',
              episodeNumber: 1,
              removable: true
            },
            {
              id: 'fact-3',
              subject: 'Chimera Drive',
              quote: 'It is an atmospheric scrub engine. It cleans the sky!',
              text: 'The Chimera prototype is an atmospheric scrub engine designed to purify Veridia rain.',
              episodeNumber: 3,
              removable: true
            }
          ],
          voiceNotes: [
            {
              character: 'Jack Vance',
              style: 'Cynical, terse military phrasing; never apologizes or uses corporate pleasantries.'
            },
            {
              character: 'Dr. Aria Chen',
              style: 'Analytical, fast-paced technical cadence; uses biomechanical and computational terms.'
            }
          ],
          publishedBookId: 'book-shadow-chronicles',
          publishedAt: '2026-10-09T19:00:00.000Z',
          createdAt: '2026-10-02T10:00:00.000Z',
          updatedAt: '2026-10-09T19:00:00.000Z'
        }
      ],
      books: SEED_BOOKS,
      likes: SEED_LIKES,
      ratings: SEED_RATINGS
    };
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        const corruptBackupPath = path.join(DATA_DIR, `db.corrupt.${Date.now()}.json`);
        try {
          fs.copyFileSync(DB_FILE, corruptBackupPath);
        } catch (copyErr) {
          console.error('[Storage] Failed to backup corrupted db.json:', copyErr);
        }
        console.warn(`[Storage] Database corrupted! Backed up to ${corruptBackupPath}. Falling back to initial seed data.`, err);
      }
    }

    const initialDb = this.createInitialDatabase();
    this.saveDatabase(initialDb);
    return initialDb;
  }

  private migrateLegacyPasswords(): void {
    if (!this.db || !this.db.userPasswords) return;

    const KNOWN_SEEDS: Record<string, { pass: string; legacyHash: string }> = {
      'user-anya': {
        pass: 'anya123',
        legacyHash: '60dfe5e3a235a08d387d7148dbb69aace5d4db94ada3ea35f24def9473f4c47b'
      },
      'user-dev': {
        pass: 'dev123',
        legacyHash: '87274af01876341455b32d805946f272871bb42effa6604dccf28bb027afa82b'
      },
      'user-guest': {
        pass: 'guest123',
        legacyHash: '6b93ccba414ac1d0ae1e77f3fac560c748a6701ed6946735a49d463351518e16'
      }
    };

    let upgraded = false;
    for (const [userId, seedInfo] of Object.entries(KNOWN_SEEDS)) {
      const currentHash = this.db.userPasswords[userId];
      if (currentHash && !currentHash.startsWith('pbkdf2-sha512$') && !currentHash.includes(':')) {
        this.db.userPasswords[userId] = this.hashPassword(seedInfo.pass);
        upgraded = true;
      }
    }

    if (upgraded) {
      console.log('[Storage] Upgraded legacy seeded user passwords to salted PBKDF2');
      this.saveDatabase();
    }
  }

  /** Seed demo profiles for local development only; never create them in production. */
  private ensureLocalDemoUsers(): void {
    if (process.env.NODE_ENV === 'production') return;

    const demoUsers = [
      { id: 'user-anand', email: 'anand@canonstory.studio', displayName: 'Anand', password: 'anandanand' },
      { id: 'user-anmol', email: 'anmol@canonstory.studio', displayName: 'Anmol', password: 'kakashi_op_97' },
    ];
    let changed = false;

    for (const demo of demoUsers) {
      let user = this.findUserByEmail(demo.email);
      if (!user) {
        user = {
          id: demo.id,
          email: demo.email,
          displayName: demo.displayName,
          createdAt: new Date().toISOString(),
        };
        this.db.users.push(user);
        changed = true;
      }

      if (!this.db.userPasswords[user.id]) {
        this.db.userPasswords[user.id] = this.hashPassword(demo.password);
        changed = true;
      }
    }

    if (changed) this.saveDatabase();
  }

  private saveDatabase(data: DatabaseSchema = this.db): void {
    this.ensureDataDir();
    const tempFile = path.join(
      DATA_DIR,
      `.db.tmp.${process.pid}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.json`
    );

    try {
      const content = JSON.stringify(data, null, 2);
      const fd = fs.openSync(tempFile, 'w');
      try {
        fs.writeFileSync(fd, content, 'utf-8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }

      const MAX_RETRIES = 5;
      const RETRY_DELAY_MS = 30;
      let renameSuccess = false;
      let lastError: any = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          fs.renameSync(tempFile, DB_FILE);
          renameSuccess = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (
            (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES') &&
            attempt < MAX_RETRIES - 1
          ) {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, RETRY_DELAY_MS);
          } else {
            break;
          }
        }
      }

      if (!renameSuccess) {
        throw lastError;
      }
    } catch (err) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (_) {}
      console.error('[Storage] Error saving database atomically:', err);
      throw err;
    }
  }

  // --- Users & Auth ---
  public getUsers(): User[] {
    return this.db.users;
  }

  public findUserById(id: string): User | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public createUser(email: string, password: string, displayName: string): User {
    if (this.db.users.length >= MAX_USERS) throw new Error('Account limit reached.');
    let id = `user-${crypto.randomUUID()}`;
    while (this.findUserById(id)) id = `user-${crypto.randomUUID()}`;
    const user: User = {
      id,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      createdAt: new Date().toISOString()
    };
    this.db.users.push(user);
    this.db.userPasswords[id] = this.hashPassword(password);
    this.saveDatabase();
    return user;
  }

  private verifyPasswordHash(password: string, storedHash: string): boolean {
    if (!storedHash || typeof storedHash !== 'string') return false;

    if (storedHash.startsWith('pbkdf2-sha512$')) {
      const [scheme, iterationText, salt, expectedHash, extra] = storedHash.split('$');
      const iterations = Number.parseInt(iterationText || '', 10);
      if (scheme !== 'pbkdf2-sha512' || extra !== undefined || !salt || !expectedHash || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
      const candidateHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
      const candidate = Buffer.from(candidateHash, 'hex');
      const expected = Buffer.from(expectedHash, 'hex');
      return candidate.length === expected.length && candidate.length > 0 && crypto.timingSafeEqual(candidate, expected);
    }

    if (storedHash.includes(':')) {
      const parts = storedHash.split(':');
      if (parts.length !== 2) return false;
      const [salt, expectedHash] = parts;
      if (!salt || !expectedHash) return false;

      const candidateHash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
      const candBuf = Buffer.from(candidateHash, 'hex');
      const expBuf = Buffer.from(expectedHash, 'hex');

      if (candBuf.length !== expBuf.length || candBuf.length === 0) {
        return false;
      }
      return crypto.timingSafeEqual(candBuf, expBuf);
    } else {
      // Legacy unsalted SHA-256
      const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
      const candBuf = Buffer.from(legacyHash, 'hex');
      const expBuf = Buffer.from(storedHash, 'hex');

      if (candBuf.length !== expBuf.length || candBuf.length === 0) {
        return false;
      }
      return crypto.timingSafeEqual(candBuf, expBuf);
    }
  }

  public verifyPassword(firstArg: string, secondArg: string): boolean {
    // Mode 1: Called with (userId, password)
    if (this.db.userPasswords && typeof this.db.userPasswords[firstArg] === 'string') {
      const userId = firstArg;
      const password = secondArg;
      const storedHash = this.db.userPasswords[userId];
      const isValid = this.verifyPasswordHash(password, storedHash);

      if (isValid && !storedHash.startsWith('pbkdf2-sha512$')) {
        // Upgrade legacy PBKDF2 and unsalted SHA-256 hashes after successful login.
        this.db.userPasswords[userId] = this.hashPassword(password);
        this.saveDatabase();
      }
      return isValid;
    }

    // If firstArg is a known user ID without a password, return false
    if (this.db.users && this.db.users.some(u => u.id === firstArg)) {
      return false;
    }

    // Mode 2: Called with (password, storedHash)
    const password = firstArg;
    const storedHash = secondArg;
    const isValid = this.verifyPasswordHash(password, storedHash);

    if (isValid && !storedHash.startsWith('pbkdf2-sha512$') && this.db.userPasswords) {
      let upgraded = false;
      for (const [uid, hash] of Object.entries(this.db.userPasswords)) {
        if (hash === storedHash) {
          this.db.userPasswords[uid] = this.hashPassword(password);
          upgraded = true;
        }
      }
      if (upgraded) {
        this.saveDatabase();
      }
    }

    return isValid;
  }

  // --- Drafts (Private per user) ---
  public getDraftsByUser(userId: string): Draft[] {
    return this.db.drafts.filter(d => d.userId === userId);
  }

  public getDraftById(id: string): Draft | undefined {
    return this.db.drafts.find(d => d.id === id);
  }

  public createDraft(userId: string, data: Partial<Draft>): Draft {
    const now = new Date().toISOString();
    const newDraft: Draft = {
      id: `draft-${crypto.randomUUID()}`,
      userId,
      title: data.title?.trim() || 'Untitled Saga',
      genre: data.genre || 'Sci-fi',
      blurb: data.blurb || '',
      episodes: data.episodes || [
        {
          id: `ep-${crypto.randomUUID()}`,
          order: 1,
          title: 'Episode 1: The Beginning',
          content: '',
          createdAt: now,
          updatedAt: now
        }
      ],
      canonFacts: data.canonFacts || [],
      voiceNotes: data.voiceNotes || [],
      publishedBookId: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.assertDraftQuota(userId, newDraft);
    this.db.drafts.push(newDraft);
    this.saveDatabase();
    return newDraft;
  }

  public updateDraft(id: string, updates: Partial<Draft>): Draft | null {
    const index = this.db.drafts.findIndex(d => d.id === id);
    if (index === -1) return null;
    const existing = this.db.drafts[index];
    const updated: Draft = {
      ...existing,
      ...updates,
      id: existing.id,
      userId: existing.userId,
      updatedAt: new Date().toISOString()
    };
    this.assertDraftQuota(updated.userId, updated, updated.id);
    this.db.drafts[index] = updated;
    this.saveDatabase();
    return updated;
  }

  private assertDraftQuota(userId: string, candidate: Draft, replacedId?: string): void {
    const episodes = candidate.episodes;
    if (!Array.isArray(episodes) || episodes.length > 100 ||
        !Array.isArray(candidate.canonFacts) || candidate.canonFacts.length > 500 ||
        !Array.isArray(candidate.voiceNotes) || candidate.voiceNotes.length > 100) {
      throw new Error('Draft exceeds the allowed item limits.');
    }
    if (episodes.some(episode => !episode || typeof episode.title !== 'string' || typeof episode.content !== 'string')) {
      throw new Error('Draft episodes must have text titles and content.');
    }

    const serialized = JSON.stringify({
      title: candidate.title,
      genre: candidate.genre,
      blurb: candidate.blurb,
      episodes: candidate.episodes,
      canonFacts: candidate.canonFacts,
      voiceNotes: candidate.voiceNotes,
    });
    const candidateBytes = Buffer.byteLength(serialized, 'utf8');
    if (candidateBytes > MAX_DRAFT_BYTES) throw new Error('A draft cannot exceed 1 MB.');

    const otherDrafts = this.db.drafts.filter(draft => draft.userId === userId && draft.id !== replacedId);
    if (!replacedId && otherDrafts.length >= MAX_DRAFTS_PER_USER) throw new Error('Draft limit reached.');
    const existingBytes = otherDrafts.reduce((total, draft) => total + Buffer.byteLength(JSON.stringify({
      title: draft.title,
      genre: draft.genre,
      blurb: draft.blurb,
      episodes: draft.episodes,
      canonFacts: draft.canonFacts,
      voiceNotes: draft.voiceNotes,
    }), 'utf8'), 0);
    if (existingBytes + candidateBytes > MAX_USER_DRAFT_BYTES) throw new Error('Account draft storage limit reached.');
  }

  public deleteDraft(id: string): boolean {
    const initialLen = this.db.drafts.length;
    this.db.drafts = this.db.drafts.filter(d => d.id !== id);
    if (this.db.drafts.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Books (Shared) ---
  public getBooks(): Book[] {
    return this.db.books;
  }

  public getBookById(id: string): Book | undefined {
    return this.db.books.find(b => b.id === id);
  }

  public publishDraft(draft: Draft, author: User): Book {
    const now = new Date().toISOString();
    let existing = this.db.books.find(b => b.draftId === draft.id);

    if (existing) {
      existing.title = draft.title;
      existing.genre = draft.genre;
      existing.blurb = draft.blurb;
      existing.episodes = draft.episodes;
      existing.updatedAt = now;
      this.updateDraft(draft.id, { publishedBookId: existing.id, publishedAt: now });
      this.saveDatabase();
      return existing;
    }

    const newBook: Book = {
      id: `book-${crypto.randomUUID()}`,
      draftId: draft.id,
      authorId: author.id,
      authorName: author.displayName,
      title: draft.title,
      genre: draft.genre,
      blurb: draft.blurb,
      episodes: draft.episodes,
      publishedAt: now,
      updatedAt: now
    };

    this.db.books.push(newBook);
    this.updateDraft(draft.id, { publishedBookId: newBook.id, publishedAt: now });
    this.saveDatabase();
    return newBook;
  }

  public unpublishBook(bookId: string, userId: string): boolean {
    const book = this.db.books.find(b => b.id === bookId);
    if (!book) return false;
    if (book.authorId !== userId) {
      throw new Error('Forbidden: Only the author can unpublish this book');
    }

    this.db.books = this.db.books.filter(b => b.id !== bookId);
    if (book.draftId) {
      this.updateDraft(book.draftId, { publishedBookId: null, publishedAt: null });
    }
    this.saveDatabase();
    return true;
  }

  // --- Social: Likes & Ratings ---
  public getLikesForBook(bookId: string): LikeRecord[] {
    return this.db.likes.filter(l => l.bookId === bookId);
  }

  public hasUserLiked(bookId: string, userId: string): boolean {
    return this.db.likes.some(l => l.bookId === bookId && l.userId === userId);
  }

  public toggleLike(bookId: string, userId: string): { liked: boolean; totalLikes: number } {
    const book = this.getBookById(bookId);
    if (!book) throw new Error('Book not found');
    if (book.authorId === userId) {
      throw new Error('Forbidden: Authors cannot like their own books');
    }

    const existingIndex = this.db.likes.findIndex(l => l.bookId === bookId && l.userId === userId);
    let liked = false;
    if (existingIndex >= 0) {
      this.db.likes.splice(existingIndex, 1);
      liked = false;
    } else {
      this.db.likes.push({
        id: `like-${crypto.randomUUID()}`,
        bookId,
        userId,
        createdAt: new Date().toISOString()
      });
      liked = true;
    }
    this.saveDatabase();
    const totalLikes = this.db.likes.filter(l => l.bookId === bookId).length;
    return { liked, totalLikes };
  }

  public getRatingsForBook(bookId: string): RatingRecord[] {
    return this.db.ratings.filter(r => r.bookId === bookId);
  }

  public getUserRating(bookId: string, userId: string): number | undefined {
    const record = this.db.ratings.find(r => r.bookId === bookId && r.userId === userId);
    return record?.score;
  }

  public rateBook(bookId: string, userId: string, score: number): { avgRating: number; totalRatings: number; userRating: number } {
    const book = this.getBookById(bookId);
    if (!book) throw new Error('Book not found');
    if (book.authorId === userId) {
      throw new Error('Forbidden: Authors cannot rate their own books');
    }

    const clampedScore = Math.max(1, Math.min(5, Math.round(score)));
    const existing = this.db.ratings.find(r => r.bookId === bookId && r.userId === userId);
    const now = new Date().toISOString();

    if (existing) {
      existing.score = clampedScore;
      existing.updatedAt = now;
    } else {
      this.db.ratings.push({
        id: `rat-${crypto.randomUUID()}`,
        bookId,
        userId,
        score: clampedScore,
        createdAt: now,
        updatedAt: now
      });
    }

    this.saveDatabase();
    const bookRatings = this.getRatingsForBook(bookId);
    const sum = bookRatings.reduce((acc, r) => acc + r.score, 0);
    const avgRating = bookRatings.length > 0 ? Number((sum / bookRatings.length).toFixed(1)) : 0;
    return { avgRating, totalRatings: bookRatings.length, userRating: clampedScore };
  }

  // --- Aggregate & Best Books Formula ---
  /**
   * Best books formula from specification:
   * score = weighted rating + 0.5 * log10(1 + likes)
   * where weighted rating = (n * avg + 3 * globalMean) / (n + 3)
   */
  public getBooksWithMetrics(currentUserId?: string): BookCardData[] {
    const allRatings = this.db.ratings;
    const globalSum = allRatings.reduce((acc, r) => acc + r.score, 0);
    const globalMean = allRatings.length > 0 ? globalSum / allRatings.length : 4.0;

    const cards: BookCardData[] = this.db.books.map(book => {
      const bookRatings = this.getRatingsForBook(book.id);
      const likes = this.getLikesForBook(book.id);
      const n = bookRatings.length;
      const sum = bookRatings.reduce((acc, r) => acc + r.score, 0);
      const avg = n > 0 ? sum / n : globalMean;

      // Weighted rating = (n * avg + 3 * globalMean) / (n + 3)
      const weightedRating = (n * avg + 3 * globalMean) / (n + 3);
      // Likes bonus = 0.5 * log10(1 + likes)
      const likesBonus = 0.5 * Math.log10(1 + likes.length);
      const totalScore = Number((weightedRating + likesBonus).toFixed(3));

      const author = this.findUserById(book.authorId);
      const userHasLiked = currentUserId ? this.hasUserLiked(book.id, currentUserId) : false;
      const userRating = currentUserId ? this.getUserRating(book.id, currentUserId) : undefined;

      return {
        ...book,
        authorName: author ? author.displayName : book.authorName,
        episodeCount: book.episodes.length,
        avgRating: Number(avg.toFixed(1)),
        ratingCount: n,
        likesCount: likes.length,
        userHasLiked,
        userRating,
        bestRankScore: totalScore,
        formulaDetails: {
          avgRating: Number(avg.toFixed(2)),
          ratingCount: n,
          globalMean: Number(globalMean.toFixed(2)),
          weightedRating: Number(weightedRating.toFixed(3)),
          likesBonus: Number(likesBonus.toFixed(3)),
          totalScore
        }
      };
    });

    return cards;
  }
}

export const storageService = new StorageService();
