import {
  IsString, IsOptional, IsNumber, IsEnum, IsBoolean,
  IsDateString, Min, Max, MinLength, MaxLength, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════════════════════════
// Appointment DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateAppointmentDto {
  @ApiProperty({ example: 'CUST-001', description: 'Customer / patient user ID' })
  @IsString()
  @MinLength(1)
  customerId: string;

  @ApiProperty({ example: 'DOC-001' })
  @IsString()
  @MinLength(1)
  doctorId: string;

  @ApiProperty({ example: '2026-07-15', description: 'ISO date string' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00', description: 'Time slot e.g. "09:00"' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  time: string;

  @ApiProperty({ enum: ['in-clinic', 'video'], default: 'in-clinic' })
  @IsEnum(['in-clinic', 'video'])
  type: 'in-clinic' | 'video';

  @ApiPropertyOptional({ example: 'John Kimani' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  patientName?: string;

  @ApiPropertyOptional({ example: 32 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  patientAge?: number;

  @ApiPropertyOptional({ example: 'male', enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsString()
  patientGender?: string;

  @ApiPropertyOptional({ example: 'Recurring headaches and dizziness' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  symptoms?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    example: 'CONFIRMED',
  })
  @IsEnum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

  @ApiPropertyOptional({ example: 'Patient requested reschedule' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdvanceTokenDto {
  @ApiProperty({ example: 'DOC-001', description: 'Doctor whose queue to advance' })
  @IsString()
  @MinLength(1)
  doctorId: string;

  @ApiPropertyOptional({ example: '2026-07-15', description: 'Date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CheckInDto {
  @ApiProperty({ example: 'APT-001' })
  @IsString()
  @MinLength(1)
  appointmentId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Doctor DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdateDoctorStatusDto {
  @ApiProperty({
    enum: ['active', 'suspended', 'blocked', 'pending'],
    example: 'active',
  })
  @IsEnum(['active', 'suspended', 'blocked', 'pending'])
  status: 'active' | 'suspended' | 'blocked' | 'pending';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hospital DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdateHospitalStatusDto {
  @ApiProperty({
    enum: ['pending', 'active', 'suspended', 'blocked', 'rejected'],
    example: 'active',
  })
  @IsEnum(['pending', 'active', 'suspended', 'blocked', 'rejected'])
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'rejected';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Clinic DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdateClinicStatusDto {
  @ApiProperty({
    enum: ['pending', 'active', 'suspended', 'blocked', 'rejected'],
    example: 'active',
  })
  @IsEnum(['pending', 'active', 'suspended', 'blocked', 'rejected'])
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'rejected';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Review DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateReviewDto {
  @ApiProperty({ enum: ['doctor', 'hospital', 'clinic'] })
  @IsEnum(['doctor', 'hospital', 'clinic'])
  targetType: 'doctor' | 'hospital' | 'clinic';

  @ApiProperty({ example: 'DOC-001' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: 'CUST-001' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ example: 'John K.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excellent doctor!' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ example: 'APT-001' })
  @IsOptional()
  @IsString()
  appointmentId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Prescription DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class PrescriptionItemDto {
  @ApiProperty({ example: 'Amoxicillin' })
  @IsString() @MinLength(1) @MaxLength(300)
  drugName: string;

  @ApiPropertyOptional({ example: 'Amoxicillin Trihydrate' })
  @IsOptional() @IsString() @MaxLength(300)
  genericName?: string;

  @ApiProperty({ example: '500mg' })
  @IsString() @MinLength(1) @MaxLength(100)
  dosage: string;

  @ApiProperty({ example: 'Twice daily' })
  @IsString() @MinLength(1) @MaxLength(100)
  frequency: string;

  @ApiProperty({ example: '7 days' })
  @IsString() @MinLength(1) @MaxLength(100)
  duration: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ example: 'Take after meals' })
  @IsOptional() @IsString() @MaxLength(500)
  instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'APT-001' })
  @IsString() @MinLength(1)
  appointmentId: string;

  @ApiPropertyOptional({ example: 'Upper respiratory infection' })
  @IsOptional() @IsString() @MaxLength(2000)
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Rest and fluids recommended' })
  @IsOptional() @IsString() @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional() @IsDateString()
  followUpDate?: string;

  @ApiProperty({ type: [PrescriptionItemDto] })
  @IsArray()
  items: PrescriptionItemDto[];
}

export class IssuePrescriptionDto {
  @ApiProperty({ example: 'RX-001' })
  @IsString() @MinLength(1)
  prescriptionId: string;
}

export class LinkPharmacyDto {
  @ApiProperty({ example: 'RX-001' })
  @IsString() @MinLength(1)
  prescriptionId: string;

  @ApiProperty({ example: 'PHARM-ORD-001' })
  @IsString() @MinLength(1)
  pharmacyOrderId: string;
}
