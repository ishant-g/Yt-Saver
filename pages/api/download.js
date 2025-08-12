// pages/api/download.js
import { exec } from "youtube-dl-exec";
import isUrl from "is-url";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const { url } = req.body || {};
  if (!url || !isUrl(url)) {
    return res.status(400).send("Invalid or missing URL.");
  }

  // SECURITY / LEGAL REMINDER (also returned)
  // The app must be used responsibly. Only download videos you have the right to.
  try {
    // We request the best mp4 combination available.
    // `-f` requests format: bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4
    // `-o -` outputs to stdout; we'll stream that to the client.
    // Note: Large files may hit serverless limits on Vercel. See README.
    res.setHeader("Content-Type", "video/mp4");

    // We try to set a filename via content-disposition later, but we need metadata first.
    // Get metadata (title)
    const info = await exec(
      url,
      {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        preferFreeFormats: true,
      },
      { stdio: ["ignore", "pipe", "inherit"] }
    );

    const title = info?.title ? info.title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "") : "video";
    const filename = `${title}.mp4`;
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

    // Now spawn actual download streaming to stdout
    // Note: youtube-dl-exec returns a Promise but also supports piping child process stdout.
    // We'll run a new exec that writes to stdout, and pipe it to the response.
    const child = exec(
      url,
      {
        // format: try to combine best mp4 video + best m4a audio, fallback to mp4
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        mergeOutputFormat: "mp4",
        // output to stdout
        output: "-",
        limitRate: "0", // do not rate-limit
        noWarnings: true,
        preferFreeFormats: true,
      },
      { stdio: ["ignore", "pipe", "pipe"] } // stdout is a stream
    );

    // pipe stdout directly
    child.stdout.pipe(res);

    child.on("error", (err) => {
      console.error("yt-dlp error:", err);
      if (!res.headersSent) res.status(500).send("Download failed.");
    });

    child.on("close", (code) => {
      if (!res.writableEnded) res.end();
      if (code !== 0) {
        console.warn("yt-dlp exit code:", code);
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error: " + (err.message || "unknown"));
  }
}
