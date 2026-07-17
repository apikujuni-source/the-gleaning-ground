import { DateTime } from "luxon";

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
