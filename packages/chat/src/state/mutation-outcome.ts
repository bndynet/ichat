/**
 * Outcome of a single message-array mutation.
 *
 * Deliberately not an `ok`-discriminated `*Result` union: the two flags are
 * independent and neither `false` value represents a failure.
 */
export interface ChatMutationOutcome {
  /**
   * The mutation produced a new message array. `false` means it was a no-op,
   * typically because the target message or part no longer exists. A no-op is
   * not a rejection and must never block a run's lifecycle transition.
   */
  changed: boolean;
  /**
   * `false` only when a controlled host rejected the proposal by calling
   * `preventDefault()` on `messages-change`.
   *
   * This is proposal-level: `true` does not guarantee the host has written
   * `messages` back yet — the store keeps the accepted proposal as its working
   * snapshot until the host catches up.
   */
  accepted: boolean;
}

/** Outcome of a mutation that changed nothing.  Always accepted. */
export function acceptedNoOp(): ChatMutationOutcome {
  return { changed: false, accepted: true };
}

/**
 * Read an outcome from a store method that may still use the older `void`
 * signature, so custom `ChatMessageStorePort` implementations keep working.
 */
export function normalizeOutcome(
  outcome: ChatMutationOutcome | void,
): ChatMutationOutcome {
  return outcome ?? { changed: true, accepted: true };
}
