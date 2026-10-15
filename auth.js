"use strict";

(() => {
  const config = window.PSN_CONFIG || {};
  const authScreen = document.getElementById("auth-screen");
  const appShell = document.getElementById("app-shell");
  const form = document.getElementById("auth-form");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const submitButton = document.getElementById("auth-submit");
  const modeButton = document.getElementById("auth-mode-toggle");
  const resetButton = document.getElementById("auth-reset");
  const guestButton = document.getElementById("guest-button");
  const message = document.getElementById("auth-message");
  const setupNote = document.getElementById("auth-setup-note");
  const authAction = document.getElementById("auth-action");
  const accountStatus = document.getElementById("account-status");

  let client = null;
  let session = null;
  let registering = false;
  let recoveryMode = false;
  let appInitialized = false;

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  function showApp() {
    authScreen.hidden = true;
    appShell.hidden = false;
    if (!appInitialized) {
      appInitialized = true;
      window.dispatchEvent(new Event("psn:app-ready"));
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  }

  function showAuth() {
    appShell.hidden = true;
    authScreen.hidden = false;
  }

  function updateAccountStatus() {
    const signedIn = Boolean(session);
    accountStatus.hidden = !signedIn;
    authAction.textContent = signedIn ? "Sign out" : "Sign in";
    window.dispatchEvent(new CustomEvent("psn:auth-state", {
      detail: { authenticated: signedIn }
    }));
  }

  function enterPasswordRecovery() {
    recoveryMode = true;
    showAuth();
    emailInput.hidden = true;
    emailInput.required = false;
    emailInput.previousElementSibling.hidden = true;
    passwordInput.previousElementSibling.textContent = "New password";
    passwordInput.autocomplete = "new-password";
    submitButton.innerHTML = 'Update password <span aria-hidden="true">→</span>';
    modeButton.hidden = true;
    resetButton.hidden = true;
    setMessage("Choose a new password for your account.");
  }

  async function initialize() {
    const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
    if (!isConfigured) {
      form.hidden = true;
      setupNote.hidden = false;
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      form.hidden = true;
      setupNote.hidden = false;
      setupNote.querySelector("strong").textContent = "Sign-in could not be initialized.";
      setupNote.querySelector("span").textContent = "The authentication library did not load. Check your internet connection and reload the page.";
      return;
    }

    try {
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      session = data.session;
      updateAccountStatus();
      if (session) showApp();

      client.auth.onAuthStateChange((event, nextSession) => {
        session = nextSession;
        updateAccountStatus();
        if (event === "PASSWORD_RECOVERY") {
          enterPasswordRecovery();
        } else if (session) {
          showApp();
        }
      });
      const recoveryParameters = new URLSearchParams(window.location.hash.slice(1));
      if (recoveryParameters.get("type") === "recovery") {
        enterPasswordRecovery();
      }
    } catch (error) {
      form.hidden = true;
      setupNote.hidden = false;
      setupNote.querySelector("strong").textContent = "Sign-in could not be initialized.";
      setupNote.querySelector("span").textContent = error.message || "Check the Supabase project URL and public anonymous key, then reload.";
    }
  }

  modeButton.addEventListener("click", () => {
    registering = !registering;
    submitButton.innerHTML = registering
      ? 'Create account <span aria-hidden="true">→</span>'
      : 'Sign in securely <span aria-hidden="true">→</span>';
    modeButton.innerHTML = registering
      ? "Already have an account? <strong>Sign in</strong>"
      : "New here? <strong>Create an account</strong>";
    passwordInput.autocomplete = registering ? "new-password" : "current-password";
    setMessage("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) {
      setMessage("Sign-in setup is not connected yet. You can still browse as a guest.", true);
      return;
    }

    submitButton.disabled = true;
    setMessage(registering ? "Creating your private account…" : "Signing you in…");
    try {
      const credentials = {
        email: emailInput.value.trim(),
        password: passwordInput.value
      };
      const { data, error } = recoveryMode
        ? await client.auth.updateUser({ password: credentials.password })
        : registering
        ? await client.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: window.location.href.split("#")[0] }
          })
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;

      if (recoveryMode) {
        recoveryMode = false;
        emailInput.hidden = false;
        emailInput.required = true;
        emailInput.previousElementSibling.hidden = false;
        passwordInput.previousElementSibling.textContent = "Password";
        modeButton.hidden = false;
        resetButton.hidden = false;
        setMessage("Your password has been updated.");
        if (session) showApp();
      } else if (data.session) {
        session = data.session;
        updateAccountStatus();
        showApp();
        setMessage("");
      } else if (registering) {
        setMessage("Account created. Check your inbox to confirm your email, then sign in.");
      } else {
        setMessage("Sign-in completed without an active session. Check your account settings and try again.", true);
      }
    } catch (error) {
      setMessage(error.message || "Sign-in failed. Check your details and try again.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  resetButton.addEventListener("click", async () => {
    if (!client) {
      setMessage("Password reset will be available after sign-in is connected.", true);
      return;
    }
    const email = emailInput.value.trim();
    if (!email) {
      setMessage("Enter your email address first so we can send a reset link.", true);
      emailInput.focus();
      return;
    }
    resetButton.disabled = true;
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href.split("#")[0]
      });
      if (error) throw error;
      setMessage("If an account exists for that email, a password reset link is on its way.");
    } catch (error) {
      setMessage(error.message || "We could not send the reset link. Please try again.", true);
    } finally {
      resetButton.disabled = false;
    }
  });

  guestButton.addEventListener("click", showApp);

  authAction.addEventListener("click", async () => {
    if (!session) {
      showAuth();
      emailInput.focus();
      return;
    }
    authAction.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      session = null;
      updateAccountStatus();
    } catch (error) {
      setMessage(error.message || "Sign-out failed. Please try again.", true);
      showAuth();
    } finally {
      authAction.disabled = false;
    }
  });

  window.PSNAuth = {
    isAuthenticated: () => Boolean(session),
    getSession: () => session,
    async askAssistant(question) {
      if (!client || !session) {
        throw new Error("Sign in to use the AI assistant.");
      }
      const { data, error } = await client.functions.invoke("psn-assistant", {
        body: { question }
      });
      if (error) throw error;
      if (!data || typeof data.answer !== "string") {
        throw new Error("The assistant returned an unexpected response.");
      }
      return data.answer;
    }
  };

  initialize();
})();
