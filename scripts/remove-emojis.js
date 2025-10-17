/**
 * EMOJI REMOVAL SCRIPT
 *
 * This script removes all emojis from source files in the Fundraisely project.
 * It processes TypeScript, JavaScript, and JSX files, replacing emojis with
 * appropriate text descriptions or removing them entirely.
 *
 * Usage: node scripts/remove-emojis.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common emoji mappings to text
const emojiMap = {
  '🎉': '[SUCCESS]',
  '🚀': '[LAUNCH]',
  '✅': '[COMPLETE]',
  '❌': '[ERROR]',
  '💰': '[MONEY]',
  '🎯': '[TARGET]',
  '🏆': '[WINNER]',
  '⚡': '[FAST]',
  '🔥': '[HOT]',
  '💪': '[STRONG]',
  '👍': '[GOOD]',
  '🎮': '[GAME]',
  '📊': '[STATS]',
  '🔍': '[SEARCH]',
  '📝': '[NOTE]',
  '⏰': '[TIME]',
  '🔔': '[ALERT]',
  '💬': '[CHAT]',
  '📱': '[MOBILE]',
  '🎨': '[DESIGN]',
  '🛠': '[TOOLS]',
  '⚙': '[SETTINGS]',
  '📈': '[GROWTH]',
  '🎁': '[GIFT]',
  '🌟': '[STAR]',
  '💡': '[IDEA]',
  '🚨': '[URGENT]',
  '🔐': '[SECURE]',
  '📦': '[PACKAGE]',
  '🏁': '[FINISH]',
  '🎊': '[CELEBRATION]',
  '🔔': '[NOTIFICATION]',
  '🤖': '[BOT]',
};

// Files to process (from grep results)
const filesToProcess = [
  'src/chains/solana/transactionHelpers.ts',
  'src/components/ConfirmRoomModal.tsx',
  'src/components/CreateRoomCard.tsx',
  'src/components/GameControls.tsx',
  'src/components/GameOverScreen.tsx',
  'src/components/GameScreen.tsx',
  'src/components/JoinRoomCard.tsx',
  'src/components/Quiz/dashboard/FundraisingExtrasPanel.tsx',
  'src/components/Quiz/dashboard/HostDashboard.tsx',
  'src/components/Quiz/dashboard/PaymentReconciliation.tsx',
  'src/components/Quiz/dashboard/PlayerListPanel.tsx',
  'src/components/Quiz/dashboard/SetupSummaryPanel.tsx',
  'src/components/Quiz/game/GameControls.tsx',
  'src/components/Quiz/joinQuizSocket.ts',
  'src/components/Quiz/joinroom/JoinQuizModal.tsx',
  'src/components/Quiz/joinroom/JoinQuizWeb2Page.tsx',
  'src/components/Quiz/joinroom/JoinQuizWeb3Page.tsx',
  'src/components/Quiz/usePlayerStore.ts',
  'src/components/Quiz/useQuizSocket.ts',
  'src/components/Quiz/Wizard/StepReviewLaunch.tsx',
  'src/components/TokenRegistrySetup.tsx',
  'src/components/WinNotification.tsx',
  'src/constants/quiztypeconstants.ts',
  'src/hooks/queries/useRoomQuery.ts',
  'src/hooks/useSocket.ts',
  'src/lib/solana/transactions.ts',
  'src/pages/Game.tsx',
  'src/pages/QuizChallengePage.tsx',
  'src/pages/QuizGamePlayPage.tsx',
  'src/pages/QuizGameWaitingPage.tsx',
  'src/pages/savings.tsx',
  'src/pages/TestCampaign.tsx',
  'src/services/socketService.ts',
  'src/services/storageService.ts',
  'src/services/__tests__/storageService.test.ts',
  'src/store/gameStore.ts',
  'src/types/quiz.ts',
  'server/handlers/socketHandler.js',
  'server/index.js',
  'server/managers/GameManager.js',
  'server/managers/RoomManager.js',
];

function removeEmojis(content) {
  let cleaned = content;

  // Replace known emojis with text equivalents
  for (const [emoji, text] of Object.entries(emojiMap)) {
    cleaned = cleaned.split(emoji).join(text);
  }

  // Remove any remaining emojis (Unicode emoji range)
  // This regex covers most common emojis
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');

  return cleaned;
}

function processFile(filePath) {
  const fullPath = path.join(path.dirname(__dirname), filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping ${filePath} - file not found`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const cleaned = removeEmojis(content);

    if (content !== cleaned) {
      fs.writeFileSync(fullPath, cleaned, 'utf8');
      console.log(`Cleaned: ${filePath}`);
    } else {
      console.log(`No changes: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log('Starting emoji removal...\n');
filesToProcess.forEach(processFile);
console.log('\nEmoji removal complete!');
