import pino from "pino";
import { env } from "./env";

export const logger = pino({

  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,

  level: env.NODE_ENV === "development" ? "debug" : "info",
});
