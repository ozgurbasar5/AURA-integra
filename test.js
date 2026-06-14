const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf-8");
const script = fs.readFileSync("script.js", "utf-8");

const dom = new JSDOM(html, { runScripts: "dangerously" });

// Mock IntersectionObserver
dom.window.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

dom.window.lucide = {
    createIcons: () => console.log("lucide initialized")
};

try {
    dom.window.eval(script);
    
    // simulate DOMContentLoaded
    const event = dom.window.document.createEvent('Event');
    event.initEvent('DOMContentLoaded', true, true);
    dom.window.document.dispatchEvent(event);
    
    console.log("Script executed without throwing errors.");
} catch (e) {
    console.error("Error executing script:", e);
}
