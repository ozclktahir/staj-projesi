import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';

@Module({
  imports: [SupabaseModule],
  controllers: [NoteController],
  providers: [NoteService],
})
export class NoteModule {}
