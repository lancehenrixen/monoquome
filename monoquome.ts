import * as sharp from "sharp";
import { promisify } from "util";
const nearestColor = require("nearest-color");
const getPixels = promisify(require("get-pixels"));
const rgbHex = require("rgb-hex");

type White = "WHITE";
type Black = "BLACK";
type Color = White | Black;
type Chunk = [[Color, Color], [Color, Color]];

const W: White = "WHITE";
const B: Black = "BLACK";

const nearest = nearestColor.from({ [W]: "#ffffff", [B]: "#000000" });

export async function monoquome(buffer: Buffer): Promise<string[]> {
  const image = await sharp(buffer).flatten().toFormat("png").toBuffer();
  let pixels = await getPixels(image, "image/png");
  if (pixels.shape.length === 4) {
    pixels = pixels.pick(0, null, null, null);
  }
  const lines: string[] = [];
  for (const range of getChunks(pixels)) {
    let line = "";
    for (const chunk of range) {
      line += getChar(chunk);
    }
    lines.push(line.trimRight());
  }
  return lines;
}

const CHARS: [string, Chunk][] = [
  ["▘",   [[W, B], [B, B]]],
  ["▖",   [[B, W], [B, B]]],
  ["▗",   [[B, B], [B, W]]],
  ["▝",   [[B, B], [W, B]]],
  ["▌",   [[W, W], [B, B]]],
  ["▚",   [[W, B], [B, W]]],
  ["▞",   [[B, W], [W, B]]],
  ["▐",   [[B, B], [W, W]]],
  [" ",   [[B, B], [B, B]]],
  ["█",   [[W, W], [W, W]]],
  ["▙",   [[W, W], [B, W]]],
  ["▟",   [[B, W], [W, W]]],
  ["▛",   [[W, W], [W, B]]],
  ["▜",   [[W, B], [W, W]]],
  ["▀",   [[W, B], [W, B]]],
  ["▄",   [[B, W], [B, W]]],
];

function getChar([[c1, c2], [c3, c4]]: Chunk) {
  return CHARS.find(([char, [[p1, p2], [p3, p4]]]) =>
       c1 === p1
    && c2 === p2
    && c3 === p3
    && c4 === p4)![0];
}

function* getChunks(pixels: any) {
  const [width, height] = pixels.shape;
  for (let y = 0; y < height; y += 2) {
    const range: Chunk[] = [];
    for (let x = 0; x < width; x += 2) {
      const leftTop = getColor(x, y);
      const hasBottom = y < height - 1;
      const leftBottom = hasBottom ? getColor(x, y + 1) : B;
      const hasRight = x < width - 1;
      const rightTop = hasRight ? getColor(x + 1, y) : B;
      const rightBottom = hasRight && hasBottom ? getColor(x + 1, y + 1) : B;
      range.push([[leftTop, leftBottom], [rightTop, rightBottom]]);
    }
    yield range;
  }

  function getColor(x: number, y: number): Color {
    const r = pixels.get(x, y, 0);
    const g = pixels.get(x, y, 1);
    const b = pixels.get(x, y, 2);
    return nearest("#" + rgbHex(r, g, b)).name;
  }
}
