import { Hono } from "hono/quick";
import { cache } from "hono/cache";
import { basicAuth } from "hono/basic-auth";
import { detectType } from "./utils";

type Bindings = {
  BUCKET: R2Bucket;
  USER: string;
  PASS: string;
};

type Data = {
  body: string;
  width?: string;
  height?: string;
};

const maxAge = 60 * 60 * 24 * 365 * 2;

const app = new Hono<{ Bindings: Bindings }>();

app.put("/upload", async (c, next) => {
  const auth = basicAuth({ username: c.env.USER, password: c.env.PASS });
  await auth(c, next);
});

app.put("/upload", async (c) => {
  const data = await c.req.json<Data>();
  const url = data.body;

  try {
    new URL(url);
  } catch (error) {
    return c.notFound();
  }

  const res = await fetch(url);
  if (!res.ok) return c.notFound();
  const arrayBuffer = await res.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const type = detectType(b64);
  if (!type) return c.notFound();

  const key = url + "." + type.suffix;

  await c.env.BUCKET.put(key, arrayBuffer, {
    httpMetadata: { contentType: type.mimeType },
  });

  return c.text(key);
});

app.get(
  "*",
  cache({
    cacheName: "r2-image-worker",
  })
);

app.get("/:key", async (c) => {
  const key = c.req.param("key");

  const object = await c.env.BUCKET.get(key);
  if (!object) return c.notFound();
  const data = await object.arrayBuffer();
  const contentType = object.httpMetadata?.contentType ?? "";

  return c.body(data, 200, {
    "Cache-Control": `public, max-age=${maxAge}`,
    "Content-Type": contentType,
  });
});

export default app;
