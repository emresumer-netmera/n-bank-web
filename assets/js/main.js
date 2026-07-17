/* ==========================================================================
   N Bank – shared front-end behaviour
   Demo site: all calculations are illustrative only, no data leaves the browser.
   ========================================================================== */
(function () {
  "use strict";

  var DICT = window.NB_I18N || { tr: {}, en: {} };
  var currentLang = localStorage.getItem("nb-lang") || "tr";

  function t(key) {
    var d = DICT[currentLang] || {};
    if (key in d) return d[key];
    return (DICT.tr && DICT.tr[key]) || key;
  }

  /* Footer year -------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Mobile nav toggle ---------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      mainNav.classList.toggle("open");
      var expanded = mainNav.classList.contains("open");
      navToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { mainNav.classList.remove("open"); });
    });
  }

  /* ----------------------------------------------------------------------
     Static text translation ([data-i18n] / [data-i18n-placeholder] /
     [data-i18n-content] / [data-i18n-aria-label])
     ---------------------------------------------------------------------- */
  function applyStaticTranslations() {
    document.documentElement.setAttribute("lang", currentLang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) {
      el.setAttribute("content", t(el.getAttribute("data-i18n-content")));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });
  }

  /* Language switch (TR / EN) --------------------------------------------- */
  var langSwitch = document.querySelector("[data-lang-switch]");
  function setLangButtonsState() {
    if (!langSwitch) return;
    langSwitch.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === currentLang);
    });
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("nb-lang", lang);
    setLangButtonsState();
    applyStaticTranslations();
    renderRateSlider();
    refreshCalculator();
  }

  if (langSwitch) {
    setLangButtonsState();
    langSwitch.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLanguage(btn.getAttribute("data-lang"));
      });
    });
  }

  applyStaticTranslations();

  /* Generic tabs (data-tabs / data-tab / data-panel) --------------------- */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var buttons = group.querySelectorAll(".tab-btn");
    var panels = document.querySelectorAll('[data-panel-group="' + group.getAttribute("data-tabs") + '"] .tab-panel');
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        panels.forEach(function (p) { p.classList.remove("active"); });
        btn.classList.add("active");
        var target = document.querySelector('[data-panel="' + btn.getAttribute("data-tab") + '"]');
        if (target) target.classList.add("active");
        document.dispatchEvent(new CustomEvent("nb:tabchange", { detail: { group: group.getAttribute("data-tabs"), tab: btn.getAttribute("data-tab") } }));
      });
    });
  });

  /* ----------------------------------------------------------------------
     Exchange rate slider (mock data, auto rotating carousel)
     ---------------------------------------------------------------------- */
  var RATE_SETS = [
    [
      { code: "USD", nameKey: "rate.usd", buy: "34,18", sell: "34,26" },
      { code: "EUR", nameKey: "rate.eur", buy: "37,42", sell: "37,52" },
      { code: "GBP", nameKey: "rate.gbp", buy: "43,71", sell: "43,88" },
      { code: "GAU", nameKey: "rate.gau", buy: "3.164", sell: "3.171" }
    ],
    [
      { code: "CHF", nameKey: "rate.chf", buy: "38,64", sell: "38,79" },
      { code: "JPY", nameKey: "rate.jpy", buy: "21,92", sell: "22,03" },
      { code: "CAD", nameKey: "rate.cad", buy: "24,85", sell: "24,97" },
      { code: "XAU", nameKey: "rate.xau", buy: "2.418", sell: "2.421" }
    ]
  ];

  var sliderTrack = document.querySelector(".rate-slider-track");
  var dotsWrap = document.querySelector(".rate-dots");
  var updatedEl = document.querySelector(".rate-updated");
  var rateSlideIndex = 0;
  var rateTimer = null;

  function renderRateSlider() {
    if (!sliderTrack) return;

    sliderTrack.innerHTML = "";
    if (dotsWrap) dotsWrap.innerHTML = "";

    RATE_SETS.forEach(function (set, i) {
      var card = document.createElement("div");
      card.className = "rate-card";
      set.forEach(function (item) {
        var el = document.createElement("div");
        el.className = "rate-item";
        el.innerHTML =
          '<div class="rate-code">' + item.code + " · " + t(item.nameKey) + "</div>" +
          '<div class="rate-buy">' + t("rate.buy") + " <b>" + item.buy + "</b></div>" +
          '<div class="rate-sell">' + t("rate.sell") + " <b>" + item.sell + "</b></div>";
        card.appendChild(el);
      });
      sliderTrack.appendChild(card);

      if (dotsWrap) {
        var dot = document.createElement("button");
        dot.type = "button";
        if (i === rateSlideIndex) dot.classList.add("active");
        dot.setAttribute("aria-label", t("rate.groupAria") + " " + (i + 1));
        dot.addEventListener("click", function () { goToSlide(i); });
        dotsWrap.appendChild(dot);
      }
    });

    sliderTrack.style.transition = "none";
    sliderTrack.style.transform = "translateX(-" + rateSlideIndex * 100 + "%)";
    // eslint-disable-next-line no-unused-expressions
    sliderTrack.offsetHeight; // force reflow before re-enabling transition
    sliderTrack.style.transition = "";

    if (updatedEl) {
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, "0");
      var mm = String(now.getMinutes()).padStart(2, "0");
      updatedEl.textContent = t("rate.updatedNote").replace("{time}", hh + ":" + mm);
    }
  }

  function goToSlide(index) {
    rateSlideIndex = index;
    sliderTrack.style.transform = "translateX(-" + index * 100 + "%)";
    if (dotsWrap) {
      dotsWrap.querySelectorAll("button").forEach(function (d, i) { d.classList.toggle("active", i === index); });
    }
  }

  function nextSlide() { goToSlide((rateSlideIndex + 1) % RATE_SETS.length); }

  if (sliderTrack) {
    renderRateSlider();
    if (RATE_SETS.length > 1) {
      rateTimer = setInterval(nextSlide, 4500);
      var sliderEl = sliderTrack.closest(".rate-slider");
      sliderEl.addEventListener("mouseenter", function () { clearInterval(rateTimer); });
      sliderEl.addEventListener("mouseleave", function () { rateTimer = setInterval(nextSlide, 4500); });
    }
  }

  /* ----------------------------------------------------------------------
     Loan calculator (bireysel / konut / taşıt)
     ---------------------------------------------------------------------- */
  var LOAN_TYPES = {
    bireysel: { rate: 3.09, min: 5000, max: 300000, step: 1000, termMin: 3, termMax: 36 },
    konut: { rate: 2.79, min: 100000, max: 5000000, step: 5000, termMin: 12, termMax: 120 },
    tasit: { rate: 2.99, min: 50000, max: 2000000, step: 5000, termMin: 6, termMax: 48 }
  };

  var calc = document.querySelector("[data-calculator]");
  var activeLoanType = "bireysel";
  var applyLoanType = function () {};
  var updateResult = function () {};

  function formatNumber(n) {
    return Math.round(n).toLocaleString(currentLang === "en" ? "en-US" : "tr-TR");
  }

  function formatRate(rate) {
    if (currentLang === "en") return rate.toFixed(2) + "%";
    return "%" + rate.toFixed(2).replace(".", ",");
  }

  function monthLabel(n) {
    return n + t("calc.monthUnit");
  }

  function refreshCalculator() {
    if (!calc) return;
    applyLoanType(activeLoanType, true);
  }

  if (calc) {
    var amountInput = calc.querySelector("[data-amount]");
    var termInput = calc.querySelector("[data-term]");
    var amountLabel = calc.querySelector("[data-amount-label]");
    var termLabel = calc.querySelector("[data-term-label]");
    var amountMinLabel = calc.querySelector("[data-amount-min]");
    var amountMaxLabel = calc.querySelector("[data-amount-max]");
    var termMinLabel = calc.querySelector("[data-term-min]");
    var termMaxLabel = calc.querySelector("[data-term-max]");
    var rateLabel = calc.querySelector("[data-rate-label]");
    var installmentEl = calc.querySelector("[data-installment]");
    var totalEl = calc.querySelector("[data-total]");
    var interestEl = calc.querySelector("[data-interest]");

    applyLoanType = function (typeKey, keepValues) {
      activeLoanType = typeKey;
      var cfg = LOAN_TYPES[typeKey];
      amountInput.min = cfg.min;
      amountInput.max = cfg.max;
      amountInput.step = cfg.step;
      if (!keepValues) {
        amountInput.value = Math.round((cfg.min + cfg.max) / 4 / cfg.step) * cfg.step;
      }
      termInput.min = cfg.termMin;
      termInput.max = cfg.termMax;
      if (!keepValues) {
        termInput.value = Math.round((cfg.termMin + cfg.termMax) / 2);
      }
      if (amountMinLabel) amountMinLabel.textContent = formatNumber(cfg.min) + " TL";
      if (amountMaxLabel) amountMaxLabel.textContent = formatNumber(cfg.max) + " TL";
      if (termMinLabel) termMinLabel.textContent = monthLabel(cfg.termMin);
      if (termMaxLabel) termMaxLabel.textContent = monthLabel(cfg.termMax);
      if (rateLabel) rateLabel.textContent = formatRate(cfg.rate);
      updateResult();
    };

    updateResult = function updateResultImpl() {
      var cfg = LOAN_TYPES[activeLoanType];
      var amount = parseFloat(amountInput.value);
      var term = parseInt(termInput.value, 10);
      var monthlyRate = cfg.rate / 100;

      var installment = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term));
      var total = installment * term;
      var interest = total - amount;

      if (amountLabel) amountLabel.textContent = formatNumber(amount) + " TL";
      if (termLabel) termLabel.textContent = monthLabel(term);
      if (installmentEl) installmentEl.textContent = formatNumber(installment);
      if (totalEl) totalEl.textContent = formatNumber(total) + " TL";
      if (interestEl) interestEl.textContent = formatNumber(interest) + " TL";
    };

    var loanTypeButtons = document.querySelectorAll("[data-loan-type]");
    loanTypeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        loanTypeButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        applyLoanType(btn.getAttribute("data-loan-type"), false);
      });
    });

    amountInput.addEventListener("input", updateResult);
    termInput.addEventListener("input", updateResult);

    var initialType = "bireysel";
    var params = new URLSearchParams(window.location.search);
    if (params.get("tip") && LOAN_TYPES[params.get("tip")]) initialType = params.get("tip");

    loanTypeButtons.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-loan-type") === initialType); });
    applyLoanType(initialType, false);
  }

  /* ----------------------------------------------------------------------
     Toast notifications
     ---------------------------------------------------------------------- */
  var toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function removeToast(toast) {
    clearTimeout(toast._nbTimer);
    toast.classList.remove("show");
    setTimeout(function () { toast.remove(); }, 250);
  }

  function showToast(message, type) {
    var container = getToastContainer();
    var toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " toast-error" : "");
    toast.innerHTML = '<span class="toast-icon">' + (type === "error" ? "✕" : "✓") + '</span><span>' + message + '</span>';
    toast.addEventListener("click", function () { removeToast(toast); });
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("show"); });
    toast._nbTimer = setTimeout(function () { removeToast(toast); }, 5000);
  }

  /* ----------------------------------------------------------------------
     Demo forms (login / signup / credit card application)
     No data is transmitted anywhere — this is a front-end only prototype.
     ---------------------------------------------------------------------- */
  document.querySelectorAll("[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var key = form.getAttribute("data-success-key");
      showToast(key ? t(key) : t("form.genericSuccess"), "success");
    });
  });
})();
