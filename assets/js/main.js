function initHeader() {
  var header = document.getElementById("site-header");
  if (!header) return;
  var onScroll = function () {
    if (window.scrollY > 8) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initNavToggle() {
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initNavDropdowns() {
  var dropdowns = document.querySelectorAll(".nav-dropdown");
  if (!dropdowns.length) return;

  document.addEventListener("click", function (e) {
    dropdowns.forEach(function (d) {
      if (d.open && !d.contains(e.target)) d.removeAttribute("open");
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      dropdowns.forEach(function (d) { d.removeAttribute("open"); });
    }
  });

  dropdowns.forEach(function (d) {
    d.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { d.removeAttribute("open"); });
    });
  });
}

function typeText(el, text, speed, onDone) {
  var i = 0;
  el.textContent = "";
  var timer = setInterval(function () {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) {
      clearInterval(timer);
      if (onDone) onDone();
    }
  }, speed);
}

function animateReorder(list, brandItem) {
  var items = Array.from(list.children);
  var firstRects = new Map(items.map(function (el) { return [el, el.getBoundingClientRect()]; }));

  list.prepend(brandItem);
  Array.from(list.children).forEach(function (el, i) {
    var num = el.querySelector(".rank-item__num");
    if (num) num.textContent = String(i + 1);
  });

  Array.from(list.children).forEach(function (el) {
    var first = firstRects.get(el);
    if (!first) return;
    var last = el.getBoundingClientRect();
    var deltaY = first.top - last.top;
    if (!deltaY) return;

    el.style.transition = "none";
    el.style.transform = "translateY(" + deltaY + "px)";

    requestAnimationFrame(function () {
      el.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
      requestAnimationFrame(function () {
        el.style.transform = "";
      });
    });
  });

  brandItem.addEventListener("transitionend", function handler(e) {
    if (e.propertyName === "transform") {
      brandItem.classList.add("is-leading");
      brandItem.removeEventListener("transitionend", handler);
    }
  });
}

function initHero() {
  var demo = document.getElementById("hero-demo");
  var list = document.getElementById("rank-list");
  var typedEl = document.getElementById("search-typed");
  var cursorEl = document.getElementById("search-cursor");
  if (!demo || !list || !typedEl) return;

  var query = list.dataset.query || "";
  var brandItem = list.querySelector(".rank-item--brand");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var finalizeInstant = function () {
    typedEl.textContent = query;
    if (cursorEl) cursorEl.classList.add("is-done");
    if (brandItem && list.firstElementChild !== brandItem) {
      list.prepend(brandItem);
      Array.from(list.children).forEach(function (el, i) {
        var num = el.querySelector(".rank-item__num");
        if (num) num.textContent = String(i + 1);
      });
    }
    if (brandItem) brandItem.classList.add("is-leading");
  };

  if (reduceMotion) {
    finalizeInstant();
    return;
  }

  var played = false;
  var play = function () {
    if (played) return;
    played = true;
    typeText(typedEl, query, 110, function () {
      if (cursorEl) cursorEl.classList.add("is-done");
      setTimeout(function () {
        if (brandItem) animateReorder(list, brandItem);
      }, 500);
    });
  };

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            play();
            io.unobserve(demo);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(demo);
  } else {
    play();
  }
}

function animateCount(el, target, duration) {
  var start = performance.now();
  var tick = function (now) {
    var progress = Math.min((now - start) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString("ko-KR");
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initReveal() {
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var reveal = function (el) {
    el.classList.add("is-visible");
    el.querySelectorAll("[data-count-to]").forEach(function (counter) {
      var target = parseInt(counter.dataset.countTo, 10);
      if (isNaN(target)) return;
      if (reduceMotion) {
        counter.textContent = target.toLocaleString("ko-KR");
      } else {
        animateCount(counter, target, 1100);
      }
    });
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach(reveal);
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach(function (el) { io.observe(el); });
}

function initContactLinks() {
  var tel = document.querySelector(".js-tel");
  if (tel) {
    var phone = tel.dataset.p3 + "-" + tel.dataset.p2 + "-" + tel.dataset.p1;
    tel.textContent = phone;
    tel.href = "tel:" + phone.replace(/-/g, "");
  }

  var mail = document.querySelector(".js-mail");
  if (mail) {
    var email = mail.dataset.u + "@" + mail.dataset.d;
    mail.textContent = email;
    mail.href = "mailto:" + email;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initHeader();
  initNavToggle();
  initNavDropdowns();
  initHero();
  initReveal();
  initContactLinks();
});
