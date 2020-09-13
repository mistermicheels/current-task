const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownTocDoneRight = require("markdown-it-toc-done-right");

module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy("css");
    eleventyConfig.addPassthroughCopy("img");

    const markdownLib = markdownIt({ html: true, typographer: true })
        .use(markdownItAnchor, { permalink: false })
        .use(markdownTocDoneRight, {
            placeholder: "TOC_PLACEHOLDER",
            listType: "ul",
            level: [2, 3, 4, 5], // only include subheadings, which in practice means subheadings within Documentation
        });

    eleventyConfig.setLibrary("md", markdownLib);
};
