declare module 'swagger-ui-express' {
  import type { RequestHandler } from 'express';
  export const serve: RequestHandler;
  export function setup(...args: any[]): RequestHandler;
  const _default: {
    serve: RequestHandler;
    setup: typeof setup;
  };
  export default _default;
}

declare module 'pino-http' {
  import type { IncomingMessage, ServerResponse } from 'node:http';
  const pinoHttp: (options?: any) => any;
  export default pinoHttp;
}
