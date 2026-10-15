// Mobile expense interactions, inlined by exporter to preserve standalone HTML.
export function expenseRuntimeScript({ homeCurrency, currencyRates, distinctCurrencies, trip, membersActive, expenseCategories, palette }) {
  return `  // ====================== 記帳模組 ======================
  var HOME = "${homeCurrency}";
  var RATES = ${JSON.stringify(currencyRates).replace(/<\//g, "<\\/>")};
  var CURRENCIES = ${JSON.stringify(distinctCurrencies).replace(/<\//g, "<\\/>")};
  var DAYS = [{ id: "day-0", date: "行前", title: "行前支出" }].concat(${JSON.stringify((trip.days || []).map(function(d) { return { id: String(d.id || ""), date: String(d.date || ""), title: String(d.title || "") }; })).replace(/<\//g, "<\\/>")});
  var MEMBERS = ${JSON.stringify(membersActive).replace(/<\//g, "<\\/>")};
  var CATS = ${JSON.stringify(expenseCategories.map(function(c) { return String(c); })).replace(/<\//g, "<\\/>")};
  var PALETTE = ${JSON.stringify(palette)};


  function readExpenses() { return read(":expenses"); }
  function writeExpenses(v) {
    write(":expenses", v);
    window.dispatchEvent(new Event("travel-preview-change"));
  }
  window.getTravelPreviewState = () => JSON.parse(JSON.stringify({ packing: read(":packing", INITIAL_PACKING), references: read(":references", INITIAL_REFERENCES), expenses: readExpenses().map(normExpense) }));
  function toTwd(amount, currency) {
    var c = String(currency || HOME).toUpperCase();
    if (c === HOME) return amount;
    if (RATES[c]) return amount * RATES[c];
    return amount;
  }
  function fromTwd(twdAmount, targetCur) {
    var c = String(targetCur || HOME).toUpperCase();
    if (c === HOME) return Math.round(twdAmount * 100) / 100;
    if (RATES[c] && RATES[c] > 0) return Math.round((twdAmount / RATES[c]) * 100) / 100;
    return Math.round(twdAmount * 100) / 100;
  }
  function convertCurrency(amount, fromCur, toCur) {
    return fromTwd(toTwd(amount, fromCur), toCur);
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }
  function memberName(id) {
    if (!id) return "";
    var m = byId(MEMBERS, id);
    return m ? m.name : "";
  }
  function normExpense(r) {
    const row = transferTools.expense(r || {}, HOME);
    row.id ||= "e" + Math.random().toString(36).slice(2, 10);
    return row;
  }
  function payerOf(r) {
    return memberName(r.payerId) || r.payer || "未填付款人";
  }

  var currentDisplayCur = CURRENCIES[0] || HOME;
  var filterDay = "", filterCat = "", filterMem = "";

  function getFilteredRows() {
    return readExpenses().map(normExpense).filter(function(r) {
      if (filterDay && r.day !== filterDay) return false;
      if (filterCat && r.category !== filterCat) return false;
      if (filterMem) {
        if (r.payerId !== filterMem && (!r.participantIds || r.participantIds.indexOf(filterMem) === -1)) return false;
      }
      return true;
    });
  }

  function effAmt(r) {
    return convertCurrency(r.amount + r.fee, r.currency, currentDisplayCur);
  }

  function renderTotals(rows) {
    var total = 0, i;
    for (i = 0; i < rows.length; i++) { total += effAmt(rows[i]); }
    var people = MEMBERS.length ? MEMBERS.length : 1;
    var curPills = CURRENCIES.map(function(c) {
      return '<button type="button" class="cur-pill' + (c === currentDisplayCur ? ' active' : '') + '" data-cur="' + esc(c) + '">' + esc(c) + '</button>';
    }).join("");
    return '<div class="tcard-row"><div class="tcard"><span>總支出</span><b>' + fmt(total) + ' <small>' + esc(currentDisplayCur) + '</small></b></div>' + (MEMBERS.length ? '<div class="tcard"><span>人均分攤</span><b>' + fmt(total / people) + ' <small>' + esc(currentDisplayCur) + '</small></b></div>' : '') + '</div><div class="cur-switcher-row"><span>計價幣別</span><div class="cur-pills">' + curPills + '</div></div>';
  }

  function renderDonut(rows) {
    var aggr = {};
    rows.forEach(function(r) { var k = r.category || "其他"; aggr[k] = (aggr[k] || 0) + effAmt(r); });
    var keys = Object.keys(aggr).filter(function(k) { return aggr[k] > 0; });
    keys.sort(function(a, b) { return aggr[b] - aggr[a]; });
    var total = 0; keys.forEach(function(k) { total += aggr[k]; });
    if (!keys.length || total <= 0) return '<p class="empty">尚無花費資料</p>';

    var r = 52, c = 2 * Math.PI * r, offset = 0, paths = "";
    keys.forEach(function(k, idx) {
      var val = aggr[k], pct = val / total, dash = pct * c, gap = c - dash;
      var strokeColor = PALETTE[idx % PALETTE.length];
      paths += '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + strokeColor + '" stroke-width="22" stroke-dasharray="' + dash + ' ' + gap + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 70 70)"/>';
      offset += dash;
    });

    var legendHtml = keys.map(function(k, idx) {
      var val = aggr[k], pct = Math.round((val / total) * 100);
      var color = PALETTE[idx % PALETTE.length];
      return '<div class="donut-leg-item"><span class="donut-dot" style="background:' + color + '"></span><span class="donut-label">' + esc(k) + '</span><span class="donut-pct">' + pct + '%</span><b class="donut-amt">' + fmt(val) + '</b></div>';
    }).join("");

    return '<div class="donut-flex"><div class="donut-svg-wrap"><svg width="140" height="140" viewBox="0 0 140 140">' + paths + '<text x="70" y="65" text-anchor="middle" font-size="11" fill="#7a6454">總計</text><text x="70" y="83" text-anchor="middle" font-size="14" font-weight="700" fill="#8a3d10">' + fmt(total) + '</text></svg></div><div class="donut-legend">' + legendHtml + '</div></div>';
  }

  function renderRankBars(rows) {
    var aggr = {};
    rows.forEach(function(r) { var k = r.category || "其他"; aggr[k] = (aggr[k] || 0) + effAmt(r); });
    var keys = Object.keys(aggr).filter(function(k) { return aggr[k] > 0; });
    keys.sort(function(a, b) { return aggr[b] - aggr[a]; });
    if (!keys.length) return '<p class="empty">尚無花費資料</p>';
    var maxVal = aggr[keys[0]] || 1;
    return '<div class="rank-bars-list">' + keys.map(function(k, idx) {
      var val = aggr[k], pct = Math.round((val / maxVal) * 100);
      var color = PALETTE[idx % PALETTE.length];
      return '<div class="rank-bar-row"><span class="rank-name">' + esc(k) + '</span><div class="rank-track"><div class="rank-fill" style="width:' + pct + '%;background:' + color + '"></div></div><b class="rank-val">' + fmt(val) + '</b></div>';
    }).join("") + '</div>';
  }

  function renderDailyBars(rows) {
    var aggr = {};
    DAYS.forEach(function(d) { aggr[d.id] = 0; });
    rows.forEach(function(r) { aggr[r.day] = (aggr[r.day] || 0) + effAmt(r); });
    var hasAny = false;
    DAYS.forEach(function(d) { if (aggr[d.id] > 0) hasAny = true; });
    if (!hasAny) return '<p class="empty">尚無每日花費資料</p>';
    var maxVal = 1;
    DAYS.forEach(function(d) { if (aggr[d.id] > maxVal) maxVal = aggr[d.id]; });
    return '<div class="daily-bars-list">' + DAYS.map(function(d, idx) {
      var val = aggr[d.id] || 0, pct = Math.round((val / maxVal) * 100);
      var label = d.id === "day-0" ? "Day 0 行前" : ("Day " + idx + " " + (d.date ? d.date.slice(5) : ""));
      return '<div class="daily-bar-row"><span class="daily-name">' + esc(label) + '</span><div class="daily-track"><div class="daily-fill" style="width:' + pct + '%"></div></div><b class="daily-val">' + (val > 0 ? fmt(val) : "-") + '</b></div>';
    }).join("") + '</div>';
  }

  function renderSettlement(rows) {
    if (!MEMBERS.length) return '<p class="empty">設定同行者後即可自動結算</p>';
    var bal = {}, paid = {}, shouldPay = {};
    MEMBERS.forEach(function(m) { bal[m.id] = 0; paid[m.id] = 0; shouldPay[m.id] = 0; });
    rows.forEach(function(r) {
      var payer = r.payerId || (MEMBERS[0] ? MEMBERS[0].id : "");
      if (bal[payer] === undefined) return;
      var total = effAmt(r);
      paid[payer] += total;
      var participants = (r.participantIds && r.participantIds.length) ? r.participantIds : MEMBERS.map(function(m) { return m.id; });
      var validIds = participants.filter(function(pid) { return bal[pid] !== undefined; });
      if (!validIds.length) validIds = [payer];
      var perShare = total / validIds.length;
      bal[payer] += total;
      validIds.forEach(function(pid) {
        bal[pid] -= perShare;
        shouldPay[pid] += perShare;
      });
    });

    var summaryCards = '<div class="settle-summary-grid">' + MEMBERS.map(function(m) {
      var net = Math.round(bal[m.id] * 100) / 100;
      var netClass = net > 0.005 ? "is-plus" : (net < -0.005 ? "is-minus" : "is-zero");
      var netText = net > 0.005 ? ("+" + fmt(net)) : fmt(net);
      return '<div class="settle-person-card"><div class="sp-name">' + esc(m.name) + '</div><div class="sp-net ' + netClass + '">' + netText + ' <small>' + esc(currentDisplayCur) + '</small></div><div class="sp-detail"><span>墊付 ' + fmt(paid[m.id]) + '</span><span>應付 ' + fmt(shouldPay[m.id]) + '</span></div></div>';
    }).join("") + '</div>';

    var owes = [], gets = [];
    MEMBERS.forEach(function(m) {
      var v = Math.round(bal[m.id] * 100) / 100;
      if (v < -0.005) owes.push({ id: m.id, d: -v });
      if (v > 0.005) gets.push({ id: m.id, d: v });
    });
    owes.sort(function(a, b) { return b.d - a.d; });
    gets.sort(function(a, b) { return b.d - a.d; });
    var transfers = [];
    for (var i = 0; i < owes.length; i++) {
      for (var j = 0; j < gets.length && owes[i].d > 0.005; j++) {
        var pay = Math.min(owes[i].d, gets[j].d);
        owes[i].d -= pay;
        gets[j].d -= pay;
        if (pay > 0.005) {
          transfers.push('<div class="transfer-card"><div class="transfer-arrow"><span class="from">' + esc(memberName(owes[i].id)) + '</span><span class="arrow">給</span><span class="to">' + esc(memberName(gets[j].id)) + '</span></div><b class="transfer-amt">' + fmt(pay) + ' <small>' + esc(currentDisplayCur) + '</small></b></div>');
        }
      }
    }
    var transfersHtml = transfers.length ? '<div class="transfers-list">' + transfers.join("") + '</div>' : '<p class="empty">目前帳目已平，沒有需要結算</p>';
    return summaryCards + transfersHtml;
  }

  function renderDayList(rows) {
    if (!rows.length) return '<p class="empty">尚無記帳資料</p>';
    var groups = {};
    rows.forEach(function(r) { groups[r.day] = groups[r.day] || []; groups[r.day].push(r); });
    var out = "";
    DAYS.forEach(function(d, idx) {
      var items = groups[d.id];
      if (!items || !items.length) return;
      var total = 0; items.forEach(function(it) { total += effAmt(it); });
      var label = d.id === "day-0" ? "Day 0 · 行前支出" : ("Day " + idx + " · " + (d.date || "") + (d.title ? " " + d.title : ""));
      var rowsHtml = items.map(function(r) {
        var eqAmt = convertCurrency(r.amount + r.fee, r.currency, currentDisplayCur);
        var subLine = esc(r.currency) + " " + fmt(r.amount + r.fee) + (r.currency !== currentDisplayCur ? ' (約 ' + esc(currentDisplayCur) + ' ' + fmt(eqAmt) + ')' : '');
        return '<div class="rrow" data-id="' + esc(r.id) + '"><div class="rrow-left"><div class="rrow-title"><b>' + esc(r.description || r.category || "記帳") + '</b><span class="rrow-cat">' + esc(r.category || "其他") + '</span></div><small class="rrow-sub">' + (formatTime(r.time) ? esc(formatTime(r.time)) + ' · ' : '') + esc(payerOf(r)) + ' 墊付</small></div><div class="rrow-right"><b class="rrow-primary">' + subLine + '</b><span class="rrow-hint">點擊修改 · 長按換算</span></div></div>';
      }).join("");
      out += '<details class="eday" open><summary><span>' + esc(label) + '</span><b>合計 ' + fmt(total) + ' ' + esc(currentDisplayCur) + '</b></summary><div class="eday-items">' + rowsHtml + '</div></details>';
    });
    return out || '<p class="empty">尚無記帳資料</p>';
  }

  var longPressTimer = null, activePopover = null, longPressFired = false;
  function removePopover() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (activePopover) { activePopover.remove(); activePopover = null; }
  }
  function showPopover(row, targetEl) {
    removePopover();
    var pop = document.createElement("div");
    pop.className = "expense-popover";
    var curRows = CURRENCIES.map(function(c) {
      var val = convertCurrency(row.amount + row.fee, row.currency, c);
      var isOrig = c === row.currency;
      return '<div class="pop-cur-row"><span class="pop-cur-code">' + esc(c) + '</span><b class="pop-cur-val">' + fmt(val) + '</b>' + (isOrig ? '<span class="pop-orig-tag">原幣</span>' : '') + '</div>';
    }).join("");
    var participants = (row.participantIds && row.participantIds.length) ? row.participantIds.map(memberName).filter(Boolean).join(", ") : "全員";
    pop.innerHTML = '<div class="pop-header"><strong>' + esc(row.description || row.category || "消費") + '</strong><span class="pop-cat">' + esc(row.category || "其他") + '</span></div><div class="pop-currencies">' + curRows + '</div><div class="pop-meta"><div>付款人：<b>' + esc(payerOf(row)) + '</b></div><div>分攤人：<span>' + esc(participants) + '</span></div></div><div class="pop-hint">放開即可關閉</div>';
    document.body.appendChild(pop);
    var rect = targetEl.getBoundingClientRect();
    var top = Math.max(10, rect.top - pop.offsetHeight - 8);
    if (top < 10) top = rect.bottom + 8;
    var left = Math.max(10, Math.min(window.innerWidth - pop.offsetWidth - 10, rect.left + (rect.width / 2) - (pop.offsetWidth / 2)));
    pop.style.top = top + "px";
    pop.style.left = left + "px";
    activePopover = pop;
  }

  function bindLongPressPopover() {
    var rrows = document.querySelectorAll(".rrow");
    var allRows = readExpenses().map(normExpense);
    rrows.forEach(function(el) {
      var rid = el.getAttribute("data-id");
      var rowData = byId(allRows, rid);
      if (!rowData) return;
      el.addEventListener("touchstart", function(e) {
        longPressFired = false;
        longPressTimer = setTimeout(function() { longPressFired = true; showPopover(rowData, el); }, 280);
      }, { passive: true });
      el.addEventListener("touchend", removePopover, { passive: true });
      el.addEventListener("touchcancel", removePopover, { passive: true });
      el.addEventListener("mousedown", function(e) {
        longPressFired = false;
        longPressTimer = setTimeout(function() { longPressFired = true; showPopover(rowData, el); }, 280);
      });
      el.addEventListener("mouseup", removePopover);
      el.addEventListener("mouseleave", removePopover);
    });
  }

  function renderExpenseReport() {
    var rows = getFilteredRows();
    document.querySelectorAll("#mobile-content .expense-report").forEach(function(rep) {

    var totalsEl = rep.querySelector(".expense-totals");
    if (totalsEl) totalsEl.innerHTML = renderTotals(rows);

    var donutEl = rep.querySelector(".donut-container");
    if (donutEl) donutEl.innerHTML = renderDonut(rows);

    var rankEl = rep.querySelector(".rank-bars-container");
    if (rankEl) rankEl.innerHTML = renderRankBars(rows);

    var dailyEl = rep.querySelector(".daily-bars-container");
    if (dailyEl) dailyEl.innerHTML = renderDailyBars(rows);

    var daysEl = rep.querySelector(".days-container");
    if (daysEl) daysEl.innerHTML = renderDayList(rows);
    });

    document.querySelectorAll(".settlement-container").forEach(function(settleEl) {
      settleEl.innerHTML = renderSettlement(rows);
    });

    bindLongPressPopover();
  }

  function openSettlementModal() {
    var modal = document.getElementById("global-settlement-modal");
    if (!modal) return;
    renderExpenseReport();
    modal.classList.add("active");
    var sheet = modal.querySelector(".expense-sheet");
    if (sheet) sheet.scrollTop = 0;
    var bar = modal.querySelector(".modal-scroll-indicator");
    if (bar) bar.classList.remove("visible");
  }

  function closeSettlementModal() {
    var modal = document.getElementById("global-settlement-modal");
    if (modal) modal.classList.remove("active");
  }

  function defaultDayId() {
    var t = new Date(), mon = ("0" + (t.getMonth() + 1)).slice(-2), dd = ("0" + t.getDate()).slice(-2), today = t.getFullYear() + "-" + mon + "-" + dd;
    var firstDay = DAYS[1] ? DAYS[1].date : "";
    if (firstDay && today < firstDay) return "day-0";
    for (var i = 1; i < DAYS.length; i++) {
      if (DAYS[i].date === today) return DAYS[i].id;
    }
    return DAYS[1] ? DAYS[1].id : "day-0";
  }

  function openExpenseModal(triggerBtn, editRecordId) {
    if (window.__travelSharedReadonly) return;
    var modal = document.getElementById("global-expense-modal");
    if (!modal) return;
    modal.classList.add("active");
    var sheet = modal.querySelector(".expense-sheet");
    if (sheet) sheet.scrollTop = 0;
    var bar = modal.querySelector(".modal-scroll-indicator");
    if (bar) bar.classList.remove("visible");
    var form = modal.querySelector(".expense-form");
    if (!form) return;

    var titleEl = modal.querySelector(".expense-title h2");
    var saveBtn = form.querySelector(".expense-save");
    var delBtn = form.querySelector(".expense-delete-btn");
    var recIdInput = form.querySelector(".expense-record-id");

    if (editRecordId) {
      var allRows = readExpenses().map(normExpense);
      var rec = byId(allRows, editRecordId);
      if (!rec) return;

      if (titleEl) titleEl.textContent = (lang === "en" ? "Edit expense" : "編輯記帳");
      if (saveBtn) saveBtn.textContent = (lang === "en" ? "Update" : "儲存修改");
      if (delBtn) delBtn.style.display = "block";
      if (recIdInput) recIdInput.value = rec.id;

      var catInput = form.querySelector(".expense-category");
      if (catInput) catInput.value = rec.category || "食物";
      form.querySelectorAll(".expense-cat-btn").forEach(function(b) {
        b.classList.toggle("active", b.getAttribute("data-cat") === (rec.category || "食物"));
      });

      var actCurInput = form.querySelector(".expense-active-cur");
      if (actCurInput) actCurInput.value = rec.currency;
      var amtInput = form.querySelector(".expense-amount");
      if (amtInput) amtInput.value = rec.amount;
      form.querySelectorAll(".currency-val").forEach(function(inp) {
        var code = inp.getAttribute("data-code");
        if (code === rec.currency) {
          inp.value = rec.amount || "";
        } else {
          inp.value = fromTwd(toTwd(rec.amount, rec.currency), code) || "";
        }
      });

      var descInput = form.querySelector(".expense-description");
      if (descInput) descInput.value = rec.description || "";
      var daySelect = form.querySelector(".expense-day");
      if (daySelect && rec.day) daySelect.value = rec.day;
      var timeInput = form.querySelector(".expense-time");
      if (timeInput) {
        timeInput.value = formatTime(rec.time) || nowTime();
        attachModalTimeAutoFormat(timeInput);
      }

      var payerIdInput = form.querySelector(".expense-payer-id");
      if (payerIdInput) payerIdInput.value = rec.payerId || "";
      form.querySelectorAll(".expense-payer-btn").forEach(function(b) {
        b.classList.toggle("active", b.getAttribute("data-payer-id") === rec.payerId);
      });
      var payerInput = form.querySelector(".expense-payer");
      if (payerInput) payerInput.value = rec.payer || "";

      var pIds = Array.isArray(rec.participantIds) ? rec.participantIds : [];
      form.querySelectorAll(".participant-chip").forEach(function(chip) {
        chip.classList.toggle("active", pIds.indexOf(chip.getAttribute("data-part-id")) !== -1);
      });
      var allT = form.querySelector(".participant-all-toggle");
      if (allT) {
        var chips = form.querySelectorAll(".participant-chip");
        var allActive = chips.length > 0 && Array.from(chips).every(function(c) { return c.classList.contains("active"); });
        allT.classList.toggle("active", allActive);
      }
    } else {
      if (titleEl) titleEl.textContent = (lang === "en" ? "Add expense" : "記一筆");
      if (saveBtn) saveBtn.textContent = (lang === "en" ? "Save" : "儲存記帳");
      if (delBtn) delBtn.style.display = "none";
      if (recIdInput) recIdInput.value = "";

      var dSel = (triggerBtn && triggerBtn.getAttribute("data-expense-day")) || defaultDayId();
      var daySelect = form.querySelector(".expense-day");
      if (daySelect && dSel) daySelect.value = dSel;

      var timeInput = form.querySelector(".expense-time");
      if (timeInput) {
        timeInput.value = nowTime();
        attachModalTimeAutoFormat(timeInput);
      }

      var descInput = form.querySelector(".expense-description");
      if (descInput) descInput.value = "";

      form.querySelectorAll(".currency-val").forEach(function(inp) { inp.value = ""; });
      form.querySelectorAll(".participant-chip").forEach(function(chip) { chip.classList.add("active"); });
      var allT = form.querySelector(".participant-all-toggle");
      if (allT) allT.classList.add("active");
      var firstVal = form.querySelector('.currency-val[data-code="' + CURRENCIES[0] + '"]') || form.querySelector('.currency-val');
      if (firstVal) setTimeout(function() { firstVal.focus(); }, 120);
    }
  }

  function closeExpenseModal() {
    var modal = document.getElementById("global-expense-modal");
    if (modal) modal.classList.remove("active");
  }

  function saveExpenseModal(form) {
    var modal = form.closest(".expense-modal") || document.getElementById("global-expense-modal");
    var actCur = form.querySelector(".expense-active-cur") ? form.querySelector(".expense-active-cur").value : (CURRENCIES[0] || HOME);
    var actInput = form.querySelector('.currency-val[data-code="' + actCur + '"]');
    var amount = actInput ? Number(actInput.value) : 0;
    if (!amount || amount <= 0) {
      var anyInp = Array.from(form.querySelectorAll(".currency-val")).find(function(i) { return Number(i.value) > 0; });
      if (anyInp) {
        actCur = anyInp.getAttribute("data-code");
        amount = Number(anyInp.value);
      }
    }
    if (!amount || amount <= 0) return;

    var cat = form.querySelector(".expense-category") ? form.querySelector(".expense-category").value : "其他";
    var desc = (form.querySelector(".expense-description") ? form.querySelector(".expense-description").value.trim() : "") || cat;
    var day = form.querySelector(".expense-day") ? form.querySelector(".expense-day").value : "day-0";
    var time = form.querySelector(".expense-time") ? (formatTime(form.querySelector(".expense-time").value) || nowTime()) : nowTime();
    var payerId = form.querySelector(".expense-payer-id") ? form.querySelector(".expense-payer-id").value : (form.querySelector(".expense-payer") ? form.querySelector(".expense-payer").value : "");
    var partIds = [];
    form.querySelectorAll(".participant-chip.active").forEach(function(c) {
      var pid = c.getAttribute("data-part-id");
      if (pid) partIds.push(pid);
    });

    var recIdInput = form.querySelector(".expense-record-id");
    var editId = recIdInput ? recIdInput.value : "";
    var recordId = editId || ("e" + Math.random().toString(36).slice(2, 10));

    var record = {
      id: recordId,
      day: day,
      time: time,
      description: desc,
      category: cat,
      currency: actCur,
      amount: amount,
      fee: 0,
      payerId: payerId,
      participantIds: partIds.length ? partIds : (payerId ? [payerId] : [])
    };

    var rows = readExpenses();
    if (editId) {
      var found = false;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === editId) {
          rows[i] = record;
          found = true;
          break;
        }
      }
      if (!found) rows.push(record);
    } else {
      rows.push(record);
    }
    writeExpenses(rows);

    if (modal) modal.classList.remove("active");
    renderExpenseReport();
  }

  function bindExpenseGlobalEvents() {
    document.addEventListener("click", function(ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".day-expense") : null;
      if (btn) {
        openExpenseModal(btn);
        return;
      }

      var delBtn = ev.target && ev.target.closest ? ev.target.closest(".expense-delete-btn") : null;
      if (delBtn) {
        var modal = delBtn.closest(".expense-modal") || document.getElementById("global-expense-modal");
        var recIdInput = modal ? modal.querySelector(".expense-record-id") : null;
        var editId = recIdInput ? recIdInput.value : "";
        if (editId) {
          if (!confirm(lang === "en" ? "Delete this expense?" : "確定要刪除這筆記帳嗎？")) return;
          var deleted = readExpenses().find(function(r) { return r.id === editId; });
          if (deleted) {
            var history = read(":deleted-expenses").filter(function(r) { return r.id !== editId; });
            history.push(normExpense(deleted));
            write(":deleted-expenses", history);
          }
          var rows = readExpenses().filter(function(r) { return r.id !== editId; });
          writeExpenses(rows);
          closeExpenseModal();
          renderExpenseReport();
        }
        return;
      }

      var rrow = ev.target && ev.target.closest ? ev.target.closest(".rrow") : null;
      if (rrow) {
        if (longPressFired) {
          longPressFired = false;
          return;
        }
        var rid = rrow.getAttribute("data-id");
        if (rid) openExpenseModal(null, rid);
        return;
      }

      var settleBtn = ev.target && ev.target.closest ? ev.target.closest(".expense-settle-btn") : null;
      if (settleBtn) {
        openSettlementModal();
        return;
      }

      var close = ev.target && ev.target.closest ? ev.target.closest(".expense-close") : null;
      if (close) {
        closeExpenseModal();
        closeSettlementModal();
        return;
      }

      // Backdrop click
      if (ev.target && ev.target.classList && ev.target.classList.contains("expense-modal")) {
        closeExpenseModal();
        closeSettlementModal();
        return;
      }

      var curPill = ev.target && ev.target.closest ? ev.target.closest(".cur-pill") : null;
      if (curPill) {
        currentDisplayCur = curPill.getAttribute("data-cur") || HOME;
        renderExpenseReport();
        return;
      }

      var catBtn = ev.target && ev.target.closest ? ev.target.closest(".expense-cat-btn") : null;
      if (catBtn) {
        catBtn.parentElement.querySelectorAll(".expense-cat-btn").forEach(function(b) { b.classList.remove("active"); });
        catBtn.classList.add("active");
        var hid = catBtn.closest(".expense-form").querySelector(".expense-category");
        if (hid) hid.value = catBtn.getAttribute("data-cat");
        return;
      }

      var payerBtn = ev.target && ev.target.closest ? ev.target.closest(".expense-payer-btn") : null;
      if (payerBtn) {
        payerBtn.parentElement.querySelectorAll(".expense-payer-btn").forEach(function(b) { b.classList.remove("active"); });
        payerBtn.classList.add("active");
        var hidP = payerBtn.closest(".expense-form").querySelector(".expense-payer-id");
        if (hidP) hidP.value = payerBtn.getAttribute("data-payer-id");
        return;
      }

      var allToggle = ev.target && ev.target.closest ? ev.target.closest(".participant-all-toggle") : null;
      if (allToggle) {
        var container = allToggle.closest(".expense-participants");
        var isNowActive = allToggle.classList.toggle("active");
        container.querySelectorAll(".participant-chip").forEach(function(chip) {
          chip.classList.toggle("active", isNowActive);
        });
        return;
      }

      var chipBtn = ev.target && ev.target.closest ? ev.target.closest(".participant-chip") : null;
      if (chipBtn) {
        chipBtn.classList.toggle("active");
        var container = chipBtn.closest(".expense-participants");
        if (container) {
          var allChips = container.querySelectorAll(".participant-chip");
          var allActive = Array.from(allChips).every(function(c) { return c.classList.contains("active"); });
          var toggleBtn = container.querySelector(".participant-all-toggle");
          if (toggleBtn) toggleBtn.classList.toggle("active", allActive);
        }
        return;
      }
    });

    document.addEventListener("input", function(ev) {
      var inp = ev.target;
      if (!inp || !inp.classList.contains("currency-val")) return;
      var form = inp.closest(".expense-form");
      if (!form) return;
      var sourceCode = inp.getAttribute("data-code");
      var val = Number(inp.value);
      var actCurEl = form.querySelector(".expense-active-cur");
      if (actCurEl) actCurEl.value = sourceCode;
      var actAmtEl = form.querySelector(".expense-amount");
      if (actAmtEl) actAmtEl.value = val;

      if (!val || val <= 0) {
        form.querySelectorAll(".currency-val").forEach(function(other) {
          if (other !== inp) other.value = "";
        });
        return;
      }

      var twdVal = toTwd(val, sourceCode);
      form.querySelectorAll(".currency-val").forEach(function(other) {
        if (other === inp) return;
        var oCode = other.getAttribute("data-code");
        other.value = fromTwd(twdVal, oCode);
      });
    });

    document.addEventListener("wheel", function(ev) {
      if (ev.target && ev.target.classList && ev.target.classList.contains("currency-val")) {
        ev.target.blur();
      }
    }, { passive: true });

    document.addEventListener("change", function(ev) {
      var t = ev.target;
      if (!t) return;
      if (t.classList.contains("efilter-day")) { filterDay = t.value; renderExpenseReport(); }
      if (t.classList.contains("efilter-cat")) { filterCat = t.value; renderExpenseReport(); }
      if (t.classList.contains("efilter-mem")) { filterMem = t.value; renderExpenseReport(); }
    });

    document.querySelectorAll(".expense-form").forEach(function(form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        saveExpenseModal(form);
      };
    });

    window.addEventListener("touchend", removePopover, { passive: true });
  }

`;
}
