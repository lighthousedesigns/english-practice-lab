const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "docs", "index.html"), "utf8");
const elementIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
}

class FakeElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.hidden = false;
    this.textContent = "";
    this.value = "";
    this.className = "";
    this.children = [];
    this.attributes = Object.create(null);
    this.listeners = Object.create(null);
    this.classList = new FakeClassList();
    this.href = "";
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  focus() {}
  reportValidity() { return true; }
}

function createStorage(sharedValues = new Map()) {
  return {
    values: sharedValues,
    getItem(key) { return sharedValues.has(key) ? sharedValues.get(key) : null; },
    setItem(key, value) { sharedValues.set(key, String(value)); },
    removeItem(key) { sharedValues.delete(key); },
  };
}

function boot(search, options = {}) {
  const elements = Object.fromEntries(elementIds.map((id) => [id, new FakeElement("div", id)]));
  elements["start-form"].tagName = "FORM";
  elements["submit-results"].tagName = "A";
  const documentListeners = Object.create(null);
  const intervalCallbacks = new Map();
  let nextIntervalId = 1;
  const clock = options.clock || { now: 1_000_000 };
  const storage = createStorage(options.storageValues);

  class FakeDate extends Date {
    static now() { return clock.now; }
  }

  const document = {
    getElementById(id) { return elements[id]; },
    createElement(tagName) { return new FakeElement(tagName); },
    addEventListener(type, listener) { documentListeners[type] = listener; },
  };
  const window = {
    location: { search, pathname: "/index.html" },
    history: { replaceState() {} },
    sessionStorage: storage,
    crypto: require("node:crypto").webcrypto,
    confirm: () => true,
    print() {},
    setInterval(callback) {
      const id = nextIntervalId++;
      intervalCallbacks.set(id, callback);
      return id;
    },
    clearInterval(id) { intervalCallbacks.delete(id); },
  };
  const context = vm.createContext({
    console,
    Date: FakeDate,
    document,
    window,
    URL,
    URLSearchParams,
    Uint32Array,
  });

  for (const filename of ["config.js", "practice-library.js", "app.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(root, "docs", filename), "utf8"),
      context,
      { filename },
    );
  }

  return { clock, elements, intervalCallbacks, storageValues: storage.values };
}

function submitStart(runtime) {
  runtime.elements["first-name"].value = "Test";
  runtime.elements["last-name"].value = "Student";
  runtime.elements["class-period"].value = "2";
  runtime.elements["start-form"].listeners.submit({ preventDefault() {} });
}

for (const sessionId of ["independent-or-dependent", "types-of-sentences"]) {
  const runtime = boot("?session=" + sessionId);
  assert.equal(runtime.elements["start-screen"].hidden, false, sessionId + " should open its start screen");
  assert.notEqual(runtime.elements["session-title"].textContent, "");
}

const invalid = boot("?session=does-not-exist");
assert.equal(invalid.elements["error-screen"].hidden, false);
assert.equal(invalid.elements["error-heading"].textContent, "Activity not found");

const feedback = boot("?session=types-of-sentences");
submitStart(feedback);
const answer = feedback.elements["answer-grid"].children[0];
answer.listeners.click({ currentTarget: answer });
assert.equal(feedback.elements.feedback.hidden, false);
assert.notEqual(feedback.elements["feedback-explanation"].textContent, "");
assert.equal(feedback.elements["attempted-count"].textContent, "1");

const recovered = boot("?session=types-of-sentences", {
  clock: feedback.clock,
  storageValues: feedback.storageValues,
});
assert.equal(recovered.elements["practice-screen"].hidden, false);
assert.equal(recovered.elements.feedback.hidden, false);
assert.equal(recovered.elements["attempted-count"].textContent, "1");

const expired = boot("?session=independent-or-dependent");
submitStart(expired);
expired.clock.now += 10 * 60 * 1000 + 1;
for (const callback of [...expired.intervalCallbacks.values()]) callback();
assert.equal(expired.elements["results-screen"].hidden, false);
assert.equal(expired.elements["result-score"].textContent, "0 / 0");
const formUrl = new URL(expired.elements["submit-results"].href);
assert.equal(formUrl.hostname, "docs.google.com");
assert.equal(formUrl.searchParams.get("entry.1086419845"), "Independent or Dependent?");
assert.equal(formUrl.searchParams.get("entry.1018386785"), "Period 2");
assert.equal(formUrl.searchParams.get("entry.1542252984"), "0");

console.log("Runtime smoke tests passed for direct links, feedback, recovery, timeout, score, and Form prefilling.");
