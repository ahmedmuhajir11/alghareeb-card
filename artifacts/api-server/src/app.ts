import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";
const PgSessionStore = connectPgSimple(session);

app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 60,
    }),
    name: "alghareeb.sid",
    secret: sessionSecret,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://alghareebcard.replit.app/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://alghareebcard.replit.app/payment-methods</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://alghareebcard.replit.app/section/1</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://alghareebcard.replit.app/section/2</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://alghareebcard.replit.app/section/3</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://alghareebcard.replit.app/section/4</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://alghareebcard.replit.app/section/5</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
</urlset>`;

const ROBOTS = `User-agent: *\nAllow: /\n\nSitemap: https://alghareebcard.replit.app/sitemap.xml\n`;

app.get("/sitemap.xml", (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.send(SITEMAP);
});

app.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(ROBOTS);
});

app.use("/api", router);

export default app;
