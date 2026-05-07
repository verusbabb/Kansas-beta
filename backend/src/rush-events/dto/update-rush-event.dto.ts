import { PartialType } from '@nestjs/swagger'
import { CreateRushEventDto } from './create-rush-event.dto'

export class UpdateRushEventDto extends PartialType(CreateRushEventDto) {}
