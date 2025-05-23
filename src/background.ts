import { sendHeartbeat } from "./plugins/wakatime/heartbeat";
import "./globals/env";

// Send requests that would otherwise be blocked by CORS if sent from a content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "send-background-heartbeat") {
    void sendHeartbeat(msg.options, sendResponse);
  }
  return true;
});

// Open /calculator when the browser action is clicked.
if (BROWSER === "chrome") {
  chrome.action.onClicked?.addListener(() => {
    void chrome.tabs.create({
      url: "https://www.desmos.com/calculator",
    });
  });
} else {
  // MV2, see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction
  chrome.browserAction.onClicked?.addListener(() => {
    void chrome.tabs.create({
      url: "https://www.desmos.com/calculator",
    });
  });
}

if (BROWSER === "firefox") {
  // Inside this block is the manifest v2 web request manipulation
  // The MV3 manipulation is done through public/chrome/net_request_rules.json
  // Description of why this works is in public/chrome/net_request_rules.md

  // Block the initial load of calculator.js in order to run a modified version later
  chrome.webRequest.onBeforeRequest.addListener(
    ({ url }) => ({
      cancel: url.endsWith(".js"),
    }),
    {
      urls: [
        "https://*.desmos.com/assets/build/calculator_desktop-*.js",
        "https://*.desmos.com/assets/build/calculator_geometry-*.js",
        "https://*.desmos.com/assets/build/calculator_3d-*.js",
        "https://*.desmos.com/assets/build/shared_calculator_desktop-*.js",
      ],
    },
    ["blocking"]
  );
  // Modify headers on all resources to enabled SharedArrayBuffer for FFmpeg
  chrome.webRequest.onHeadersReceived.addListener(
    (details) => ({
      ...details,
      responseHeaders: [
        ...(details.responseHeaders?.filter(
          ({ name }) =>
            name !== "Cross-Origin-Embedder-Policy" &&
            name !== "Cross-Origin-Opener-Policy"
        ) ?? []),
        {
          name: "Cross-Origin-Embedder-Policy",
          value: "require-corp",
        },
        {
          name: "Cross-Origin-Opener-Policy",
          value: "same-origin",
        },
      ],
    }),
    {
      urls: [
        "https://*.desmos.com/calculator*",
        "https://*.desmos.com/geometry*",
        "https://*.desmos.com/3d*",
      ],
    },
    ["blocking", "responseHeaders"]
  );
  chrome.webRequest.onHeadersReceived.addListener(
    (details) => ({
      ...details,
      responseHeaders: [
        ...(details.responseHeaders?.filter(
          ({ name }) => name !== "Cross-Origin-Resource-Policy"
        ) ?? []),
        {
          name: "Cross-Origin-Resource-Policy",
          value: "cross-origin",
        },
      ],
    }),
    {
      urls: [
        "https://saved-work.desmos.com/calc_thumbs/**/*",
        "https://saved-work.desmos.com/calc-recovery-thumbs/**/*",
        "https://saved-work.desmos.com/calc-3d-thumbs/**/*",
      ],
    },
    ["blocking", "responseHeaders"]
  );
}
