/**
 * How the automatic rules get triggered in play mode:
 * TEMPORAL      — the 1 s loop (the historical behaviour).
 * POR_ACCIONES — every recipe the player runs, or the "Avanzar" button when
 *                nobody is possessed, drives the other agents forward.
 */
export type ActivationStrategy = 'TEMPORAL' | 'POR_ACCIONES'

export const ACTIVATION_STRATEGIES: readonly ActivationStrategy[] = ['TEMPORAL', 'POR_ACCIONES']

export const DEFAULT_ACTIVATION_STRATEGY: ActivationStrategy = 'TEMPORAL'

/** Session-level setting: it belongs to the play session, not to the world export. */
export class StrategyStore {
  private value: ActivationStrategy = DEFAULT_ACTIVATION_STRATEGY

  get(): ActivationStrategy {
    return this.value
  }

  set(value: ActivationStrategy): void {
    this.value = value
  }
}
