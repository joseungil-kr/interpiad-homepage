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

function initContactForm() {
  var form = document.getElementById("contact-form");
  if (!form) return;
  var note = document.getElementById("contact-form-note");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = new FormData(form);
    var name = data.get("name");
    var phone = data.get("phone");
    var interest = data.get("interest");
    var message = data.get("message");
    var to = form.dataset.to;

    var subject = "[상담 문의] " + name + "님";
    var body =
      "이름: " + name + "\n" +
      "연락처: " + phone + "\n" +
      "관심 서비스: " + interest + "\n\n" +
      "문의내용:\n" + message;

    var mailto = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

    if (note) note.textContent = "메일 작성 화면으로 이동합니다.";
    window.location.href = mailto;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initHeader();
  initNavToggle();
  initHero();
  initContactForm();
});
