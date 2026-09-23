import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

// Every devotional, teaching, resource, and book page (including new posts
// created in the CMS) renders through layouts/post.njk, so installing the
// comment section there covers existing and future posts alike.
const layoutPath = "src/_includes/layouts/post.njk";
const partialPath = "src/_includes/partials/post-comments.njk";
const scriptSource = "assets/post-comments.js";
const scriptOutput = "src/assets/js/post-comments.js";
const stylesPath = "src/assets/css/styles.css";
const includeTag = '{% include "partials/post-comments.njk" %}';

const partial = `<section class="post-comments" id="comments" data-post-comments data-post-path="{{ page.url }}" data-post-title="{{ title }}" aria-labelledby="comments-title" aria-busy="true">
  <p class="eyebrow">Conversation</p>
  <h2 id="comments-title">Comments <span class="comment-count"></span></h2>
  <p class="comment-intro">Share a reflection, a prayer, or a question about this post. Please keep the conversation kind and encouraging.</p>
  <ol class="comment-list"></ol>
  <p class="comment-empty" hidden>No comments yet. Be the first to share a reflection.</p>
  <form class="comment-form">
    <h3>Leave a comment</h3>
    <label>Your name<input name="name" type="text" autocomplete="name" required minlength="2" maxlength="80"></label>
    <label>Your comment<textarea name="body" rows="5" required minlength="2" maxlength="2000"></textarea></label>
    <div class="comment-honeypot" aria-hidden="true"><label>Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
    <div class="comment-actions">
      <button class="button button-primary" type="submit">Post comment</button>
      <p class="comment-status" role="status" aria-live="polite"></p>
    </div>
  </form>
  <noscript><p class="comment-intro">Please enable JavaScript to read and post comments.</p></noscript>
</section>
<script src="/assets/js/post-comments.js" defer></script>
`;

const cssMarker = "/* POST COMMENTS */";
const css = `

${cssMarker}
.post-comments{grid-column:1;max-width:850px;border-top:1px solid var(--line);padding-top:2.6rem}
.post-comments h2{font-family:var(--serif);color:var(--forest);font-size:clamp(2rem,3.4vw,2.6rem);line-height:1.1;margin:.3rem 0 .6rem}
.comment-count{color:var(--muted);font-size:.6em;font-weight:400}
.comment-intro,.comment-empty{color:var(--muted);margin:0}
.comment-list{list-style:none;padding:0;margin:1.8rem 0 0;display:grid;gap:1rem}
.comment-list:empty{margin:0}
.comment-empty{margin-top:1.4rem;padding:1.2rem 1.4rem;border:1px dashed var(--line);border-radius:14px}
.comment{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:1.2rem 1.4rem}
.comment.is-new{border-color:var(--gold);box-shadow:0 0 0 3px rgba(196,154,74,.18)}
.comment-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .75rem}
.comment-meta strong{color:var(--forest)}
.comment-meta time{color:var(--muted);font-size:.85rem}
.comment-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--forest);color:white;font-family:var(--serif);font-size:1.05rem}
.comment-body{margin:.7rem 0 0;white-space:pre-line;overflow-wrap:anywhere}
.comment-form{display:grid;gap:1rem;margin-top:2rem;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:1.8rem}
.comment-form h3{font-family:var(--serif);color:var(--forest);font-size:1.45rem;margin:0}
.comment-form label{display:grid;gap:.4rem;font-weight:750}
.comment-form input,.comment-form textarea{width:100%;padding:.85rem 1rem;border:1px solid var(--line);border-radius:9px;background:white;color:var(--ink)}
.comment-form textarea{resize:vertical;min-height:130px}
.comment-form input:focus,.comment-form textarea:focus{outline:2px solid var(--gold);outline-offset:1px;border-color:var(--gold)}
.comment-honeypot{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.comment-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.8rem 1.2rem}
.comment-actions .button[disabled]{opacity:.65;cursor:wait}
.comment-status{margin:0;font-size:.92rem;color:var(--muted)}
.comment-status[data-tone=success]{color:var(--forest);font-weight:700}
.comment-status[data-tone=error]{color:var(--terracotta);font-weight:700}
@media(max-width:680px){.comment-form{padding:1.3rem}.comment{padding:1.1rem}}
`;

let layout = await readFile(layoutPath, "utf8");
if (!layout.includes(includeTag)) {
  if (!layout.includes("</aside>")) {
    throw new Error("Could not locate the post aside in the post layout to add comments.");
  }
  layout = layout.replace("</aside>", `</aside>\n    ${includeTag}`);
  await writeFile(layoutPath, layout, "utf8");
}

await mkdir("src/_includes/partials", { recursive: true });
await writeFile(partialPath, partial, "utf8");

await mkdir("src/assets/js", { recursive: true });
await copyFile(scriptSource, scriptOutput);

const styles = await readFile(stylesPath, "utf8");
if (!styles.includes(cssMarker)) {
  await writeFile(stylesPath, styles + css, "utf8");
}

console.log("Installed the comment section on every post page.");
