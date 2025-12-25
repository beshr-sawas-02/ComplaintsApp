import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let initialized = false;

async function init() {
  if (initialized) return server;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.enableCors({ origin: true, credentials: true });
  await app.init();

  initialized = true;
  return server;
}

export default async function handler(req: any, res: any) {
  const s = await init();
  return s(req, res);
}