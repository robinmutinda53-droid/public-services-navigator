"use strict";

(() => {
  const launcher = document.getElementById("assistant-launcher");
  const panel = document.getElementById("assistant-panel");
  const closeButton = document.getElementById("assistant-close");
  const form = document.getElementById("assistant-form");
  const input = document.getElementById("assistant-input");
  const messages = document.getElementById("assistant-messages");
  const status = document.getElementById("assistant-status");
  const sendButton = form.querySelector("button");

  function setAssistantMode(authenticated) {
    const configured = Boolean(window.PSN_CONFIG.supabaseUrl && window.PSN_CONFIG.supabaseAnonKey);
    status.textContent = configured && authenticated
      ? "AI-powered navigation help"
      : "Quick help for using this directory";
  }

  function addMessage(text, isReply) {
    const bubble = document.createElement("p");
    bubble.className = `assistant-bubble ${isReply ? "assistant-reply" : "assistant-question"}`;
    bubble.textContent = text;
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function getLocalGuideReply(question) {
    const query = question.toLowerCase();
    if (query.includes("near") || query.includes("location") || query.includes("closest")) {
      return "Choose “Find facilities near me” in the directory and allow location access when asked. The demo shows facilities within 10 km. Or choose “Nearest first” to sort around central Nairobi without sharing your location.";
    }
    if (query.includes("filter") || query.includes("service") || query.includes("hospital")) {
      return "Use the service and facility-type menus in the Health facilities panel to narrow the list. The map updates to match. Choose Reset to clear your search and filters.";
    }
    if (query.includes("report") || query.includes("update") || query.includes("anonymous")) {
      return window.PSNAuth.isAuthenticated()
        ? "Choose a facility, service, and observation in “Share a service update.” Your email is used only to sign in and is not displayed with your report. In this demo, reports are stored only in this browser."
        : "Reports in this demo are stored only in this browser. Sign in to submit one; your email will not be shown with it. You can still browse the directory without signing in.";
    }
    if (query.includes("search") || query.includes("find")) {
      return "Type a facility name, neighbourhood, or service in the search box near the top, then choose Search. Suggestions appear as you type.";
    }
    if (query.includes("map") || query.includes("marker") || query.includes("facility")) {
      return "Select a facility card or a marker on the map to open its details. The map and facility records in this version are demonstration data for Nairobi.";
    }
    if (query.includes("dark") || query.includes("theme") || query.includes("appearance")) {
      return "Use the sun or moon button in the top bar to switch between light and dark appearance.";
    }
    return "I can help with searching facilities, filtering services, finding nearby locations, reading community updates, and using the map. What would you like help with?";
  }

  async function sendQuestion(question) {
    addMessage(question, false);
    input.value = "";
    input.disabled = true;
    sendButton.disabled = true;
    try {
      if (window.PSNAuth.isAuthenticated()) {
        const answer = await window.PSNAuth.askAssistant(question);
        addMessage(answer, true);
      } else {
        addMessage(getLocalGuideReply(question), true);
      }
    } catch (error) {
      addMessage(error.message || "The assistant could not respond. Please try again.", true);
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    launcher.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) input.focus();
  });

  closeButton.addEventListener("click", () => {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (question) sendQuestion(question);
  });

  document.querySelectorAll("[data-assistant-prompt]").forEach((button) => {
    button.addEventListener("click", () => sendQuestion(button.dataset.assistantPrompt));
  });

  window.addEventListener("psn:auth-state", (event) => {
    setAssistantMode(event.detail.authenticated);
  });
  setAssistantMode(window.PSNAuth.isAuthenticated());
})();
