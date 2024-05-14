import { BaseBot } from '@modules/match/lib/observers/bots/baseBot'
import { PerspectiveGameState } from '@modules/match/types/perspective.game.state'

export class RandomBot extends BaseBot {
  think(state: PerspectiveGameState) {
    const available = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).filter(
      (choice) =>
        !state.oponentChoices.includes(choice) &&
        !state.playerChoices.includes(choice),
    )

    if (!available.length) throw new Error('No available choices.')

    const index = Math.trunc(Math.random() * available.length)

    return available[index]
  }
}
