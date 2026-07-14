import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';

export type WorkspaceRole = 'Admin' | 'Member' | 'Guest';

export const WORKSPACE_ROLES: WorkspaceRole[] = ['Admin', 'Member', 'Guest'];

export class InviteMemberDto {
  @ApiProperty({
    example: 'davetli@example.com',
    description: 'Davet edilecek kullanıcının e-posta adresi',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Member',
    description: 'Davet edilecek kullanıcının rolü',
    enum: WORKSPACE_ROLES,
  })
  @IsIn(WORKSPACE_ROLES)
  role: WorkspaceRole;
}
