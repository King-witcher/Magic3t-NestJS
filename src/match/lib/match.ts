import { Observable, Stopwatch } from '@/lib'
import { block } from '@/lib/utils'
import { Choice } from '@/types/Choice'
import {
  HistoryMatchEventsEnum,
  MatchEventModal,
  Team,
  UserModel,
} from '@database'
import { StateReportData } from '../types'
import { Player } from './player'

export enum MatchEventsEnum {
  Start = 0,
  Choice = 1,
  Surrender = 2,
  Timeout = 3,
  Finish = 4,
}

export enum MatchError {
  BadTurn = 'bad-turn',
  ChoiceUnavailable = 'choice-unavailable',
}

export type MatchEventsMap = {
  [MatchEventsEnum.Start](): void
  [MatchEventsEnum.Choice](side: Team, choice: Choice, timestamp: number): void
  [MatchEventsEnum.Surrender](side: Team, timestamp: number): void
  [MatchEventsEnum.Timeout](side: Team, timestamp: number): void
  [MatchEventsEnum.Finish](self: Match, winner: Team | null): void
}

interface MatchParams {
  timelimit: number
  [Team.Order]: UserModel
  [Team.Chaos]: UserModel
}

export class Match extends Observable<MatchEventsMap> {
  private globalTime = new Stopwatch()
  public id: string
  public events: MatchEventModal[] = []
  public turn: Team | null = null
  public winner: Team | null = null
  public finished = false
  public [Team.Order]: Player
  public [Team.Chaos]: Player
  public timelimit: number
  public assignments: Record<Team, UserModel>

  constructor({
    timelimit,
    [Team.Order]: order,
    [Team.Chaos]: chaos,
  }: MatchParams) {
    super()
    this.timelimit = timelimit

    this.assignments = {
      [Team.Order]: order,
      [Team.Chaos]: chaos,
    }

    this[Team.Order] = new Player(timelimit, () =>
      this.handleTimeout(Team.Order)
    )
    this[Team.Chaos] = new Player(timelimit, () =>
      this.handleTimeout(Team.Chaos)
    )
  }

  public get time() {
    return this.globalTime.time
  }

  private get isDrawn() {
    return this[Team.Order].count + this[Team.Chaos].count === 9
  }

  public get stateReport(): StateReportData {
    const order = this[Team.Order]
    const chaos = this[Team.Chaos]

    const report: StateReportData = {
      [Team.Order]: {
        choices: [...order.choices],
        surrender: order.surrender,
        timeLeft: order.timer.remaining,
      },
      [Team.Chaos]: {
        choices: [...chaos.choices],
        surrender: chaos.surrender,
        timeLeft: chaos.timer.remaining,
      },
      turn: this.turn,
      pending: false,
      finished: this.finished,
    }

    return report
  }

  public start() {
    if (this.turn !== null) throw new Error('panic: called start() twice')

    this[Team.Order].timer.start()
    this.globalTime.start()
    this.turn = Team.Order
    this.emit(MatchEventsEnum.Start)
  }

  private isAvailable(choice: Choice) {
    return (
      !this[Team.Chaos].choices.includes(choice) &&
      !this[Team.Order].choices.includes(choice)
    )
  }

  public handleChoice(team: Team, choice: Choice): Result<[], MatchError> {
    if (this.turn !== team) return Err(MatchError.BadTurn)
    if (!this.isAvailable(choice)) return Err(MatchError.ChoiceUnavailable)

    this.turn = null
    this[Team.Order].timer.pause()
    this[Team.Chaos].timer.pause()

    const player = this[team]
    player.choices.push(choice)

    this.events.push({
      event: HistoryMatchEventsEnum.Choice,
      choice,
      side: team,
      time: this.time,
    })

    const isWinner = block(() => {
      const choices = player.choices
      for (let i = 0; i < choices.length; i++)
        for (let j = i + 1; j < choices.length; j++)
          for (let k = j + 1; k < choices.length; k++)
            if (choices[i] + choices[j] + choices[k] === 15) return true
      return false
    })

    if (isWinner) {
      this.globalTime.pause()
      this[Team.Order].timer.pause()
      this[Team.Chaos].timer.pause()
      this.winner = team
      this.finished = true
      this.emit(MatchEventsEnum.Choice, team, choice, this.time)
      this.emit(MatchEventsEnum.Finish, this, team)
    } else if (this.isDrawn) {
      this.globalTime.pause()
      this[Team.Order].timer.pause()
      this[Team.Chaos].timer.pause()
      this.finished = true
      this.winner = null
      this.emit(MatchEventsEnum.Choice, team, choice, this.time)
      this.emit(MatchEventsEnum.Finish, this, null)
    } else {
      this.turn = 1 - team
      this[this.turn].timer.start()
      this.emit(MatchEventsEnum.Choice, team, choice, this.time)
    }

    return Ok([])
  }

  public handleSurrender(side: Team): Result<[], MatchError> {
    if (this.turn === null) return Err(MatchError.BadTurn)
    this.turn = null
    this.finished = true
    this.winner = 1 - side

    const player = this[side]
    player.surrender = true

    this[Team.Order].timer.pause()
    this[Team.Chaos].timer.pause()
    this.globalTime.pause()

    this.events.push({
      event: HistoryMatchEventsEnum.Forfeit,
      side,
      time: this.time,
    })

    this.emit(MatchEventsEnum.Surrender, side, this.time)
    this.emit(MatchEventsEnum.Finish, this, 1 - side)

    return Ok([])
  }

  private handleTimeout(side: Team) {
    const opposite = 1 - side
    this.turn = null
    this.globalTime.pause()

    this.events.push({
      event: HistoryMatchEventsEnum.Timeout,
      side,
      time: this.time,
    })

    this.emit(MatchEventsEnum.Timeout, side, this.time)
    this.emit(MatchEventsEnum.Finish, this, opposite)
  }
}
