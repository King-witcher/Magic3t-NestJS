import { ApiProperty } from '@nestjs/swagger'
import { RatingModel, UserModel, UserRole } from './user.model'
import { RatingService } from '@/rating'

export enum League {
  Provisional = 'provisional',
  Bronze = 'bronze',
  Silver = 'silver',
  Gold = 'gold',
  Diamond = 'diamond',
  Master = 'master',
  Challenger = 'challenger',
}

export class RatingDto {
  @ApiProperty({
    description: "The player's estimate rating",
    default: 1500,
  })
  score: number

  @ApiProperty({
    description:
      'The standard deviation of the rating estimate at the specified date',
    default: 350,
  })
  rd: number

  @ApiProperty({
    description: 'The date when this rating was calculated',
    example: Date.now(),
  })
  date: number

  league: League
  division?: number
  points?: number
  progress?: number

  constructor(data: RatingDto) {
    Object.assign(this, data)
  }

  static fromModel(
    model: RatingModel,
    ratingService: RatingService
  ): Promise<RatingDto> {
    return ratingService.getRatingDto(model)
  }
}

export class UserDto {
  @ApiProperty({
    description: 'The user unique id',
    example: 'RdZ0ThlzqfMEpcwDEYaND7avAi42',
  })
  id: string

  @ApiProperty({
    example: 'The Creator',
  })
  nickname: string | null

  @ApiProperty({
    description: 'The summoner icon id of the icon being used',
    example: '1394',
    default: '29',
  })
  summonerIcon: number

  @ApiProperty({
    description:
      "The user role in Magic3T. Can be either 'player', 'bot', or 'creator'",
    default: 'player',
    example: 'creator',
    enum: UserRole,
  })
  role: UserRole

  @ApiProperty({
    description: 'The rating params of the user',
    type: RatingDto,
  })
  rating: RatingDto

  @ApiProperty({
    description: "The player's wins, draws and defeats",
    example: {
      wins: 23,
      draws: 8,
      defeats: 17,
    },
  })
  stats: {
    wins: number
    draws: number
    defeats: number
  }

  constructor(data: UserDto) {
    Object.assign(this, data)
  }

  static async fromModel(
    model: UserModel,
    ratingService: RatingService
  ): Promise<UserDto> {
    return new UserDto({
      id: model._id,
      nickname: model.identification?.nickname || null,
      summonerIcon: model.summoner_icon,
      role: model.role,
      stats: {
        wins: model.stats.wins,
        draws: model.stats.draws,
        defeats: model.stats.defeats,
      },
      rating: await RatingDto.fromModel(model.glicko, ratingService),
    })
  }
}
