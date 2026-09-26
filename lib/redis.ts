import IORedis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var __redis: IORedis | undefined;
}

function createConnection() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');
  return new IORedis(url, {
    maxRetriesPerRequest: null // required by BullMQ
  });
}

export const redis = global.__redis ?? createConnection();

if (process.env.NODE_ENV !== 'production') {
  global.__redis = redis;
}
