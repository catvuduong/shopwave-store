import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DbService } from './db.service.js';
import { ShopController } from './shop/shop.controller.js';
import { ShopService } from './shop/shop.service.js';

@Module({
  imports: [],
  controllers: [AppController, ShopController],
  providers: [AppService, DbService, ShopService],
})
export class AppModule {}
