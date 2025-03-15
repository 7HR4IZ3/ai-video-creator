// @ts-nocheck

import dom from "../libs/etro/polyfill/dom";
import { Movie } from "../libs/etro/movie";
import { Visual } from "../libs/etro/layer/visual";
import { writeFile } from "fs/promises";

const canvas = dom.window.createCanvas();
new Movie({ canvas })
  .addLayer(
    new Visual({
      startTime: 0,
      duration: 4,
      background: "red",
    })
  )
  .addLayer(
    new Visual({
      startTime: 1,
      duration: 2,
      background: "#0000ff80",
      border: { color: "#00f", thickness: 4 },
      width: 500,
      height: 200,
      x: 50,
      y: 20,
    })
  )
  .record({ frameRate: 25 })
  .then((blob) => {
    writeFile("./media/outputs/test.mp4", blob, { encoding: "binary" });
  })
  .catch((error) => {
    throw error;
  });
