/*!
 * RIDE X HUB — Analytics & Consent
 * -------------------------------------------------------------
 * PostHog (EU cloud) instrumentation for ridexhub.com
 *
 * Consent model (business decision):
 *   - A banner is shown on first visit.
 *   - Collection STARTS BY DEFAULT if the visitor does not respond.
 *   - If the visitor declines, or disables an individual category,
 *     that choice is stored and always wins on later visits.
 *
 * Privacy:
 *   - Session replay is enabled, but everything the visitor TYPES
 *     is masked before it ever leaves the browser.
 *   - No email/phone/name values are sent as event properties.
 * -------------------------------------------------------------
 */
(function () {
  'use strict';

  var POSTHOG_KEY = 'phc_ozAUxvvinFwQhnkretwrDyCyYfsopWSTbVtAj5QG3XPj';
  var POSTHOG_HOST = 'https://eu.i.posthog.com';
  var CONSENT_KEY = 'rxh_consent_v1';
  var SITE_HOST = 'ridexhub.com';

  /* ============================================================
   * 1. CONSENT STORAGE
   * ========================================================== */

  // No stored choice => everything on (opt-out model).
  function defaultConsent() {
    return { analytics: true, replay: true, decided: false };
  }

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(CONSENT_KEY);
      if (!raw) return defaultConsent();
      var parsed = JSON.parse(raw);
      return {
        analytics: parsed.analytics !== false,
        replay: parsed.replay !== false,
        decided: parsed.decided === true
      };
    } catch (e) {
      return defaultConsent();
    }
  }

  function writeConsent(c) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
        analytics: !!c.analytics,
        replay: !!c.replay,
        decided: true,
        ts: new Date().toISOString()
      }));
    } catch (e) { /* storage blocked — session-only tracking */ }
  }

  var consent = readConsent();

  /* ============================================================
   * 2. POSTHOG LOADER (official snippet)
   * ========================================================== */

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording session_recording_started captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,          // powers rage-click / dead-click detection
    capture_exceptions: true,   // JS errors -> PostHog Error Tracking
    disable_session_recording: !consent.replay,
    opt_out_capturing_by_default: false,
    session_recording: {
      // Record the full session, but never the characters people type.
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
        tel: true,
        text: true,
        textarea: true,
        search: true,
        number: true,
        date: true,
        select: false // keep dropdown choices (service type, duration) — not personal
      }
    },
    loaded: function (ph) {
      if (!consent.analytics) ph.opt_out_capturing();
    }
  });

  var ph = window.posthog;

  function track(name, props) {
    try {
      if (!consent.analytics) return;
      ph.capture(name, props || {});
    } catch (e) { /* never let analytics break the page */ }
  }

  // Expose a tiny helper so the consent link in the footer can reopen the banner.
  window.rxhAnalytics = {
    track: track,
    openConsent: function () { showBanner(true); }
  };

  /* ============================================================
   * 3. CONSENT BANNER UI
   * ========================================================== */

  function injectStyles() {
    if (document.getElementById('rxh-consent-styles')) return;
    var css = ''
      + '#rxh-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;'
      + 'background:#fff;border-top:3px solid #f97316;box-shadow:0 -6px 24px rgba(15,23,42,.14);'
      + 'font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111827;'
      + 'transform:translateY(100%);transition:transform .35s cubic-bezier(.2,.9,.3,1)}'
      + '#rxh-consent.rxh-show{transform:translateY(0)}'
      + '#rxh-consent .rxh-inner{max-width:1100px;margin:0 auto;padding:16px 20px;'
      + 'display:flex;gap:16px;align-items:center;flex-wrap:wrap}'
      + '#rxh-consent .rxh-text{flex:1 1 420px;min-width:260px;font-size:13.5px;line-height:1.55;color:#374151}'
      + '#rxh-consent .rxh-text strong{display:block;font-family:Poppins,Inter,sans-serif;'
      + 'font-size:15px;color:#111827;margin-bottom:3px}'
      + '#rxh-consent .rxh-text a{color:#0f766e;text-decoration:underline}'
      + '#rxh-consent .rxh-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
      + '#rxh-consent button{font:inherit;font-size:13px;font-weight:600;border-radius:10px;'
      + 'padding:9px 16px;cursor:pointer;border:1px solid transparent;transition:.15s}'
      + '#rxh-consent .rxh-accept{background:#f97316;color:#fff}'
      + '#rxh-consent .rxh-accept:hover{background:#dc6b12}'
      + '#rxh-consent .rxh-decline{background:#fff;color:#374151;border-color:#d1d5db}'
      + '#rxh-consent .rxh-decline:hover{background:#f9fafb}'
      + '#rxh-consent .rxh-custom{background:transparent;color:#6b7280;'
      + 'text-decoration:underline;padding:9px 6px}'
      + '#rxh-consent .rxh-custom:hover{color:#111827}'
      + '#rxh-consent .rxh-prefs{flex:1 1 100%;border-top:1px solid #e5e7eb;margin-top:4px;'
      + 'padding-top:12px;display:none;gap:22px;flex-wrap:wrap}'
      + '#rxh-consent .rxh-prefs.rxh-open{display:flex}'
      + '#rxh-consent .rxh-opt{display:flex;gap:9px;align-items:flex-start;font-size:13px;'
      + 'color:#374151;max-width:430px}'
      + '#rxh-consent .rxh-opt input{margin-top:3px;width:16px;height:16px;accent-color:#f97316;flex:none}'
      + '#rxh-consent .rxh-opt span b{display:block;color:#111827;font-weight:600}'
      + '@media(max-width:640px){#rxh-consent .rxh-inner{padding:14px 16px;gap:12px}'
      + '#rxh-consent .rxh-actions{width:100%}'
      + '#rxh-consent .rxh-actions button{flex:1 1 auto}}';
    var s = document.createElement('style');
    s.id = 'rxh-consent-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  function showBanner(force) {
    if (!force && consent.decided) return;
    if (document.getElementById('rxh-consent')) return;
    injectStyles();

    var el = document.createElement('div');
    el.id = 'rxh-consent';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Privacy preferences');
    el.innerHTML = ''
      + '<div class="rxh-inner">'
      + '  <div class="rxh-text"><strong>We use analytics to improve your ride</strong>'
      + '  We measure how visitors use this site so we can fix problems and improve booking. '
      + '  Anything you type is hidden from our recordings. '
      + '  See our <a href="/legal.html">Privacy Policy</a>.</div>'
      + '  <div class="rxh-actions">'
      + '    <button type="button" class="rxh-custom" data-rxh="toggle">Customize</button>'
      + '    <button type="button" class="rxh-decline" data-rxh="decline">Decline all</button>'
      + '    <button type="button" class="rxh-accept" data-rxh="accept">Accept</button>'
      + '  </div>'
      + '  <div class="rxh-prefs">'
      + '    <label class="rxh-opt"><input type="checkbox" data-rxh-opt="analytics">'
      + '      <span><b>Usage analytics</b>Which pages and vehicles people view, so we know what to improve.</span></label>'
      + '    <label class="rxh-opt"><input type="checkbox" data-rxh-opt="replay">'
      + '      <span><b>Session recording</b>An anonymised replay of clicks and scrolling to help us find bugs. Typed text is always masked.</span></label>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(el);

    var aBox = el.querySelector('[data-rxh-opt="analytics"]');
    var rBox = el.querySelector('[data-rxh-opt="replay"]');
    aBox.checked = consent.analytics;
    rBox.checked = consent.replay;

    requestAnimationFrame(function () { el.classList.add('rxh-show'); });

    el.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-rxh]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-rxh');

      if (action === 'toggle') {
        el.querySelector('.rxh-prefs').classList.toggle('rxh-open');
        return;
      }
      if (action === 'accept') {
        // If prefs are open, honour the individual checkboxes; otherwise accept all.
        var open = el.querySelector('.rxh-prefs').classList.contains('rxh-open');
        applyConsent(open ? aBox.checked : true, open ? rBox.checked : true, 'accept');
      } else if (action === 'decline') {
        applyConsent(false, false, 'decline');
      }
      closeBanner(el);
    });
  }

  function closeBanner(el) {
    el.classList.remove('rxh-show');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }

  function applyConsent(analytics, replay, choice) {
    var was = consent.analytics;
    consent = { analytics: !!analytics, replay: !!replay, decided: true };
    writeConsent(consent);

    try {
      if (consent.analytics) {
        if (!was) ph.opt_in_capturing();
        // Record the decision itself (allowed — they just opted in).
        ph.capture('consent_updated', {
          choice: choice,
          analytics_enabled: consent.analytics,
          replay_enabled: consent.replay
        });
        if (consent.replay) ph.startSessionRecording();
        else ph.stopSessionRecording();
      } else {
        ph.stopSessionRecording();
        ph.opt_out_capturing();
      }
    } catch (e) { /* no-op */ }
  }

  /* ============================================================
   * 4. HELPERS
   * ========================================================== */

  function closest(node, sel) {
    return node && node.closest ? node.closest(sel) : null;
  }

  function textOf(node, max) {
    if (!node) return '';
    var t = (node.textContent || '').replace(/\s+/g, ' ').trim();
    return t.slice(0, max || 80);
  }

  // A wa.me link WITHOUT a phone number is a "share this page" link, not a booking contact.
  function isShareLink(href) {
    return /wa\.me\/\?/.test(href);
  }

  // Work out WHICH call-to-action a WhatsApp click came from.
  function ctaLocation(link) {
    if (!link) return 'unknown';
    if (link.id === 'whatsBtn') return 'floating_button';
    if (link.id === 'modalWA') return 'vehicle_modal';
    if (closest(link, '#siteHeader')) return 'header';
    if (closest(link, '#mobileMenu')) return 'mobile_menu';
    if (closest(link, '#hero')) return 'hero';
    if (closest(link, '#fleet')) return 'fleet_card';
    if (closest(link, '#tours')) return 'tours_section';
    if (closest(link, '#booking')) return 'booking_form';
    if (closest(link, '#contact')) return 'contact_panel';
    if (closest(link, 'footer')) return 'footer';
    return 'other';
  }

  function pageName() {
    var p = location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    return p === '' || p === 'index' ? 'home' : p;
  }

  /* ============================================================
   * 5. CONVERSION & INTENT TRACKING
   * ========================================================== */

  function initTracking() {

    // ---- 5a. All clicks: WhatsApp, phone, email, outbound, directions ----
    document.addEventListener('click', function (ev) {
      var link = closest(ev.target, 'a');
      if (!link) return;
      var href = link.getAttribute('href') || '';

      // WhatsApp — the primary conversion on this site
      if (href.indexOf('wa.me') > -1 || href.indexOf('api.whatsapp.com') > -1) {
        if (isShareLink(href)) {
          // "Share this article" — engagement, NOT a booking enquiry.
          track('article_shared', { channel: 'whatsapp', page: pageName() });
        } else {
          track('whatsapp_click', {
            cta_location: ctaLocation(link),
            cta_text: textOf(link, 40),
            page: pageName()
          });
        }
        return;
      }

      // In-page CTAs that scroll to the booking form (also intent signals)
      if (href === '#booking') {
        track('booking_cta_click', {
          cta_location: ctaLocation(link),
          cta_text: textOf(link, 40),
          page: pageName()
        });
        return;
      }

      if (href.indexOf('tel:') === 0) {
        track('phone_click', { number_type: href.replace('tel:', '').length <= 4 ? 'emergency' : 'business' });
        return;
      }
      if (href.indexOf('mailto:') === 0) {
        track('email_click', {});
        return;
      }

      // Outbound links — includes partner sites (Viungo, Royal Aviation) and maps
      if (/^https?:\/\//i.test(href)) {
        var host = '';
        try { host = new URL(href, location.href).hostname.replace(/^www\./, ''); } catch (e) { return; }
        if (host && host.indexOf(SITE_HOST) === -1) {
          var kind = 'other';
          if (host.indexOf('viungotours') > -1) kind = 'partner_viungo';
          else if (host.indexOf('royalaviationlanka') > -1) kind = 'partner_royal_aviation';
          else if (host.indexOf('google') > -1 && href.indexOf('map') > -1) kind = 'directions';
          track('outbound_click', {
            destination_host: host,
            link_kind: kind,
            link_text: textOf(link, 40),
            page: pageName()
          });
        }
      }
    }, true);

    // ---- 5b. Fleet interest: which vehicles people actually inspect ----
    document.addEventListener('click', function (ev) {
      var btn = closest(ev.target, '.open-bike');
      if (!btn) return;
      var data = {};
      try { data = JSON.parse(btn.getAttribute('data-bike') || '{}'); } catch (e) { /* ignore */ }
      track('fleet_details_opened', {
        vehicle_id: data.id || 'unknown',
        vehicle_name: data.name || 'unknown',
        vehicle_price: data.price || 'unknown'
      });
    }, true);

    // ---- 5c. "Can't find your ride?" — demand for vehicles not in stock ----
    document.addEventListener('click', function (ev) {
      var link = closest(ev.target, 'a');
      if (!link) return;
      if (/can.?t find your ride/i.test(link.textContent || '')) {
        track('vehicle_not_found_click', { page: pageName() });
      }
    }, true);

    // ---- 5d. Tour package interest ----
    document.addEventListener('click', function (ev) {
      var link = closest(ev.target, 'a');
      if (!link || textOf(link, 20).toLowerCase().indexOf('get quote') === -1) return;
      var card = closest(link, '.bg-white.rounded-2xl');
      var title = card ? textOf(card.querySelector('h4'), 60) : '';
      track('tour_package_quote_click', { package_name: title || 'unknown' });
    }, true);

    // ---- 5e. Booking form funnel ----
    var form = document.getElementById('bookingForm');
    if (form) {
      var started = false;
      var submitted = false;
      var lastField = null;
      var touched = {};

      form.addEventListener('focusin', onEngage, true);
      form.addEventListener('change', onEngage, true);

      function onEngage(ev) {
        var f = ev.target;
        if (!f || !f.id || f.tagName === 'BUTTON') return;
        lastField = f.id;
        touched[f.id] = true;
        if (!started) {
          started = true;
          track('booking_form_started', { page: pageName() });
        }
      }

      form.addEventListener('submit', function () {
        submitted = true;
        var svc = document.getElementById('serviceType');
        var veh = document.getElementById('vehicleType');
        var dur = document.getElementById('duration');
        var pax = document.getElementById('passengers');

        // NOTE: deliberately NOT sending name / location free-text — only whether they were filled.
        track('booking_form_submitted', {
          service_type: svc && svc.value ? svc.value : 'not_selected',
          vehicle_type: veh && veh.value ? veh.value : 'not_selected',
          duration: dur && dur.value ? dur.value : 'not_selected',
          passengers: pax && pax.value ? pax.value : 'not_selected',
          has_name: !!(document.getElementById('customerName') || {}).value,
          has_pickup_date: !!(document.getElementById('pickupDate') || {}).value,
          has_pickup_time: !!(document.getElementById('pickupTime') || {}).value,
          has_pickup_location: !!(document.getElementById('pickupLocation') || {}).value,
          has_special_notes: !!(document.getElementById('specialNotes') || {}).value,
          fields_filled: Object.keys(touched).length
        });
      });

      // Abandonment — started the form but never submitted.
      window.addEventListener('pagehide', function () {
        if (started && !submitted) {
          track('booking_form_abandoned', {
            last_field: lastField || 'unknown',
            fields_filled: Object.keys(touched).length
          });
        }
      });
    }

    // ---- 5f. FAQ: searches, zero-result searches, opened questions ----
    var faqSearch = document.getElementById('faqSearch');
    var faqList = document.getElementById('faqList');
    if (faqSearch && faqList) {
      var t = null;
      faqSearch.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          var term = (faqSearch.value || '').trim();
          if (term.length < 3) return;
          var items = faqList.querySelectorAll('details');
          var visible = 0;
          for (var i = 0; i < items.length; i++) {
            if (items[i].style.display !== 'none') visible++;
          }
          // A search term is not personal data — it tells us what content is missing.
          track('faq_search', {
            search_term: term.toLowerCase().slice(0, 60),
            results_count: visible,
            zero_results: visible === 0
          });
        }, 900);
      });
    }

    if (faqList) {
      faqList.addEventListener('toggle', function (ev) {
        var d = ev.target;
        if (!d || d.tagName !== 'DETAILS' || !d.open) return;
        track('faq_opened', {
          question: textOf(d.querySelector('summary'), 120),
          category: d.getAttribute('data-category') || 'unknown'
        });
      }, true);
    }

    document.addEventListener('click', function (ev) {
      var b = closest(ev.target, '.faq-filter-btn');
      if (!b) return;
      track('faq_filter_used', { filter: b.getAttribute('data-filter') || 'unknown' });
    }, true);

    // ---- 5g. Scroll depth & section visibility ----
    var depths = [25, 50, 75, 100];
    var hit = {};
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var doc = document.documentElement;
        var total = doc.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        var pct = Math.round(((window.scrollY || doc.scrollTop) / total) * 100);
        for (var i = 0; i < depths.length; i++) {
          var d = depths[i];
          if (pct >= d && !hit[d]) {
            hit[d] = true;
            track('scroll_depth', { depth_percent: d, page: pageName() });
          }
        }
      });
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      var seen = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.id;
          if (!id || seen[id]) return;
          seen[id] = true;
          track('section_viewed', { section: id });
        });
      }, { threshold: 0.35 });
      ['about', 'why', 'fleet', 'tours', 'explore', 'booking', 'faq', 'contact']
        .forEach(function (id) {
          var el = document.getElementById(id);
          if (el) io.observe(el);
        });
    }

    /* ==========================================================
     * 6. BUG SIGNALS
     * ======================================================== */

    // Broken images — this is exactly how the old prius.jpg bug went unnoticed.
    window.addEventListener('error', function (ev) {
      var el = ev.target;
      if (!el || el.tagName !== 'IMG') return;
      track('image_load_error', {
        image_src: (el.getAttribute('src') || '').slice(0, 200),
        image_alt: (el.getAttribute('alt') || '').slice(0, 80),
        page: pageName()
      });
    }, true);

    // Failed stylesheet / script loads (CDN outages break the whole layout).
    window.addEventListener('error', function (ev) {
      var el = ev.target;
      if (!el || (el.tagName !== 'SCRIPT' && el.tagName !== 'LINK')) return;
      track('asset_load_error', {
        asset_type: el.tagName.toLowerCase(),
        asset_url: (el.src || el.href || '').slice(0, 200),
        page: pageName()
      });
    }, true);
  }

  /* ============================================================
   * 7. BOOT
   * ========================================================== */

  function boot() {
    try { initTracking(); } catch (e) { /* analytics must never break the site */ }
    if (!consent.decided) {
      // Small delay so the banner doesn't fight with the hero animation.
      setTimeout(function () { showBanner(false); }, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
