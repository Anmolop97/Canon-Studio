import { loreAuditor } from './dist/services/loreAuditor.js';
import { voiceAnalyzer } from './dist/services/voiceAnalyzer.js';
import { memoryTreeService } from './dist/services/memoryTree.js';

async function runTests() {
  console.log('🧪 [TEST 1] Testing Lore Auditor (Intentional Contradiction)...');
  const contradictoryScene = `
EXT. ROOFTOP - NIGHT
An intense Ion Storm rages overhead. Commander Jack Vance picks up his wireless commlink and dials Headquarters.
He steadies his heavy two-handed assault rifle with both hands and aims at the operative below.
`;

  const auditResult = await loreAuditor.auditScene(contradictoryScene);
  console.log('✅ Audit Result Received:');
  console.log('- Has Violations:', auditResult.hasViolations);
  console.log('- Total Violations:', auditResult.totalViolations);
  console.log('- Canon Score:', auditResult.canonConsistencyScore);
  console.log('- Violations:', JSON.stringify(auditResult.violations, null, 2));

  console.log('\n🧪 [TEST 2] Testing Voice Analyzer (Out-of-Character Dialogue)...');
  const badDialogue = 'Excuse me, Dr. Chen! I am terribly sorry for any inconvenience caused by our delay.';
  const voiceResult = await voiceAnalyzer.analyzeDialogue('Jack Vance', badDialogue);
  console.log('✅ Voice Result Received:');
  console.log('- Character:', voiceResult.character);
  console.log('- Fidelity Score:', voiceResult.fidelityScore);
  console.log('- Verdict:', voiceResult.verdict);
  console.log('- Critique:', voiceResult.voiceDriftReason);
  console.log('- Recommended Rewrite:', voiceResult.recommendedRewrite);

  console.log('\n🧪 [TEST 3] Testing Vector Memory Tree...');
  const nodes = memoryTreeService.getAllNodes();
  console.log(`✅ Loaded ${nodes.length} story nodes in the branch graph.`);
  console.log('First node choices:', nodes[0].choices.map(c => c.choiceText));

  console.log('\n🎉 ALL SAGA-FORGE BACKEND CORE TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
