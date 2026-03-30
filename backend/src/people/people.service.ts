import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { Person } from '../database/entities/person.entity';
import { CreatePersonDto, PersonKindDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(Person)
    private personModel: typeof Person,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PeopleService.name);
  }

  private flagsFromKind(kind: PersonKindDto): { isMember: boolean; isParent: boolean } {
    switch (kind) {
      case PersonKindDto.MEMBER:
        return { isMember: true, isParent: false };
      case PersonKindDto.PARENT:
        return { isMember: false, isParent: true };
      case PersonKindDto.BOTH:
        return { isMember: true, isParent: true };
      default:
        return { isMember: true, isParent: false };
    }
  }

  private toResponseDto(person: Person): PersonResponseDto {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      addressLine1: person.addressLine1,
      city: person.city,
      state: person.state,
      zip: person.zip,
      email: person.email,
      phone: person.phone ?? null,
      pledgeClassYear: person.pledgeClassYear ?? null,
      isMember: person.isMember,
      isParent: person.isParent,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }

  /**
   * Create one person. Email is unique; soft-deleted row can be restored and updated.
   */
  async create(dto: CreatePersonDto): Promise<PersonResponseDto> {
    const { isMember, isParent } = this.flagsFromKind(dto.kind);
    const pledgeClassYear =
      isMember && dto.pledgeClassYear !== undefined && dto.pledgeClassYear !== null
        ? dto.pledgeClassYear
        : null;

    const existing = await this.personModel.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      paranoid: false,
    });

    if (existing) {
      if (existing.deletedAt) {
        await existing.restore();
        existing.firstName = dto.firstName;
        existing.lastName = dto.lastName;
        existing.addressLine1 = dto.addressLine1;
        existing.city = dto.city;
        existing.state = dto.state.toUpperCase();
        existing.zip = dto.zip;
        existing.email = dto.email.toLowerCase().trim();
        existing.phone = dto.phone?.trim() || null;
        existing.pledgeClassYear = pledgeClassYear;
        existing.isMember = isMember;
        existing.isParent = isParent;
        await existing.save();
        this.logger.info('Restored soft-deleted person', { id: existing.id, email: existing.email });
        return this.toResponseDto(existing);
      }
      throw new ConflictException(`Person with email ${dto.email} already exists`);
    }

    const person = await this.personModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      addressLine1: dto.addressLine1,
      city: dto.city,
      state: dto.state.toUpperCase(),
      zip: dto.zip,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone?.trim() || null,
      pledgeClassYear,
      isMember,
      isParent,
    });

    return this.toResponseDto(person);
  }

  /**
   * All non-deleted people, ordered for directory display.
   */
  async findAll(): Promise<PersonResponseDto[]> {
    const rows = await this.personModel.findAll({
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    });
    return rows.map((p) => this.toResponseDto(p));
  }

  async update(id: string, dto: UpdatePersonDto): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id);
    if (!person) {
      throw new NotFoundException('Person not found');
    }

    if (dto.email !== undefined) {
      const normalized = dto.email.toLowerCase().trim();
      if (normalized !== person.email) {
        const other = await this.personModel.findOne({
          where: { email: normalized },
          paranoid: false,
        });
        if (other && other.id !== id) {
          throw new ConflictException(`Person with email ${dto.email} already exists`);
        }
      }
    }

    let isMember = person.isMember;
    let isParent = person.isParent;
    if (dto.kind !== undefined) {
      const flags = this.flagsFromKind(dto.kind);
      isMember = flags.isMember;
      isParent = flags.isParent;
    }

    if (dto.firstName !== undefined) person.firstName = dto.firstName;
    if (dto.lastName !== undefined) person.lastName = dto.lastName;
    if (dto.addressLine1 !== undefined) person.addressLine1 = dto.addressLine1;
    if (dto.city !== undefined) person.city = dto.city;
    if (dto.state !== undefined) person.state = dto.state.toUpperCase();
    if (dto.zip !== undefined) person.zip = dto.zip;
    if (dto.email !== undefined) person.email = dto.email.toLowerCase().trim();
    if (dto.phone !== undefined) {
      person.phone =
        dto.phone == null || !String(dto.phone).trim() ? null : String(dto.phone).trim();
    }

    person.isMember = isMember;
    person.isParent = isParent;

    if (!isMember) {
      person.pledgeClassYear = null;
    } else if (dto.pledgeClassYear !== undefined) {
      person.pledgeClassYear = dto.pledgeClassYear;
    }

    if (!person.isMember && !person.isParent) {
      throw new BadRequestException('Person must be a member, parent, or both');
    }

    await person.save();
    this.logger.info('Updated person', { id: person.id });
    return this.toResponseDto(person);
  }

  /**
   * Soft-delete a person (paranoid). Email can be reused via create restore path.
   */
  async remove(id: string): Promise<void> {
    const person = await this.personModel.findByPk(id);
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    await person.destroy();
    this.logger.info('Soft-deleted person', { id });
  }
}
