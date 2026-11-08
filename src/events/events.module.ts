import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventPhoto } from './entities/event-photo.entity';
import { ConsumeDetailsModule } from '../consumeDetails/consumeDetails.module';

@Module({
  // ConsumeDetailsModule da el menu del evento (GET /events/:id/menu).
  imports: [
    TypeOrmModule.forFeature([Event, EventPhoto]),
    ConsumeDetailsModule,
  ],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService, TypeOrmModule],
})
export class EventsModule {}
