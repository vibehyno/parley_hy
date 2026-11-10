import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// One startup snapshot. Versioned asset URLs prevent an older page that is
// still loading during a restart from receiving a different script or style.
export function snapshotClientAssets(directory) {
  const template = fs.readFileSync(path.join(directory, "index.html"), "utf8");
  const assets = new Map();
  for (const [name, type] of [["styles.css", "text/css"], ["theme.js", "text/javascript"], ["i18n.js", "text/javascript"], ["skill-autocomplete.js", "text/javascript"], ["composer-adjustment.js", "text/javascript"], ["seat-errors.js", "text/javascript"], ["panel-preview.js", "text/javascript"], ["work-panel.js", "text/javascript"], ["shared-browser.js", "text/javascript"], ["app.js", "text/javascript"]]) {
    if (template.includes(`/ui/${name}`)) assets.set(`/ui/${name}`, {
      body: fs.readFileSync(path.join(directory, name)), type: `${type}; charset=utf-8`,
    });
  }
  for (const fontName of ["fonts/PretendardVariable.woff2", "fonts/SUIT-Variable.woff2", "fonts/NanumSquareRoundR.woff", "fonts/NanumSquareRoundB.woff"]) {
  if (fs.existsSync(path.join(directory, fontName))) assets.set(`/ui/${fontName}`, {
    body: fs.readFileSync(path.join(directory, fontName)), type: fontName.endsWith("woff2") ? "font/woff2" : "font/woff",
  });
  }
  const hash = crypto.createHash("sha256").update(template);
  for (const [name, asset] of assets) hash.update(name).update(asset.body);
  const version = hash.digest("hex").slice(0, 20);
  const stylesheet = assets.get("/ui/styles.css");
  if (stylesheet) stylesheet.body = Buffer.from(stylesheet.body.toString("utf8").replaceAll("__PARLEY_ASSET_VERSION__", version));
  return { html: template.replaceAll("__PARLEY_ASSET_VERSION__", version), version, assets };
}
