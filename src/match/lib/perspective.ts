import { Choice, Team } from '@/common'
import { UserDto } from '@/database'
import { RatingService } from '@/rating'
import { Observable } from 'rxjs'
import { AssignmentsDto, StateReportDto } from '../types'
import { Match, MatchError, MatchEventsMap } from './match'

/**
 * A perspective is a portal through which a player (human or bot) can interact with its ongoing match.
 */
export class Perspective extends Observable<MatchEventsMap> {
  constructor(
    public readonly match: Match,
    public readonly team: Team,
    public readonly ratingService: RatingService
  ) {
    super()
  }

  async getAssignments(): Promise<AssignmentsDto> {
    const order = this.match.assignments[Team.Order]
    const chaos = this.match.assignments[Team.Chaos]

    return {
      [Team.Order]: {
        profile: await UserDto.fromModel(order, this.ratingService),
      },
      [Team.Chaos]: {
        profile: await UserDto.fromModel(chaos, this.ratingService),
      },
    }
  }

  getStateReport(): StateReportDto {
    return this.match.stateReport
  }

  pick(choice: Choice): Result<[], MatchError> {
    return this.match.handleChoice(this.team, choice)
  }

  surrender(): Result<[], MatchError> {
    return this.match.handleSurrender(this.team)
  }

  observe<Event extends keyof MatchEventsMap>(
    event: Event,
    observer: (...data: Parameters<MatchEventsMap[Event]>) => void
  ) {
    this.match.observe(event, observer)
  }
}
