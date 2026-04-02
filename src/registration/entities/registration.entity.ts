import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentType, RegistrationStep } from './registration.enums';

export { DocumentType, RegistrationStep };

@Index('IDX_registration_email_unique', ['email'], {
  unique: true,
  where: `"email" IS NOT NULL`,
})
@Index('IDX_registration_document_unique', ['document'], {
  unique: true,
  where: `"document" IS NOT NULL`,
})
@Index('IDX_registration_phone_unique', ['phone'], {
  unique: true,
  where: `"phone" IS NOT NULL`,
})
@Index('IDX_registration_email_step', ['email', 'currentStep'])
@Entity()
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'enum', enum: DocumentType, nullable: true })
  documentType!: DocumentType | null;

  @Column({ type: 'varchar', nullable: true })
  document!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 11 })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 8 })
  cep!: string | null;

  @Column({ type: 'varchar', nullable: true })
  street!: string | null;

  @Column({ type: 'varchar', nullable: true })
  number!: string | null;

  @Column({ type: 'varchar', nullable: true })
  complement!: string | null;

  @Column({ type: 'varchar', nullable: true })
  neighborhood!: string | null;

  @Column({ type: 'varchar', nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 2 })
  state!: string | null;

  @Column({
    type: 'enum',
    enum: RegistrationStep,
    default: RegistrationStep.IDENTIFICATION,
  })
  currentStep!: RegistrationStep;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  mfaCode!: string | null;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  mfaCodeExpiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  mfaVerifiedAt!: Date | null;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  abandonmentEmailSentAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
