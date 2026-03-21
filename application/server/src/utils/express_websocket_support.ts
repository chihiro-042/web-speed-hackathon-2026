import http from "node:http";

import Express, { Router } from "express";
import { WebSocketServer } from "ws";

const DUMMY_BASE_URL = "http://localhost";

function appendWebSocketSuffix(pathOrUrl: string | undefined) {
  const url = new URL(pathOrUrl ?? "/", DUMMY_BASE_URL);
  const pathname =
    url.pathname !== "/" && url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;

  url.pathname = pathname === "/" ? "/ws" : `${pathname}/ws`;

  return `${url.pathname}${url.search}`;
}

// @ts-expect-error
Router.prototype.ws = Express.application.ws = function (
  this: Router,
  path: string,
  ...handlers: Express.RequestHandler[]
) {
  // パスに `/ws` を付与してWebSocket用のルートを作成する
  const wsPath = appendWebSocketSuffix(path);
  this.get(wsPath, ...handlers);
};

const listen = Express.application.listen;
Express.application.listen = function (this: Express.Application, ...args: unknown[]) {
  const server = listen.apply(this, args as Parameters<typeof listen>);

  type WsPath = string;
  const mapping = new Map<WsPath, WebSocketServer>();

  server.on("upgrade", (rawReq, socket, head) => {
    const req: Express.Request = Object.setPrototypeOf(rawReq, Express.request);

    // パスに `/ws` を付与して WebSocket 用のルートに変換する
    req.url = appendWebSocketSuffix(req.url);

    const wss = mapping.get(req.path) ?? new WebSocketServer({ noServer: true });
    mapping.set(req.path, wss);

    wss.handleUpgrade(rawReq, socket, head, (ws) => {
      req.ws = ws;

      const dummy = new http.ServerResponse(req);
      dummy.writeHead = function writeHead(statusCode: number) {
        if (statusCode > 200) {
          // @ts-expect-error
          dummy._header = "";
          ws.close();
        }
        return dummy;
      };

      const notfound = () => {
        ws.close();
        if (wss.clients.size === 0) {
          wss.close();
          mapping.delete(req.path);
        }
      };

      // @ts-expect-error
      this.handle(req, dummy, notfound);
    });
  });

  return server;
};
