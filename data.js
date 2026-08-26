// ============================================================
// WEALTH PLANNER — DATA LAYER
// All figures are indicative/illustrative for planning purposes
// only — not investment advice. Returns, tax rules and limits
// change; verify current figures before presenting to a client.
// ============================================================

// ---------- WhatsApp handoff config ----------
// TODO: replace with your actual WhatsApp Business number
// in international format, no + or leading zeros, e.g. "919812345678"
const ADVISOR_WHATSAPP_NUMBER = "91XXXXXXXXXX";

// ---------- Age groups ----------
const AGE_GROUPS = [
  { id:"20s", label:"20s · Starting out" },
  { id:"30s", label:"30s · Family building" },
  { id:"40s", label:"40s · Peak earning" },
  { id:"50s", label:"50s · Pre-retirement" },
  { id:"60plus", label:"60+ · Retired" },
];

// ---------- Goal templates ----------
// inflation: assumed annual cost inflation for this goal type
// defaultReturn: a reasonable pre-goal blended portfolio return to suggest
const GOAL_TEMPLATES = [
  {
    id:"retirement", name:"Retirement", tag:"Long-term · 15-30 yrs",
    icon:"retirement", inflation:6, defaultReturn:11,
    costLabel:"Today's monthly expense you want to maintain",
    costDefault:50000, yearsLabel:"Years left to retirement", yearsDefault:25,
    note:"We size the retirement corpus using a 25× annual-expense rule at retirement, then work out the SIP needed to build it."
  },
  {
    id:"child_edu", name:"Child's Education", tag:"Medium-term · 10-18 yrs",
    icon:"education", inflation:8, defaultReturn:12,
    costLabel:"Course cost in today's terms", costDefault:2000000, yearsLabel:"Years until admission", yearsDefault:14,
    note:"Education costs in India have historically outpaced general inflation — we use a higher 8% assumption by default."
  },
  {
    id:"child_marriage", name:"Child's Wedding", tag:"Long-term · 15-25 yrs",
    icon:"wedding", inflation:7, defaultReturn:11,
    costLabel:"Wedding budget in today's terms", costDefault:1500000, yearsLabel:"Years to the event", yearsDefault:20,
    note:"A long runway means equity-heavy allocation can do most of the work here."
  },
  {
    id:"home", name:"Buy a Home", tag:"Medium-term · 5-10 yrs",
    icon:"home", inflation:6, defaultReturn:9,
    costLabel:"Down payment needed in today's terms", costDefault:2500000, yearsLabel:"Years to purchase", yearsDefault:7,
    note:"Shorter horizons call for a more debt-heavy, capital-protecting mix as the goal nears."
  },
  {
    id:"wealth", name:"Wealth Creation", tag:"Flexible horizon",
    icon:"wealth", inflation:6, defaultReturn:12,
    costLabel:"Target corpus in today's terms", costDefault:10000000, yearsLabel:"Investment horizon (years)", yearsDefault:15,
    note:"An open-ended goal — the target itself is what should grow with your ambitions over time."
  },
  {
    id:"emergency", name:"Emergency Fund", tag:"Immediate · 0-1 yr",
    icon:"emergency", inflation:0, defaultReturn:6,
    costLabel:"Monthly household expense", costDefault:40000, yearsLabel:"Months of cover wanted", yearsDefault:6, isEmergency:true,
    note:"Kept in liquid funds or a sweep-in FD — the job here is instant access, not growth."
  },
];

// ---------- Investment options database ----------
// risk: low | moderate | high
const INVESTMENT_OPTIONS = [
  {
    id:"fd", name:"Fixed Deposit", category:"debt", risk:"low",
    returns:"6.5% – 7.5% p.a.", lockIn:"7 days – 10 yrs (flexible)",
    liquidity:"Premature withdrawal allowed, with penalty",
    taxation:"Interest taxed at your income slab rate every year",
    minInvest:"₹1,000 (varies by bank)",
    idealFor:"Emergency fund, short-term goals, risk-averse investors",
    summary:"The default safe harbour — guaranteed return, bank-backed, but interest is fully taxable and rarely beats inflation after tax."
  },
  {
    id:"ppf", name:"Public Provident Fund (PPF)", category:"debt", risk:"low",
    returns:"~7.1% p.a. (govt-set quarterly)", lockIn:"15 years (partial withdrawal from yr 7)",
    liquidity:"Low — long lock-in, loan facility from yr 3",
    taxation:"EEE — contribution, growth and maturity all tax-free",
    minInvest:"₹500/yr, max ₹1.5L/yr",
    idealFor:"Long-term goals, retirement, conservative investors wanting tax-free compounding",
    summary:"One of the few true EEE instruments left — the tax-free compounding matters more than the headline rate."
  },
  {
    id:"epf", name:"EPF / VPF", category:"debt", risk:"low",
    returns:"~8.25% p.a. (govt-set)", lockIn:"Till retirement/job change (VPF flexible top-up)",
    liquidity:"Low — partial withdrawal rules apply",
    taxation:"EEE up to ₹2.5L/yr own contribution; interest above that is taxable",
    minInvest:"Statutory % of salary; VPF voluntary top-up",
    idealFor:"Salaried employees — often the single largest retirement asset by default",
    summary:"Voluntary Provident Fund (VPF) is an underused lever — same safety and rate as EPF, fully your choice to increase."
  },
  {
    id:"mf_equity", name:"Equity Mutual Funds (SIP)", category:"equity", risk:"high",
    returns:"10% – 14% p.a. (long-term average, not guaranteed)", lockIn:"None (ELSS: 3 yrs)",
    liquidity:"High — redeemable in 1-3 working days",
    taxation:"LTCG (>1yr) 12.5% above ₹1.25L/yr; STCG 20%",
    minInvest:"₹500/month via SIP",
    idealFor:"Goals 7+ years away — retirement, child's future, long-term wealth creation",
    summary:"The workhorse of long-term goals. Volatile year to year, but SIPs turn that volatility into a buying advantage over time."
  },
  {
    id:"elss", name:"ELSS (Tax-Saving Funds)", category:"equity", risk:"high",
    returns:"10% – 14% p.a. (long-term average, not guaranteed)", lockIn:"3 years (shortest among 80C options)",
    liquidity:"Locked for 3 years, then fully liquid",
    taxation:"Section 80C deduction up to ₹1.5L (old regime); LTCG rules same as equity funds",
    minInvest:"₹500/month via SIP",
    idealFor:"Old-regime taxpayers wanting to combine tax saving with equity growth",
    summary:"Same engine as an equity fund, with the shortest lock-in of any 80C product — useful only if you're on the old tax regime."
  },
  {
    id:"mf_debt", name:"Debt Mutual Funds", category:"debt", risk:"moderate",
    returns:"6.5% – 8% p.a.", lockIn:"None (some have exit load if sold early)",
    liquidity:"High — redeemable in 1-2 working days",
    taxation:"Taxed at your income slab rate (indexation benefit removed since Apr 2023)",
    minInvest:"₹500/month via SIP",
    idealFor:"Parking money for goals 1-3 years away; better liquidity than an FD",
    summary:"Lost its old tax edge over FDs, but still useful for liquidity and laddering short-term goals."
  },
  {
    id:"nps", name:"National Pension System (NPS)", category:"hybrid", risk:"moderate",
    returns:"9% – 11% p.a. (market-linked, equity+debt mix)", lockIn:"Till age 60 (partial withdrawal allowed for specific needs)",
    liquidity:"Very low — designed for retirement only",
    taxation:"Extra ₹50,000 deduction under 80CCD(1B); 60% of maturity corpus tax-free, 40% must buy an annuity",
    minInvest:"₹500/contribution, ₹1,000/yr minimum",
    idealFor:"Retirement planning, especially for the extra tax deduction beyond 80C",
    summary:"The most tax-efficient way to save an extra ₹50,000 specifically for retirement — but your money is locked away till 60."
  },
  {
    id:"sgb", name:"Sovereign Gold Bonds / Gold ETF", category:"commodity", risk:"moderate",
    returns:"Tracks gold price + 2.5% p.a. interest (SGB only)", lockIn:"8 yrs (SGB, tradeable on exchange after 5)",
    liquidity:"Moderate — SGBs tradeable on exchange, ETFs liquid daily",
    taxation:"SGB: capital gains at maturity fully tax-free; interest taxed at slab rate",
    minInvest:"1 gram equivalent",
    idealFor:"Portfolio diversification, hedge against inflation and currency depreciation",
    summary:"SGBs are the better version of physical gold — no locker, no making charges, plus 2.5% annual interest on top."
  },
  {
    id:"equity_direct", name:"Direct Equity (Stocks)", category:"equity", risk:"high",
    returns:"Highly variable — long-term index average ~12-14% p.a.", lockIn:"None",
    liquidity:"Very high — sell anytime market is open",
    taxation:"LTCG (>1yr) 12.5% above ₹1.25L/yr; STCG 20%",
    minInvest:"Price of 1 share",
    idealFor:"Investors with the time, knowledge and temperament to research and hold individual businesses",
    summary:"Highest potential, highest dispersion of outcomes — needs real research or it becomes speculation, not investing."
  },
  {
    id:"term_insurance", name:"Term Life Insurance", category:"protection", risk:"low",
    returns:"Not an investment — pure risk cover", lockIn:"Policy term (no maturity value)",
    liquidity:"None — no surrender value on pure term plans",
    taxation:"Premium: 80C deduction; payout to family: tax-free under Sec 10(10D)",
    minInvest:"Premium varies by age, cover and term",
    idealFor:"Anyone with financial dependents — the foundation before any investment plan",
    summary:"Not a wealth product — it's what protects every other goal on this list if you're not around to fund them."
  },
  {
    id:"ulip", name:"ULIP", category:"hybrid", risk:"moderate",
    returns:"Market-linked, net of insurance + fund charges", lockIn:"5 years",
    liquidity:"Low during lock-in",
    taxation:"Maturity tax-free under 10(10D) if annual premium ≤ ₹2.5L",
    minInvest:"Varies by plan",
    idealFor:"Investors wanting insurance and market-linked investment bundled together",
    summary:"Bundles protection and investment — evaluate the charge structure carefully against buying term insurance and a mutual fund separately."
  },
  {
    id:"real_estate", name:"Real Estate", category:"property", risk:"moderate",
    returns:"Highly location-dependent; historically 6-10% p.a. + rental yield 2-3%", lockIn:"Effectively illiquid",
    liquidity:"Very low — can take months to years to sell",
    taxation:"LTCG 12.5% after 2 yrs (no indexation) or 20% with indexation, whichever is lower*",
    minInvest:"High ticket size",
    idealFor:"Large corpus holders wanting a tangible asset and rental income",
    summary:"Illiquid and lumpy, but a real diversifier for those with the capital to hold it through a full cycle."
  },
  {
    id:"corp_bonds", name:"Corporate Bonds / NCDs", category:"debt", risk:"moderate",
    returns:"7.5% – 9.5% p.a. (credit-rating dependent)", lockIn:"Varies — tradeable on exchange if listed",
    liquidity:"Moderate — depends on issue and rating",
    taxation:"Interest taxed at slab rate; capital gains per debt fund rules",
    minInvest:"Varies by issue, often ₹10,000+",
    idealFor:"Investors wanting yield above FDs, willing to take on issuer credit risk",
    summary:"Higher yield than a bank FD comes with real credit risk — check the rating, not just the coupon."
  },
];

const INVEST_FILTERS = [
  { id:"all", label:"All" },
  { id:"equity", label:"Equity" },
  { id:"debt", label:"Debt" },
  { id:"hybrid", label:"Hybrid" },
  { id:"protection", label:"Protection" },
  { id:"commodity", label:"Gold" },
  { id:"property", label:"Property" },
];

// ---------- Income tax slabs — FY 2025-26 (AY 2026-27), India ----------
const TAX_NEW_REGIME_SLABS = [
  { upto:400000, rate:0 },
  { upto:800000, rate:5 },
  { upto:1200000, rate:10 },
  { upto:1600000, rate:15 },
  { upto:2000000, rate:20 },
  { upto:2400000, rate:25 },
  { upto:Infinity, rate:30 },
];
const TAX_OLD_REGIME_SLABS = [
  { upto:250000, rate:0 },
  { upto:500000, rate:5 },
  { upto:1000000, rate:20 },
  { upto:Infinity, rate:30 },
];
const TAX_CONFIG = {
  newRegime: { slabs:TAX_NEW_REGIME_SLABS, standardDeduction:75000, rebateLimit:1200000, rebateMax:60000 },
  oldRegime: { slabs:TAX_OLD_REGIME_SLABS, standardDeduction:50000, rebateLimit:500000, rebateMax:12500 },
  cessRate:4,
  surchargeSlabs:[
    { above:5000000, upto:10000000, rate:10 },
    { above:10000000, upto:20000000, rate:15 },
    { above:20000000, upto:Infinity, rate:25 }, // capped at 25% for new regime & capital gains; old regime can go to 37% on non-capital-gains income
  ],
};
