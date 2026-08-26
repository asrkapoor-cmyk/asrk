// ============================================================
// WEALTH PLANNER — APP LOGIC
// ============================================================

// ---------- Formatting helpers (Indian numbering) ----------
function formatINR(n, decimals=0){
  if (n === null || n === undefined || isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  n = Math.abs(n);
  const fixed = n.toFixed(decimals);
  let [intPart, decPart] = fixed.split(".");
  let lastThree = intPart.slice(-3);
  let other = intPart.slice(0, -3);
  if (other !== "") lastThree = "," + lastThree;
  const formatted = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  return sign + "₹" + formatted + (decPart ? "." + decPart : "");
}
function formatCompact(n){
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return (n/1e7).toFixed(2).replace(/\.00$/,"") + " Cr";
  if (abs >= 1e5) return (n/1e5).toFixed(2).replace(/\.00$/,"") + " L";
  if (abs >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,"") + "K";
  return n.toFixed(0);
}

// ---------- Financial math ----------
// Future value of a lumpsum
function fvLumpsum(P, annualRate, years){
  return P * Math.pow(1 + annualRate/100, years);
}
// Future value of a monthly SIP (ordinary annuity, invested at month start)
function fvSIP(monthly, annualRate, years){
  const r = (annualRate/100)/12;
  const n = years*12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1+r, n) - 1) / r) * (1+r);
}
// Monthly SIP required to reach a target future value
function requiredSIP(targetFV, annualRate, years){
  const r = (annualRate/100)/12;
  const n = years*12;
  if (n <= 0) return targetFV;
  if (r === 0) return targetFV / n;
  return targetFV * r / ((Math.pow(1+r, n) - 1) * (1+r));
}
// Inflate a present cost to a future value
function inflateCost(present, inflationRate, years){
  return present * Math.pow(1 + inflationRate/100, years);
}

// ---------- Income tax computation ----------
function computeSlabTax(taxableIncome, slabs){
  let tax = 0, lower = 0;
  for (const slab of slabs){
    if (taxableIncome > lower){
      const taxableInSlab = Math.min(taxableIncome, slab.upto) - lower;
      tax += taxableInSlab * slab.rate/100;
      lower = slab.upto;
    } else break;
  }
  return tax;
}
function computeSurcharge(taxableIncome, baseTax){
  let rate = 0;
  for (const s of TAX_CONFIG.surchargeSlabs){
    if (taxableIncome > s.above) rate = s.rate;
  }
  return baseTax * rate/100;
}
function computeTax(grossIncome, regime, deductions80C){
  const cfg = regime === "new" ? TAX_CONFIG.newRegime : TAX_CONFIG.oldRegime;
  let taxable = grossIncome - cfg.standardDeduction;
  if (regime === "old") taxable -= Math.min(deductions80C||0, 150000);
  taxable = Math.max(0, taxable);
  let tax = computeSlabTax(taxable, cfg.slabs);
  let rebate = 0;
  if (taxable <= cfg.rebateLimit) rebate = Math.min(tax, cfg.rebateMax);
  let afterRebate = Math.max(0, tax - rebate);
  const surcharge = computeSurcharge(taxable, afterRebate);
  const cess = (afterRebate + surcharge) * TAX_CONFIG.cessRate/100;
  const total = afterRebate + surcharge + cess;
  return { taxable, grossTax:tax, rebate, surcharge, cess, total, takeHome: grossIncome - total };
}

// ============================================================
// NAVIGATION
// ============================================================
document.querySelectorAll('.navbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.screen).classList.add('active');
    document.getElementById('content').scrollTop = 0;
    if (btn.dataset.screen === 'screen-calc' && recomputeCompound) {
      requestAnimationFrame(()=> requestAnimationFrame(recomputeCompound));
    }
  });
});

// ---------- WhatsApp FAB ----------
function buildWaLink(message){
  return `https://wa.me/${ADVISOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
document.getElementById('wa-fab').href = buildWaLink("Hi! I've been exploring the Wealth Planner app and would like to talk to you about my financial plan.");

// ============================================================
// ICONS (small inline SVGs, brand-consistent line style)
// ============================================================
const ICONS = {
  retirement: `<svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5 21c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/></svg>`,
  education: `<svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.8"><path d="M2 8 L12 4 L22 8 L12 12 Z"/><path d="M6 10.5 V16 C6 17.5 9 19 12 19 C15 19 18 17.5 18 16 V10.5"/></svg>`,
  wedding: `<svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.8"><circle cx="8" cy="14" r="4.2"/><circle cx="16" cy="14" r="4.2"/><path d="M12 6 L10 10 M12 6 L14 10"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.8"><path d="M3 11 L12 4 L21 11"/><path d="M5 10 V20 H19 V10"/><path d="M10 20 V14 H14 V20"/></svg>`,
  wealth: `<svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.8"><path d="M3 18 L9 11 L13 15 L21 6"/><path d="M15 6 H21 V12"/></svg>`,
  emergency: `<svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.8"><path d="M12 2 L21 6 V12 C21 17 17 20.5 12 22 C7 20.5 3 17 3 12 V6 Z"/><path d="M12 8 V13 M12 16 V16.2"/></svg>`,
};
function categoryIcon(cat){
  const map = { equity:"📈", debt:"🏦", hybrid:"⚖️", protection:"🛡️", commodity:"🪙", property:"🏠" };
  return map[cat] || "💼";
}
function categoryColor(cat){
  const map = { equity:"#FCE9E9", debt:"#E8F0FB", hybrid:"#F3EBFB", protection:"#E4F5E9", commodity:"#FDF2D8", property:"#EAF3EE" };
  return map[cat] || "#F1F1F1";
}

// growth-arc signature SVG (used as section divider)
function arcDividerSVG(){
  return `<svg class="arc-divider" viewBox="0 0 400 20" preserveAspectRatio="none">
    <path d="M0,16 C100,16 100,2 200,2 C300,2 300,16 400,16" fill="none" stroke="#C9A227" stroke-width="1.5" opacity="0.6"/>
  </svg>`;
}

// ============================================================
// GOALS SCREEN
// ============================================================
let selectedAgeGroup = "30s";
let selectedGoal = null;

function renderAgeScroll(){
  const el = document.getElementById('ageScroll');
  el.innerHTML = AGE_GROUPS.map(g=>
    `<button class="age-pill ${g.id===selectedAgeGroup?'active':''}" data-age="${g.id}">${g.label}</button>`
  ).join('');
  el.querySelectorAll('.age-pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedAgeGroup = btn.dataset.age;
      renderAgeScroll();
    });
  });
}

function renderGoalGrid(){
  const el = document.getElementById('goalGrid');
  el.innerHTML = GOAL_TEMPLATES.map(g=>
    `<button class="goal-card ${selectedGoal===g.id?'selected':''}" data-goal="${g.id}">
      <div class="gicon">${ICONS[g.icon]}</div>
      <div class="gname">${g.name}</div>
      <div class="gtag">${g.tag}</div>
    </button>`
  ).join('');
  el.querySelectorAll('.goal-card').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedGoal = btn.dataset.goal;
      renderGoalGrid();
      renderGoalCalc();
      document.getElementById('goalCalcArea').scrollIntoView({behavior:'smooth', block:'nearest'});
    });
  });
}

function renderGoalCalc(){
  const area = document.getElementById('goalCalcArea');
  const tpl = GOAL_TEMPLATES.find(g=>g.id===selectedGoal);
  if (!tpl){ area.innerHTML=""; return; }

  area.innerHTML = `
    ${arcDividerSVG()}
    <div class="card">
      <div class="field">
        <label>${tpl.costLabel}</label>
        <div class="input-row"><span class="prefix">₹</span><input type="number" id="goalCost" value="${tpl.costDefault}"></div>
      </div>
      <div class="field">
        <label>${tpl.yearsLabel}</label>
        <div class="slider-row">
          <input type="range" id="goalYears" min="1" max="${tpl.isEmergency?24:35}" value="${tpl.yearsDefault}">
          <div class="slider-val" id="goalYearsVal">${tpl.yearsDefault} ${tpl.isEmergency?'mo':'yrs'}</div>
        </div>
      </div>
      ${!tpl.isEmergency ? `
      <div class="field">
        <label>Assumed cost inflation</label>
        <div class="slider-row">
          <input type="range" id="goalInflation" min="0" max="12" step="0.5" value="${tpl.inflation}">
          <div class="slider-val" id="goalInflationVal">${tpl.inflation}%</div>
        </div>
      </div>
      <div class="field">
        <label>Expected return on investment</label>
        <div class="slider-row">
          <input type="range" id="goalReturn" min="4" max="16" step="0.5" value="${tpl.defaultReturn}">
          <div class="slider-val" id="goalReturnVal">${tpl.defaultReturn}%</div>
        </div>
      </div>` : ``}
      <div id="goalResult"></div>
      <div class="lead" style="margin:12px 0 0;">${tpl.note}</div>
    </div>
  `;

  const recompute = ()=>{
    const cost = parseFloat(document.getElementById('goalCost').value) || 0;
    const years = parseFloat(document.getElementById('goalYears').value) || 1;
    document.getElementById('goalYearsVal').textContent = years + (tpl.isEmergency?' mo':' yrs');

    const resultEl = document.getElementById('goalResult');

    if (tpl.isEmergency){
      const target = cost * years;
      resultEl.innerHTML = `
        <div class="result-box">
          <div class="rlabel">Target emergency fund</div>
          <div class="rvalue">${formatINR(target)}</div>
          <div class="rsub">${years} months of expenses, kept in a liquid fund or sweep-in FD</div>
        </div>`;
      return;
    }

    const inflation = parseFloat(document.getElementById('goalInflation').value);
    const ret = parseFloat(document.getElementById('goalReturn').value);
    document.getElementById('goalInflationVal').textContent = inflation + '%';
    document.getElementById('goalReturnVal').textContent = ret + '%';

    let targetFV;
    if (tpl.id === 'retirement'){
      const futureMonthlyExpense = inflateCost(cost, inflation, years);
      targetFV = futureMonthlyExpense * 12 * 25; // 25x annual expense rule
    } else {
      targetFV = inflateCost(cost, inflation, years);
    }
    const sip = requiredSIP(targetFV, ret, years);
    const totalInvested = sip * years * 12;
    const growthPortion = targetFV - totalInvested;

    resultEl.innerHTML = `
      <div class="result-box">
        <div class="rlabel">${tpl.id==='retirement' ? 'Retirement corpus needed' : 'Future cost of this goal'}</div>
        <div class="rvalue">${formatINR(targetFV)}</div>
        <div class="rsub">in ${years} years, adjusted for ${inflation}% annual inflation</div>
        <div class="result-grid">
          <div class="rg-item"><div class="k">Monthly SIP needed</div><div class="v">${formatINR(sip)}</div></div>
          <div class="rg-item"><div class="k">Total you'll invest</div><div class="v">${formatCompact(totalInvested)}</div></div>
          <div class="rg-item"><div class="k">Growth does the rest</div><div class="v">${formatCompact(growthPortion)}</div></div>
          <div class="rg-item"><div class="k">Assumed return</div><div class="v">${ret}% p.a.</div></div>
        </div>
      </div>`;
  };

  ['goalCost','goalYears','goalInflation','goalReturn'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recompute);
  });
  recompute();
}

// ============================================================
// CALCULATORS SCREEN
// ============================================================
document.querySelectorAll('.calc-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.calc-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.calc-pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('calc-'+tab.dataset.calc).classList.add('active');
    if (tab.dataset.calc === 'compound' && recomputeCompound) {
      requestAnimationFrame(()=> requestAnimationFrame(recomputeCompound));
    }
  });
});

// ---------- Compounding calculator ----------
let recomputeCompound = null;
function renderCompoundCalc(){
  const el = document.getElementById('calc-compound');
  el.innerHTML = `
    <div class="card">
      <div class="field">
        <label>Lumpsum investment today</label>
        <div class="input-row"><span class="prefix">₹</span><input type="number" id="cLump" value="100000"></div>
      </div>
      <div class="field">
        <label>Monthly SIP</label>
        <div class="input-row"><span class="prefix">₹</span><input type="number" id="cSIP" value="10000"></div>
      </div>
      <div class="field">
        <label>Expected annual return</label>
        <div class="slider-row"><input type="range" id="cRate" min="4" max="18" step="0.5" value="12"><div class="slider-val" id="cRateVal">12%</div></div>
      </div>
      <div class="field">
        <label>Time horizon</label>
        <div class="slider-row"><input type="range" id="cYears" min="1" max="35" value="15"><div class="slider-val" id="cYearsVal">15 yrs</div></div>
      </div>
      <canvas id="growthChart" width="400" height="180"></canvas>
      <div id="compoundResult"></div>
    </div>
  `;
  const recompute = ()=>{
    const lump = parseFloat(document.getElementById('cLump').value)||0;
    const sip = parseFloat(document.getElementById('cSIP').value)||0;
    const rate = parseFloat(document.getElementById('cRate').value);
    const years = parseInt(document.getElementById('cYears').value);
    document.getElementById('cRateVal').textContent = rate+'%';
    document.getElementById('cYearsVal').textContent = years+' yrs';

    const series = [];
    for (let y=0; y<=years; y++){
      const lv = fvLumpsum(lump, rate, y);
      const sv = fvSIP(sip, rate, y);
      series.push(lv+sv);
    }
    drawGrowthChart(series);

    const finalVal = series[series.length-1];
    const invested = lump + sip*years*12;
    const gains = finalVal - invested;
    document.getElementById('compoundResult').innerHTML = `
      <div class="result-box">
        <div class="rlabel">Corpus after ${years} years</div>
        <div class="rvalue">${formatINR(finalVal)}</div>
        <div class="rsub">${formatCompact(finalVal)}</div>
        <div class="result-grid">
          <div class="rg-item"><div class="k">Total invested</div><div class="v">${formatCompact(invested)}</div></div>
          <div class="rg-item"><div class="k">Wealth gained</div><div class="v">${formatCompact(gains)}</div></div>
        </div>
      </div>`;
  };
  ['cLump','cSIP','cRate','cYears'].forEach(id=>document.getElementById(id).addEventListener('input', recompute));
  recomputeCompound = recompute;
  recompute();
}

function drawGrowthChart(series){
  const canvas = document.getElementById('growthChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w*dpr; canvas.height = h*dpr;
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);

  const max = Math.max(...series, 1);
  const pad = {l:8, r:8, t:14, b:8};
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

  // filled area
  ctx.beginPath();
  series.forEach((v,i)=>{
    const x = pad.l + (i/(series.length-1))*plotW;
    const y = pad.t + plotH - (v/max)*plotH;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.lineTo(pad.l+plotW, pad.t+plotH);
  ctx.lineTo(pad.l, pad.t+plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(201,162,39,0.35)');
  grad.addColorStop(1,'rgba(201,162,39,0.02)');
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  series.forEach((v,i)=>{
    const x = pad.l + (i/(series.length-1))*plotW;
    const y = pad.t + plotH - (v/max)*plotH;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // end dot
  const lastX = pad.l+plotW, lastY = pad.t + plotH - (series[series.length-1]/max)*plotH;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI*2);
  ctx.fillStyle = '#0A2340';
  ctx.fill();
}

// ---------- Inflation calculator ----------
function renderInflationCalc(){
  const el = document.getElementById('calc-inflation');
  el.innerHTML = `
    <div class="card">
      <div class="field">
        <label>What costs this much today</label>
        <div class="input-row"><span class="prefix">₹</span><input type="number" id="iCost" value="50000"></div>
      </div>
      <div class="field">
        <label>Assumed inflation rate</label>
        <div class="slider-row"><input type="range" id="iRate" min="2" max="12" step="0.5" value="6"><div class="slider-val" id="iRateVal">6%</div></div>
      </div>
      <div class="field">
        <label>Number of years from now</label>
        <div class="slider-row"><input type="range" id="iYears" min="1" max="40" value="10"><div class="slider-val" id="iYearsVal">10 yrs</div></div>
      </div>
      <div id="inflationResult"></div>
    </div>
  `;
  const recompute = ()=>{
    const cost = parseFloat(document.getElementById('iCost').value)||0;
    const rate = parseFloat(document.getElementById('iRate').value);
    const years = parseInt(document.getElementById('iYears').value);
    document.getElementById('iRateVal').textContent = rate+'%';
    document.getElementById('iYearsVal').textContent = years+' yrs';
    const future = inflateCost(cost, rate, years);
    const purchasingPowerLoss = 100 - (cost/future*100);
    document.getElementById('inflationResult').innerHTML = `
      <div class="result-box">
        <div class="rlabel">Same purchase, in ${years} years</div>
        <div class="rvalue">${formatINR(future)}</div>
        <div class="rsub">Today's ₹${formatCompact(cost)} will feel like this by then</div>
        <div class="result-grid">
          <div class="rg-item"><div class="k">Multiple of today's cost</div><div class="v">${(future/cost).toFixed(2)}×</div></div>
          <div class="rg-item"><div class="k">₹1 lakh today is worth</div><div class="v">${formatINR(inflateCost(100000,rate,years)===0?0:100000*Math.pow(1+rate/100,-years))}</div></div>
        </div>
      </div>`;
  };
  ['iCost','iRate','iYears'].forEach(id=>document.getElementById(id).addEventListener('input', recompute));
  recompute();
}

// ---------- Tax calculator ----------
let taxRegime = "new";
function renderTaxCalc(){
  const el = document.getElementById('calc-tax');
  el.innerHTML = `
    <div class="card">
      <div class="tax-toggle">
        <button id="regimeNew" class="${taxRegime==='new'?'active':''}">New Regime</button>
        <button id="regimeOld" class="${taxRegime==='old'?'active':''}">Old Regime</button>
      </div>
      <div class="field">
        <label>Gross annual income</label>
        <div class="input-row"><span class="prefix">₹</span><input type="number" id="tIncome" value="1200000"></div>
      </div>
      <div class="field" id="tDeductionField" style="display:${taxRegime==='old'?'block':'none'};">
        <label>80C / 80D etc. deductions claimed</label>
        <div class="input-row"><span class="prefix">₹</span><input type="number" id="tDeduction" value="150000"></div>
        <div class="hint">Standard deduction of ₹50,000 is applied automatically on top of this.</div>
      </div>
      <div id="taxResult"></div>
      <div class="lead" style="margin:14px 0 0;">FY 2025-26 slabs shown. Surcharge and marginal relief are simplified for illustration — always confirm the exact figure with your CA before filing.</div>
    </div>
  `;
  document.getElementById('regimeNew').addEventListener('click', ()=>{ taxRegime='new'; renderTaxCalc(); });
  document.getElementById('regimeOld').addEventListener('click', ()=>{ taxRegime='old'; renderTaxCalc(); });

  const recompute = ()=>{
    const income = parseFloat(document.getElementById('tIncome').value)||0;
    const ded = taxRegime==='old' ? (parseFloat(document.getElementById('tDeduction').value)||0) : 0;
    const r = computeTax(income, taxRegime, ded);
    document.getElementById('taxResult').innerHTML = `
      <div class="result-box">
        <div class="rlabel">Estimated tax payable</div>
        <div class="rvalue">${formatINR(r.total)}</div>
        <div class="rsub">Take-home after tax: ${formatINR(r.takeHome)}</div>
      </div>
      <div class="card card-tight" style="margin-top:12px; box-shadow:none;">
        <div class="breakdown-row"><span class="lbl">Taxable income</span><span class="val">${formatINR(r.taxable)}</span></div>
        <div class="breakdown-row"><span class="lbl">Tax as per slabs</span><span class="val">${formatINR(r.grossTax)}</span></div>
        <div class="breakdown-row"><span class="lbl">Section 87A rebate</span><span class="val">− ${formatINR(r.rebate)}</span></div>
        <div class="breakdown-row"><span class="lbl">Surcharge</span><span class="val">${formatINR(r.surcharge)}</span></div>
        <div class="breakdown-row"><span class="lbl">Health & education cess (4%)</span><span class="val">${formatINR(r.cess)}</span></div>
        <div class="breakdown-row total"><span class="lbl">Total tax</span><span class="val">${formatINR(r.total)}</span></div>
      </div>
    `;
  };
  document.getElementById('tIncome').addEventListener('input', recompute);
  if (document.getElementById('tDeduction')) document.getElementById('tDeduction').addEventListener('input', recompute);
  recompute();
}

// ============================================================
// INVEST SCREEN
// ============================================================
let investFilter = "all";
function renderInvestFilters(){
  const el = document.getElementById('investFilters');
  el.innerHTML = INVEST_FILTERS.map(f=>
    `<button class="chip ${investFilter===f.id?'active':''}" data-f="${f.id}">${f.label}</button>`
  ).join('');
  el.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{ investFilter = btn.dataset.f; renderInvestFilters(); renderInvestList(); });
  });
}
function renderInvestList(){
  const el = document.getElementById('investList');
  const items = INVESTMENT_OPTIONS.filter(o=> investFilter==='all' || o.category===investFilter);
  el.innerHTML = items.map(o=>`
    <div class="invest-card" data-id="${o.id}">
      <div class="invest-head">
        <div class="left">
          <div class="invest-icon" style="background:${categoryColor(o.category)};">${categoryIcon(o.category)}</div>
          <div>
            <div class="invest-title">${o.name}</div>
            <div class="invest-sub">${o.returns}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="risk-badge risk-${o.risk==='high'?'high':o.risk==='moderate'?'mod':'low'}">${o.risk}</span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9 L12 15 L18 9"/></svg>
        </div>
      </div>
      <div class="invest-body">
        <div class="detail-note">${o.summary}</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="k">Lock-in</div><div class="v">${o.lockIn}</div></div>
          <div class="detail-item"><div class="k">Liquidity</div><div class="v">${o.liquidity}</div></div>
          <div class="detail-item"><div class="k">Taxation</div><div class="v">${o.taxation}</div></div>
          <div class="detail-item"><div class="k">Min. investment</div><div class="v">${o.minInvest}</div></div>
        </div>
        <div class="detail-note"><strong>Ideal for:</strong> ${o.idealFor}</div>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('.invest-card').forEach(card=>{
    card.querySelector('.invest-head').addEventListener('click', ()=>{
      card.classList.toggle('open');
    });
  });
}

// ============================================================
// CHAT SCREEN — guided, rule-based, hands off to WhatsApp
// ============================================================
const chatLog = document.getElementById('chatlog');
let chatState = { step:0, goal:null, age:null, surplus:null };

function addMsg(text, who='bot'){
  const div = document.createElement('div');
  div.className = 'msg '+who;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
function addQuickReplies(options, onPick){
  const wrap = document.createElement('div');
  wrap.className = 'quick-replies';
  options.forEach(opt=>{
    const b = document.createElement('button');
    b.className = 'qr-btn';
    b.textContent = opt;
    b.addEventListener('click', ()=>{
      wrap.remove();
      addMsg(opt, 'user');
      onPick(opt);
    });
    wrap.appendChild(b);
  });
  chatLog.appendChild(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function startChat(){
  chatLog.innerHTML = "";
  chatState = { step:0 };
  setTimeout(()=>{
    addMsg("Hi! 👋 I'm here to get you connected with your advisor. What would you like help with?");
    addQuickReplies(
      ["Plan my retirement","Plan for my child's future","Buy a home","Grow my wealth","Just exploring"],
      (choice)=>{
        chatState.goal = choice;
        setTimeout(()=>{
          addMsg("Got it. Which age group are you in?");
          addQuickReplies(["20s","30s","40s","50s","60+"], (age)=>{
            chatState.age = age;
            setTimeout(()=>{
              addMsg("Last one — roughly how much can you invest each month toward this?");
              addQuickReplies(["Under ₹10,000","₹10,000 – ₹25,000","₹25,000 – ₹50,000","Above ₹50,000"], (surplus)=>{
                chatState.surplus = surplus;
                setTimeout(()=>{
                  addMsg("Perfect — I've put that together for your advisor. Tap below to continue the conversation on WhatsApp, where they can go through the numbers with you directly.");
                  const btnWrap = document.createElement('div');
                  btnWrap.style.marginTop = '4px';
                  const a = document.createElement('a');
                  a.href = buildWaLink(
                    `Hi! I used the Wealth Planner app.\n\nGoal: ${chatState.goal}\nAge group: ${chatState.age}\nMonthly investable amount: ${chatState.surplus}\n\nCould we discuss a plan?`
                  );
                  a.target = "_blank"; a.rel = "noopener";
                  a.className = 'btn-secondary';
                  a.style.display = 'block';
                  a.style.textAlign = 'center';
                  a.style.textDecoration = 'none';
                  a.textContent = "Continue on WhatsApp →";
                  btnWrap.appendChild(a);
                  chatLog.appendChild(btnWrap);
                  chatLog.scrollTop = chatLog.scrollHeight;
                }, 400);
              });
            }, 400);
          });
        }, 400);
      }
    );
  }, 300);
}

// ============================================================
// INIT
// ============================================================
renderAgeScroll();
renderGoalGrid();
selectedGoal = "retirement";
renderGoalGrid();
renderGoalCalc();
renderCompoundCalc();
renderInflationCalc();
renderTaxCalc();
renderInvestFilters();
renderInvestList();
startChat();
