import { DateTime } from "luxon";
import { PostHog } from "posthog-node";

const POSTHOG_TOKEN = process.env.POSTHOG_PROJECT_TOKEN || "phc_tdHrDUPYPtpqecRUdetv4epsUFDxzxvZxi8HAzjbwngk";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("MMMM d, yyyy");
  });
  eleventyConfig.addFilter("htmlDateString", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });
  eleventyConfig.addFilter("limit", (arr, limit) => (arr || []).slice(0, limit));
  eleventyConfig.addFilter("where", (arr, key, value) => (arr || []).filter(item => item.data?.[key] === value));
  eleventyConfig.addFilter("jsonify", value => JSON.stringify(value));

  eleventyConfig.addCollection("devotionals", api => api.getFilteredByGlob("src/devotionals/*.md").reverse());
  eleventyConfig.addCollection("teachings", api => api.getFilteredByGlob("src/teachings/*.md").reverse());
  eleventyConfig.addCollection("books", api => api.getFilteredByGlob("src/books/*.md"));
  eleventyConfig.addCollection("resources", api => api.getFilteredByGlob("src/resources/*.md").reverse());

  // Inject PostHog snippet and client-side analytics into every built HTML page.
  // Uses a transform so this survives the `prepare-site` step that wipes src/.
  eleventyConfig.addTransform("posthog-inject", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;

    const initSnippet = `<script>
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="init be sr me ws ys ws_auth_url capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty toString opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_of_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${POSTHOG_TOKEN}', { api_host: '${POSTHOG_HOST}', person_profiles: 'identified_only' });
</script>`;

    const analyticsScript = `<script>
document.addEventListener('DOMContentLoaded', function () {
  if (typeof posthog === 'undefined') return;

  // Newsletter form submission
  document.querySelectorAll('form[data-netlify]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var emailInput = form.querySelector('input[type="email"]');
      var email = emailInput ? emailInput.value.trim() : null;
      if (email) {
        posthog.identify(email, { email: email });
      }
      posthog.capture('newsletter subscribed', {
        form_name: form.getAttribute('name') || 'unknown',
        source: window.location.pathname,
      });
    });
  });

  // CTA button clicks
  document.querySelectorAll('a.button-primary, button.button-primary').forEach(function (btn) {
    btn.addEventListener('click', function () {
      posthog.capture('cta clicked', {
        text: btn.textContent.trim(),
        href: btn.getAttribute('href') || null,
        source: window.location.pathname,
      });
    });
  });

  // Resource download/access clicks
  document.querySelectorAll('a[href$=".pdf"], a[href*="/resources/"]').forEach(function (link) {
    link.addEventListener('click', function () {
      posthog.capture('resource downloaded', {
        resource_url: link.getAttribute('href'),
        resource_title: link.textContent.trim(),
        source: window.location.pathname,
      });
    });
  });
});
</script>`;

    content = content.replace("</head>", initSnippet + "\n</head>");
    content = content.replace("</body>", analyticsScript + "\n</body>");
    return content;
  });

  // Track build completion via posthog-node (server-side).
  eleventyConfig.on("eleventy.after", async ({ results, runMode }) => {
    const posthog = new PostHog(POSTHOG_TOKEN, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
    posthog.capture({
      distinctId: "build-system",
      event: "site build completed",
      properties: {
        total_pages: results.length,
        run_mode: runMode,
      },
    });
    await posthog.shutdown();
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
