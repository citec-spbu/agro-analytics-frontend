import { createApp, h, reactive } from "vue";

import AnalyticsPage from "./AnalyticsPage.vue";
import {
  SHELL_EVENT_TARGET,
  MF_EVENT_TARGET,
  ShellToMfEvent,
  MfToShellEvent,
} from "./eventBusContract.js";

const TAG_NAME = "agro-analytics-mf";

function toBoolean(value) {
  return value === "true" || value === "1";
}

class AgroAnalyticsMicrofrontendElement extends HTMLElement {
  static get observedAttributes() {
    return ["api-base", "authorization", "dark", "mf-id", "mf-version"];
  }

  constructor() {
    super();
    this._mounted = false;
    this._container = null;
    this._app = null;
    this._state = reactive({
      apiBase: "",
      authorization: "",
      dark: false,
      mfId: "analytics",
      mfVersion: "",
    });
    this._onEventBus = this._onEventBus.bind(this);
  }

  connectedCallback() {
    if (this._mounted) {
      return;
    }

    this._syncAttributesToState();
    this._container = document.createElement("div");
    this.appendChild(this._container);

    this._app = createApp({
      render: () =>
        h(AnalyticsPage, {
          apiBase: this._state.apiBase,
          authorization: this._state.authorization,
          dark: this._state.dark,
        }),
    });
    this._app.mount(this._container);
    this._mounted = true;
    window.addEventListener("agro:event-bus", this._onEventBus);
    this._emitReady();
  }

  disconnectedCallback() {
    if (!this._mounted) {
      return;
    }
    this._app?.unmount();
    this._app = null;
    this._container?.remove();
    this._container = null;
    this._mounted = false;
    window.removeEventListener("agro:event-bus", this._onEventBus);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    this._applyAttribute(name, newValue);
  }

  _syncAttributesToState() {
    this._applyAttribute("api-base", this.getAttribute("api-base"));
    this._applyAttribute("authorization", this.getAttribute("authorization"));
    this._applyAttribute("dark", this.getAttribute("dark"));
    this._applyAttribute("mf-id", this.getAttribute("mf-id"));
    this._applyAttribute("mf-version", this.getAttribute("mf-version"));
  }

  _applyAttribute(name, value) {
    if (name === "api-base") {
      this._state.apiBase = value || "";
      return;
    }
    if (name === "authorization") {
      this._state.authorization = value || "";
      return;
    }
    if (name === "dark") {
      this._state.dark = toBoolean(value || "");
      return;
    }
    if (name === "mf-id") {
      this._state.mfId = value || "analytics";
      return;
    }
    if (name === "mf-version") {
      this._state.mfVersion = value || "";
    }
  }

  _onEventBus(event) {
    const detail = event?.detail;
    if (!detail) return;
    if (detail.target !== MF_EVENT_TARGET) return;
    if (detail.mfId !== this._state.mfId) return;
    if (detail.type !== ShellToMfEvent.CONTEXT) return;
    this._applyShellContext(detail.payload || {});
  }

  _emitShellEvent(type, payload = {}) {
    window.dispatchEvent(
      new CustomEvent("agro:event-bus", {
        detail: {
          target: SHELL_EVENT_TARGET,
          type,
          mfId: this._state.mfId,
          timestamp: Date.now(),
          payload,
        },
      })
    );
  }

  _applyShellContext(payload) {
    this._state.apiBase = payload.apiBase || "";
    this._state.authorization = payload.authorization || "";
    this._state.dark = Boolean(payload.dark);
  }

  _emitReady() {
    this._emitShellEvent(MfToShellEvent.READY, {
      version: this._state.mfVersion || "",
    });
  }

  emitMfError(message) {
    this._emitShellEvent(MfToShellEvent.ERROR, {
      message: message || "Unknown analytics microfrontend error",
    });
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, AgroAnalyticsMicrofrontendElement);
}
