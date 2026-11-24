/* LinkedIn Insight Tag (Optaris Ad Account 514102620, partner 11434825)
   + conversão "Lead site - formulário HubSpot" (33107913), disparada quando
   um envio para api.hsforms.com/submissions volta com sucesso. */
(function () {
  var PID = '11434825', LEAD = 33107913;
  window._linkedin_partner_id = PID;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  if (window._linkedin_data_partner_ids.indexOf(PID) < 0) window._linkedin_data_partner_ids.push(PID);
  if (!window.lintrk) {
    window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); };
    window.lintrk.q = [];
  }
  var s = document.createElement('script');
  s.type = 'text/javascript'; s.async = true;
  s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  (document.head || document.documentElement).appendChild(s);

  function lead() { try { window.lintrk('track', { conversion_id: LEAD }); } catch (e) {} }
  var f = window.fetch;
  if (f && !f.__li) {
    var w = function (u) {
      var p = f.apply(this, arguments);
      try {
        if (String((u && u.url) || u).indexOf('api.hsforms.com/submissions') > -1) {
          p.then(function (r) { if (r && r.ok) lead(); }, function () {});
        }
      } catch (e) {}
      return p;
    };
    w.__li = true;
    window.fetch = w;
  }
})();
