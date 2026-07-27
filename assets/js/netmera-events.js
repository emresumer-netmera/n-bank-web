/* ==========================================================================
   N Bank – Netmera event & user-attribute tracking
   Reference:
     https://user.netmera.com/netmera-developer-guide/platforms/web/events
     https://user.netmera.com/netmera-developer-guide/platforms/web/user-and-attributes

   IMPORTANT — every code below is now CONFIRMED directly from the Netmera
   Panel (Developers > Events > <event> > Attributes):
     Login (n:cl), Page View (n:pgv), View Product (n:vp), Register (n:rg)
     Page View: pageURL -> "ee"
     View Product: itemName -> "eb", utmSource -> "fl"
     Credit Card Application (custom, code "dgvky"): cardName -> "ea"
   ========================================================================== */
(function () {
  "use strict";

  window.netmera = window.netmera || [];
  var netmera = window.netmera;

  var EVENT_CODE = {
    LOGIN: "n:cl",              // CONFIRMED — Login
    PAGE_VIEW: "n:pgv",         // CONFIRMED — Page View
    VIEW_PRODUCT: "n:vp",       // CONFIRMED — View Product
    REGISTER: "n:rg",           // CONFIRMED — Register (Standard Events table)
    CREDIT_CARD_APPLICATION: "dgvky" // CONFIRMED — custom event created in Netmera Panel
  };

  // select.value -> canonical card name sent as the "cardName" (ea) attribute,
  // kept stable regardless of the site's current display language (TR/EN).
  var CARD_NAMES = {
    classic: "N Bank Classic",
    gold: "N Bank Gold",
    genc: "N Bank Genç"
  };

  /* ---- low-level helpers -------------------------------------------------- */
  function sendEvent(payload) {
    netmera.push(function (api) {
      api.sendEvent(payload);
    });
  }

  function getUtmSource() {
    return new URLSearchParams(window.location.search).get("utm_source") || undefined;
  }

  // "identifyUser": links the app's own user id (extid) to the Netmera profile
  // and, optionally, updates profile attributes in the same call.
  function identifyUser(extid, profile) {
    netmera.push(function (api) {
      var user = api.getUser();
      if (extid) user.setCustomId(extid);
      if (profile) {
        if (profile.name) user.setName(profile.name);
        if (profile.surname) user.setSurName(profile.surname);
        if (profile.email) user.setEmail(profile.email);
        if (profile.phone) user.setGsmNo(profile.phone);
        // gender has no dedicated setter in the Web SDK — sent as a custom
        // profile attribute (must be defined once in Netmera Panel > Developers > Profile Attributes)
        if (profile.gender) user.addProfileAttr("gender", profile.gender);
      }
      user.save().catch(function (err) {
        console.warn("Netmera user.save failed:", err);
      });
    });
  }

  /* ---- demo auth-state (front-end only, no real backend) -------------------- */
  var AUTH_KEY = "nb-auth-extid";

  function getAuthExtId() { return localStorage.getItem(AUTH_KEY); }
  function setAuthExtId(extid) { localStorage.setItem(AUTH_KEY, extid); }
  function clearAuth() { localStorage.removeItem(AUTH_KEY); }

  function applyAuthUI() {
    var authed = !!getAuthExtId();
    document.querySelectorAll("[data-login-btn]").forEach(function (el) {
      el.style.display = authed ? "none" : "";
    });
    document.querySelectorAll("[data-signup-btn]").forEach(function (el) {
      el.style.display = authed ? "none" : "";
    });
    document.querySelectorAll("[data-logout-btn]").forEach(function (el) {
      el.style.display = authed ? "" : "none";
    });
    document.querySelectorAll("[data-profile-link]").forEach(function (el) {
      el.style.display = authed ? "" : "none";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyAuthUI();

    // Guard for pages that require an authenticated demo session (e.g. profile.html)
    if (document.body.hasAttribute("data-requires-auth") && !getAuthExtId()) {
      window.location.href = "login.html";
      return;
    }

    document.querySelectorAll("[data-logout-btn]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
      });
    });

    /* ---- Page View: fires once per page load, every page -------------------- */
    sendEvent({
      code: EVENT_CODE.PAGE_VIEW,
      ee: window.location.href // pageURL attribute
    });

    /* ---- Register: signup.html form ------------------------------------------ */
    var registerForm = document.querySelector("[data-netmera-register]");
    if (registerForm) {
      registerForm.addEventListener("submit", function () {
        var extid = (document.getElementById("tckn2") || {}).value || "";
        var name = (document.getElementById("ad") || {}).value || "";
        var surname = (document.getElementById("soyad") || {}).value || "";
        var email = (document.getElementById("eposta") || {}).value || "";
        var phone = (document.getElementById("telefon") || {}).value || "";

        identifyUser(extid, { name: name, surname: surname, email: email, phone: phone });
        sendEvent({ code: EVENT_CODE.REGISTER, uid: extid });

        setAuthExtId(extid || ("demo-" + Math.random().toString(36).slice(2)));
        applyAuthUI();
      });
    }

    /* ---- Login: login.html form ---------------------------------------------- */
    var loginForm = document.querySelector("[data-netmera-login]");
    if (loginForm) {
      loginForm.addEventListener("submit", function () {
        var extid = (document.getElementById("tckn") || {}).value || "";

        identifyUser(extid);
        sendEvent({ code: EVENT_CODE.LOGIN, uid: extid });

        setAuthExtId(extid || ("demo-" + Math.random().toString(36).slice(2)));
        applyAuthUI();
      });
    }

    /* ---- View Product: credit cards (kredi-karti-basvuru.html) ---------------- */
    document.querySelectorAll("[data-product-card]").forEach(function (el) {
      var titleEl = el.querySelector("h3");
      sendEvent({
        code: EVENT_CODE.VIEW_PRODUCT,
        eb: titleEl ? titleEl.textContent : "", // itemName
        fl: getUtmSource()
      });
    });

    /* ---- View Product: investment funds (yatirim-fonlari.html) ---------------- */
    document.querySelectorAll("[data-product-fund]").forEach(function (el) {
      var titleEl = el.querySelector("h3");
      sendEvent({
        code: EVENT_CODE.VIEW_PRODUCT,
        eb: titleEl ? titleEl.textContent : "", // itemName
        fl: getUtmSource()
      });
    });

    /* ---- View Product: loan type selection (kredi-hesaplama.html only) -------- */
    var loanCalcTracked = document.querySelector("[data-vp-track]");
    if (loanCalcTracked) {
      var loanButtons = document.querySelectorAll("[data-loan-type]");
      var fireLoanProductView = function (btn) {
        sendEvent({
          code: EVENT_CODE.VIEW_PRODUCT,
          eb: btn.textContent, // itemName
          fl: getUtmSource()
        });
      };
      loanButtons.forEach(function (btn) {
        btn.addEventListener("click", function () { fireLoanProductView(btn); });
      });
      var initialLoanBtn = document.querySelector("[data-loan-type].active") || loanButtons[0];
      if (initialLoanBtn) fireLoanProductView(initialLoanBtn);
    }

    /* ---- Custom event: Credit Card Application submit (kredi-karti-basvuru.html) */
    var cardApplyForm = document.querySelector("[data-netmera-card-apply]");
    if (cardApplyForm) {
      cardApplyForm.addEventListener("submit", function () {
        var select = document.getElementById("kart-secimi");
        var cardValue = select ? select.value : "";
        sendEvent({
          code: EVENT_CODE.CREDIT_CARD_APPLICATION,
          ea: CARD_NAMES[cardValue] || cardValue
        });
      });
    }

    /* ---- Profile save: profile.html form --------------------------------------- */
    var profileForm = document.querySelector("[data-netmera-profile]");
    if (profileForm) {
      profileForm.addEventListener("submit", function () {
        var extid = getAuthExtId();
        var name = (document.getElementById("pf-ad") || {}).value || "";
        var surname = (document.getElementById("pf-soyad") || {}).value || "";
        var gender = (document.getElementById("pf-cinsiyet") || {}).value || "";
        var email = (document.getElementById("pf-eposta") || {}).value || "";
        var phone = (document.getElementById("pf-telefon") || {}).value || "";

        identifyUser(extid, { name: name, surname: surname, email: email, phone: phone, gender: gender });
      });
    }
  });
})();
