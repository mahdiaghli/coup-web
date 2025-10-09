import { createClaimInteractions } from "./claimInteractions";
import { createClaimsInitiate } from "./claimsInitiate";

export function createClaimHandlers(ctx) {
  const {
    resolveClaimChallenge,
    resolveBlockChallenge,
    humanChallenge,
    humanBlock,
    humanAcceptAction,
    botChallenge,
    botBlock,
    scheduleBotsChallenges,
    scheduleBotsForBlock,
  } = createClaimInteractions(ctx);

  const { initiateClaim } = createClaimsInitiate(ctx, {
    scheduleBotsForBlock,
    scheduleBotsChallenges,
  });

  return {
    initiateClaim,
    resolveClaimChallenge,
    resolveBlockChallenge,
    humanChallenge,
    humanBlock,
    humanAcceptAction,
    botChallenge,
    botBlock,
    scheduleBotsChallenges,
    scheduleBotsForBlock,
  };
}
