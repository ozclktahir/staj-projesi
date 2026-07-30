import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PersonalController],
  providers: [PersonalService],
})
export class PersonalModule {}
