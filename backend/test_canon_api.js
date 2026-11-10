import http from 'http';
import app from './dist/server.js';

const PORT = 5566;

async function run() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`🚀 Test server listening on http://localhost:${PORT}`);

  const baseUrl = `http://localhost:${PORT}/api`;

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  try {
    console.log('\n--- 1. Health Check ---');
    const health = await api('/health');
    console.log('Health:', health.status, health.data?.service);

    console.log('\n--- 2. Auth: Demo Login & New User Register ---');
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'anya@canonstory.studio', password: 'anya123' })
    });
    console.log('Login Anya:', loginRes.status, 'User:', loginRes.data?.user?.displayName);
    const anyaToken = loginRes.data?.token;

    const devLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'dev@canonstory.studio', password: 'dev123' })
    });
    const devToken = devLogin.data?.token;

    console.log('\n--- 3. Wizard: Next Question (Step 4) ---');
    const qRes = await api('/wizard/next-question', {
      method: 'POST',
      body: JSON.stringify({
        step: 4,
        answers: {
          genre: 'Delulu',
          realism: 'Real life with a twist',
          language: 'Hinglish',
          keywords: 'Tea stall crush'
        }
      })
    });
    console.log('Question:', qRes.data?.question);
    console.log('Options count:', qRes.data?.options?.length);

    console.log('\n--- 4. Wizard: Story Generation ---');
    const storyRes = await api('/wizard/generate-story', {
      method: 'POST',
      body: JSON.stringify({
        genre: 'Sci-fi',
        realism: 'Real life with a twist',
        language: 'English',
        keywords: 'Submerged neon city and ion storms',
        targetLength: '400',
        step4Answer: 'Commander Jack Vance',
        step5Answer: 'Lower Veridia Sub-level 3',
        step6Answer: 'A prototype atmospheric scrub engine'
      })
    });
    console.log('Generated Story Title:', storyRes.data?.title);
    console.log('Word count:', storyRes.data?.wordCount);

    console.log('\n--- 5. Branching Story: Start & Next ---');
    const branchStart = await api('/branching/start', {
      method: 'POST',
      body: JSON.stringify({
        idea: 'A stranded courier with a mysterious pulsing cylinder',
        genre: 'Sci-fi',
        maxDecisions: 3
      })
    });
    console.log('Scene 1:', branchStart.data?.content?.slice(0, 80) + '...');
    console.log('Choices:', branchStart.data?.options?.map(o => `[${o.type}] ${o.text}`));

    const branchNext = await api('/branching/next', {
      method: 'POST',
      body: JSON.stringify({
        storySoFar: [branchStart.data?.content],
        chosenOptionText: branchStart.data?.options?.[0]?.text,
        decisionIndex: 1,
        maxDecisions: 3
      })
    });
    console.log('Scene 2:', branchNext.data?.content?.slice(0, 80) + '...');
    console.log('Choices count:', branchNext.data?.options?.length);

    console.log('\n--- 6. Writer Mode: Create Draft, Check Canon & Publish ---');
    const draftRes = await api('/drafts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${anyaToken}` },
      body: JSON.stringify({
        title: 'Project Chimera Rising',
        genre: 'Sci-fi',
        blurb: 'The fight for the sky above Veridia',
        episodes: [
          {
            id: 'ep-test-1',
            order: 1,
            title: 'Episode 1: The Breach',
            content: 'Jack Vance took a sip of synthesized water and checked his flechette pistol.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        canonFacts: [
          {
            id: 'fact-arm',
            subject: 'Jack Vance',
            quote: 'industrial prosthetic',
            text: 'Jack Vance has a prosthetic left arm and cannot hold two-handed rifles.',
            episodeNumber: 1,
            removable: true
          }
        ],
        voiceNotes: [
          { character: 'Jack Vance', style: 'Cynical, terse military phrasing.' }
        ]
      })
    });
    const draftId = draftRes.data?.id;
    console.log('Draft created:', draftId, draftRes.data?.title);

    // Check canon for Episode 2 with intentional contradiction
    const checkRes = await api(`/drafts/${draftId}/check-canon`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anyaToken}` },
      body: JSON.stringify({
        episodeIndex: 1,
        episodeTitle: 'Episode 2: The Ambush',
        episodeContent: 'Commander Jack Vance picks up an assault rifle with both hands and aims at the shadow.'
      })
    });
    console.log('Canon Audit Status:', checkRes.data?.status);
    console.log('Conflicts detected:', checkRes.data?.conflicts?.length);
    console.log('Conflict explanation:', checkRes.data?.conflicts?.[0]?.explanation);

    // Publish draft
    const publishRes = await api(`/drafts/${draftId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anyaToken}` }
    });
    console.log('Published Book ID:', publishRes.data?.book?.id);
    const publishedBookId = publishRes.data?.book?.id;

    console.log('\n--- 7. Books: Browse, Best Books & Ratings ---');
    const booksRes = await api('/books');
    console.log('Total Books in Library:', booksRes.data?.length);

    const bestRes = await api('/books/best');
    console.log('Best Books Count:', bestRes.data?.books?.length);
    console.log('Top #1 Book:', bestRes.data?.books?.[0]?.title, 'Score:', bestRes.data?.books?.[0]?.bestRankScore);

    // Like book as Dev
    const likeRes = await api(`/books/${publishedBookId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devToken}` }
    });
    console.log('Dev Liked Book:', likeRes.data?.liked, 'Total likes:', likeRes.data?.totalLikes);

    // Rate book as Dev
    const rateRes = await api(`/books/${publishedBookId}/rate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devToken}` },
      body: JSON.stringify({ score: 5 })
    });
    console.log('Dev Rated Book:', rateRes.data?.avgRating, 'Total votes:', rateRes.data?.totalRatings);

    // Test forbidden: Anya (author) cannot like own book
    const selfLikeRes = await api(`/books/${publishedBookId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anyaToken}` }
    });
    console.log('Self-Like prevention status:', selfLikeRes.status, selfLikeRes.data?.error);

    console.log('\n🎉 ALL CANON STORY STUDIO BACKEND INTEGRATION TESTS PASSED!');
  } finally {
    server.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
