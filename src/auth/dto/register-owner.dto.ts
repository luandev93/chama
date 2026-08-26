import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterOwnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tenantName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Length(3, 80)
  tenantSlug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  storeName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Length(3, 80)
  storeSlug!: string;

  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;
}
