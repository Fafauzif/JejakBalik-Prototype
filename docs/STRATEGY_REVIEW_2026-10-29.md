# JejakBalik: strategy, feasibility, differentiation, and competition review

Prepared 29 October 2026, Asia/Jakarta. A strategy and implementation brief for the owner, not a submission-ready competition essay.

**Recommendation:** retain JejakBalik’s identity and operating prototype, but focus the proposition on **funded, capacity-aware community collection with accountable downstream outcomes**. Begin with an anchor institution and a small collection cluster. Make AI useful through a bounded exception-resolution workflow. Treat corporate asset decision support as a separate expansion option requiring different evidence and approvals.

The central opportunity is to turn scattered intentions to return electronics into **accepted, funded batches that can actually reach a suitable destination**. The miniature city and seven characters explain that mechanism. They do not establish its commercial or environmental performance.

## Charter

- **Goal:** choose a defensible product direction, identify its payer and operating mechanism, stress-test economics, and specify the highest-value changes and validation work before the competition.
- **Scope / object / subjects:** Indonesian circular electronics services / JejakBalik’s competitive and operational viability / current source archive, public collection workflows, institutional buyers, recovery partners, corporate disposition, agent-assisted coordination.
- **Type:** exploratory research followed by a descriptive implementation brief. Initial product knowledge was limited; the correct context pack and source ZIP arrived during the review.
- **Questions:** Q1 What is built? Q2 What do the official materials establish? Q3 What might the organizers and partners value? Q4 Where is differentiation plausible? Q5 Who pays and what must the operating model resolve? Q6 Where would AI add value? Q7 What should change in the website? Q8 What evidence could overturn the recommendation?
- **Completion standard:** trace material factual claims to inspected files or opened primary sources; distinguish assumptions from findings; provide alternatives, economics, pilot gates, and prioritized changes.

## Canonical sources

| Rank | Source | Use and limit |
|---|---|---|
| 1 | Lintasarta official fact sheet [S1] | Program and corporate-process facts; does not prove interest in JejakBalik |
| 1 | Lintasarta program and lifecycle articles [S2–S5] | Stated objectives and process context; some dates and publication caveats differ from the fact sheet |
| 1 | EwasteRJ website and company-authored LinkedIn description [S6–S7] | Existing marketed capabilities; not an independent license or certification audit |
| 2 | DKI DLH collection service [S8] | Existing public alternative and its own eligibility conditions |
| 1 | SCG account of Mitra10/Rekosistem program [S9] | Evidence that electronics trade-in incentives and collection partnerships already exist |
| 2 | BPK regulation record and NIST guidance [S10–S11] | Regulatory scope and technical data-sanitization reference; no blanket compliance conclusion |
| 1 | Vodafone’s commissioned consumer study summary [S12] | Consumer hypotheses; European findings are not Indonesian prevalence estimates |
| 3 | Supplied `Jejak_Balik_Project(1).zip`, extracted as `JejakBalik/` | Static source and documentation inspection; no authenticated GitHub snapshot or fresh runtime verification |
| Supplied record | `context-source/AksiCintaBumi_Competition_and_Essay_Hub.md` [L1] | Owner-provided transcription of the guidebook and historical working context; original current organizer PDF not independently inspected |
| Supplied record | `Jejak_Balik_Master_Context.md` and brand deck [L2] | Product intent, prior test reports, embedded screenshots; prior test reports are not tests executed in this review |

**Access boundary:** the supplied GitHub URL returned 404 through the available public routes. This does not establish whether it is private, moved, or unavailable for another reason. Analysis proceeded from the correct source archive. Historical Jejaka/Surabaya files and the E-Fest/Unilever PDF were excluded as different projects. No website code, deployment, real logistics, partner communication, or publication was changed.

## Findings ledger

| ID | Finding | Evidence | Answers |
|---|---|---|---|
| F01 | JejakBalik is a browser-only authored operational prototype with five workspaces; no runtime AI, logistics, payment, or processor integrations | `README.md:5`; package and inspected domain/UI files | Q1, Q6 |
| F02 | The engine checks scoped approvals, ordered lifecycle transitions, data clearance, and receiving capacity | `src/domain/engine.ts:43–75`, `:122–159`; `session.ts` | Q1, Q5 |
| F03 | Canonical routes are authored; route filtering preserves/removes stops rather than optimizing their ordering | `src/domain/fixtures.ts`; `context.ts`; `routing.ts:17–69` | Q1, Q6 |
| F04 | Exploration genuinely allocates capacity across windows, but uses templates and fixed rules | `src/domain/exploration.ts:79–87`, `:144–179`, `:224–266` | Q1 |
| F05 | Gross recovery value is estimated from completed assets, assumed values/multipliers, or whole-device mass times an assumed material rate | `metrics.ts:54–64`; `FINANCIAL_ASSUMPTIONS.json` | Q5 |
| F06 | The sample contribution includes assumed service funding and sponsorship, with major costs excluded | `metrics.ts:100–107`; finance fixture; `docs/DATA_AND_METRICS.md` | Q5 |
| F07 | The equal-work comparator is dedicated household/handling-class round trips, not an existing operator’s measured practice | `metrics.ts:38–53`; `docs/DATA_AND_METRICS.md` | Q4, Q5 |
| F08 | The supplied guidebook transcription assigns 25% to relevance, 20% to data/argument, 25% to impact/feasibility, 15% each to originality and writing | [L1], lines 189–199 | Q2, Q7 |
| F09 | Lintasarta’s fact sheet identifies the program, competition role, community collection target, and distinction from corporate disposal | [S1], sections 1, 3, 6, 8 | Q2, Q3 |
| F10 | EwasteRJ already markets collection, reporting, ITAD, refurbishment, secure logistics, and reverse-logistics development | [S6–S7] | Q3, Q4 |
| F11 | DKI offers pickup, drop-off points, and request tracking; its pickup terms include a 5 kg minimum and DKI identification | [S8] | Q4 |
| F12 | A retailer electronics trade-in and reward program already operates through Mitra10 and Rekosistem | [S9] | Q4 |
| F13 | Existing public rules distinguish household-related hazardous-containing waste from certain business/activity residues | [S10], official abstract | Q5 |
| F14 | NIST SP 800-88 Rev.2 is the September 2025 media-sanitization reference, superseding Rev.1 | [S11] | Q5, Q6 |
| F15 | A European consumer study identifies backup use, data concerns, uncertainty, and sentimental attachment as reasons for retaining devices | [S12] | Q4, Q8 |
| F16 | The supplied performance report records software-rendering results and leaves target-laptop acceptance open | `docs/PERFORMANCE.md` | Q7 |

**Open questions:** actual buyer willingness to pay, partner workflow pain, carrier participation, real device mix, local category-specific costs, contractual value ownership, accepted downstream capacity, current competition amendments, and the significance of AI relative to a checklist remain unverified. These are decision risks, not inferred facts.

## Scope filter

Discarded “pickup + tracking + rewards is inherently novel”: existing services already provide important parts of that proposition. Revised “recovered value funds free pickup” to a hypothesis requiring contract income and verified settlement economics. Kept household/community collection separate from enterprise disposal. Excluded national-market-size arithmetic from revenue forecasting because waste generated is not accessible, paying demand.

## Object filter

Revised “seven AI agents” to “seven deterministic coordination roles in the current prototype.” Revised “optimized return routes” to “authored compatible collection routes and rule-based scheduling.” Restricted numerical results to their fictional cohort and cost boundary. Treated prior rendering/test evidence as historical documentation. The new focused operating model below is a recommendation, not a claim that the owner already implemented or approved it.

## Conclusions

### 1. What is good already, and what is actually missing

JejakBalik has a stronger foundation than a typical collection-form concept. It joins household requests, vehicle assignments, hub queues, disposition pathways, and financial reporting in one consistent state model. Its holds can remain unresolved; playback does not silently supply consent. Completed outcomes and collected mass have different denominators. Those features support a story about accountable coordination. [F01–F07]

The source also supports an important distinction: **the prototype demonstrates that a coherent workflow can be represented; it does not yet demonstrate that the workflow improves real collection operations.**

| Keep | Strengthen next | Avoid making the next priority |
|---|---|---|
| Warm identity and original characters | Identifiable service buyer and priced scope | More characters or elaborate agent conversations |
| Shared event/state model | Real intake, handoff, and outcome evidence contracts | A generic chatbot |
| Safety and data holds | Responsibility, deadline, and funded resolution for each hold | Forcing every story into a successful ending |
| Capacity-aware allocation | Receiving-party acceptance and expiry | A citywide unlimited pickup promise |
| Equal-work financial comparison | Realistic batched baseline and full costs | Bigger percentage-saving headlines |
| City/hub/device explanation | A fast operator task queue and mobile intake | Photorealistic 3D as the core differentiator |

Your central bottleneck has moved from “can I show the idea?” to **“can I defend who needs this, why it outperforms a simpler system, and how the physical work and money close?”**

### 2. What the guidebook data changes

The supplied competition record describes a 3–5-page Indonesian essay. The prototype should help verify an argument the essay itself makes. On that record, relevance, evidence/argumentation, and impact/feasibility total **70%** of the base score. Extra visual spectacle should not consume the work needed to strengthen those areas. [F08; L1]

The official fact sheet confirms Lintasarta’s organizing role and EwasteRJ’s management role. It sets a **380 kg collection target**, not an achieved result. Its corporate data concerns a different stream: **48% of dismantled devices received at the warehouse are repaired and returned to production**, whereas assets actually entering corporate disposal currently go to **scrap**. These are different cohorts, not contradictory percentages. The zero-NBV rule concerns accounting eligibility, not absence of residual economic value. It states that AI is not currently used in Lintasarta’s disposal process. [S1]

Do not replace JejakBalik’s fictional 62.5% functional-retention result with the official 48%. Do not add the prototype’s 189.64 kg to the program target or describe the model as a Lintasarta pilot. [F05, F09]

There are two source qualifications worth retaining. The fact sheet lists September–November while some program articles say August–November; use the fact sheet’s period for competition references and separately identify kick-off dates if needed. Also, the lifecycle article repeats the 48% figure but requests verification before external publication; resolve that caveat before making this number a prominent submitted claim. [S1, S2, S5]

**The strategic lesson:** define the population and decision point before proposing a recovery rate. A warehouse return, a formally disposed corporate asset, and a household phone sitting unused are not interchangeable inventory.

### 3. Why might the partners care?

Verified public positioning connects Lintasarta’s digital infrastructure with responsible physical-device lifecycles and connects its social programs with education, innovation, and environmental responsibility. Its AI-management announcement emphasizes governance and risk controls. [S3–S4]

The following are **inferences about plausible value**, not private sponsor motives or evidence of procurement interest:

| Stakeholder | Plausible objective | What JejakBalik could demonstrate | Evidence needed before claiming interest |
|---|---|---|---|
| Lintasarta program team | Repeatable participation with credible outcomes | A bounded collection workflow, costed access, and reconcilable reporting | Program-owner feedback and a concrete pilot decision |
| Lintasarta technology team | A useful, governed AI application | Tool-limited assistance with visible constraints, human authorization, and evaluation | Technical review and actual integration scope |
| EwasteRJ operations | Accepted batches with less avoidable coordination work | Better intake completeness, capacity reservations, manifests, and evidence follow-up | Walk through its existing workflow and identify measurable rework |
| Campus/host institution | Convenient service with manageable staff burden | Fixed collection windows and clear responsibility | Named budget owner, site access, staff-time estimate |
| BEM/environmental organizers | Student insight translated into an applicable proposal | Specific problem, modest proof, clear writing and a repeatable method | Organizer brief and evaluation criteria |

EwasteRJ already presents itself as an operator across this lifecycle. Pitching JejakBalik as inventing its services or repairing an assumed technological deficiency would weaken credibility. The collaborative hypothesis is narrower: **can a lightweight coordination layer improve the quality and predictability of incoming work?** [F10]

A strong partner proposition would be: “We want to test whether a structured, capacity-aware intake and evidence process reduces your coordination burden for one community collection cluster.” It creates an operational question the partner can answer. It does not presume a signed relationship.

### 4. Three strategic directions

| Direction | Initial buyer | Main advantage | Main difficulty | Recommendation |
|---|---|---|---|---|
| A. Citywide free household pickup | Unclear without funded coverage | Broad public story; close to current household UI | Fragmented demand, low density, many categories, absent payer | Keep as long-term access vision, narrow the initial promise |
| B. Institution-funded community collection | A campus, office/community host, or program sponsor | Concentrated access, identifiable buyer, bounded capacity, existing prototype fit | Must prove willingness to pay and better workflow than spreadsheets | **Recommended first proposition** |
| C. Enterprise pre-disposal decision support | Corporate asset/operations function | Closer to corporate lifecycle decisions and potentially higher-value contracts | INTAN integration, accounting/security policies, procurement, restricted data | Discovery option; pursue only with an actual corporate problem owner |

Option B preserves the product while improving its feasibility. It is a business-model and workflow refinement, not a wholesale rebrand.

Option C could become stronger if you gain lawful access to real asset records and an owner willing to test a decision process. Its useful question would be which assets warrant repair or internal redeployment **before disposal approval**, not how to claim that all formally scrapped assets should be donated. Physical functionality does not ensure secure, supported, or permitted reuse. Avoid assuming authorization to change existing corporate policies. [S5]

**Decision rule:** start with B under the evidence available. Reconsider C if an asset manager supplies a specific decision backlog, accessible records, acceptance criteria, and policy constraints. Do not expand B and C simultaneously for a short essay.

### 5. The recommended operating mechanism

Proposed working definition:

> JejakBalik coordinates institution-funded electronics collection: it groups requests into feasible batches, matches them to confirmed handling and receiving capacity, and records accountable handoffs through to supported outcomes.

The initial unit of operation should be a **funded collection cluster**, not an entire city. A reasonable pilot design is one anchor institution, a small number of staffed handover points, fixed collection windows, and a downstream operator whose acceptance criteria are known. These are proposed boundaries, not secured sites.

The important sequence is:

1. An owner indicates what they wish to do with the device: recycle, seek valuation, donate where accepted, or repair-and-return.
2. Intake records enough information to establish handling needs; unknown answers remain unknown.
3. A suitable receiver provisionally accepts the category and volume for a stated window.
4. Funding and transport compatibility are checked.
5. The user receives an appropriate access option: a staffed drop-off, pooled round, scheduled bulky collection, specialist referral, or later window.
6. Custody is acknowledged at handover and reconciled at receipt.
7. Triage may revise the planned pathway; changes requiring owner consent pause for that consent.
8. An outcome becomes reportable only at the evidence level actually achieved.

This reverses a dangerous assumption: collecting something first does not guarantee that a suitable destination will accept it later.

A receiver acceptance should specify the category, capacity, window, handling requirements, expiry, and responsible contact. A changed condition invalidates the old promise where necessary. The current capacity model can help explain this; production needs an attributable receiver action. [F02, F04]

**Useful first access niche:** small deposits aggregated around a campus or community handover. DKI’s own collection service has a 5 kg doorstep minimum and separate drop-off options. Aggregation may help some users whose individual loads are too small, but the threshold belongs to that service and does not prove a general market gap. Validate local demand and compare against existing dropboxes. [F11]

Use an operator-approved category policy. An early low-complexity cohort might include intact accessories, with data-bearing and specialist devices handled through separately agreed processes. That safer mix may generate little recovery revenue, so its service funding must stand on its own. Preserve all ten prototype categories as an explanation of the future network rather than promise all ten in the first field round.

**Proposed public promise:** “Penyerahan elektronik tanpa biaya dalam program dan jadwal yang didanai. Jalur serta hasil penanganannya dapat ditelusuri.” Specific eligibility belongs beside the request flow.

### 6. The financial model: coherent arithmetic, unproven commercial assumptions

The base source model uses the following authored scenario. These amounts are not partner quotations, buyer commitments, cash received, or audited results. [F05–F06]

| Component | IDR |
|---|---:|
| Estimated gross recovered value | 15,244,370 |
| Assumed platform share, 20% | 3,048,874 |
| Assumed service contract fee | 1,800,000 |
| Assumed community sponsorship | 700,000 |
| Total modeled platform receipts | 5,548,874 |
| Collection cost | 637,700 |
| Processing cost | 3,170,000 |
| Data-clearance cost | 63,000 |
| Batch operating contribution | **1,678,174** |

Contribution = platform share + service fee + sponsorship − collection − processing − data clearance.

Recalculation gives a 30.2% contribution margin on modeled platform receipts, before excluded costs. Service funding and sponsorship supply 45.1% of those receipts. That does not make the model illegitimate: reliable environmental services can have paying institutional customers. It does mean the buyer and service scope are foundational rather than optional additions.

| Mechanical sensitivity; all other inputs held fixed | Contribution, IDR |
|---|---:|
| Base | 1,678,174 |
| No sponsorship | 978,174 |
| No service contract fee | **−121,826** |
| Neither service fee nor sponsorship | **−821,826** |
| Gross recovery value 25% lower | 915,956 |
| Gross recovery value 50% lower | 153,737 |
| Collection cost 50% higher | 1,359,324 |
| Processing cost 25% higher | 885,674 |
| Gross value −25%, collection +50%, processing +25% | **−195,395** |

These are arithmetic stress tests, not forecasts; costs and yields may also move together in reality. The combined downside is negative even before overhead.

#### Resolve the settlement waterfall

The remaining 80% of estimated gross value is Rp12,195,496. Who receives it, and what do they pay for?

- If the household receives it, JejakBalik resembles a consignment or buyback coordinator and needs valuation, title, deduction, and payment rules.
- If a processor retains it to perform recovery, separately charging all processing costs may be legitimate or may double-count costs; the agreement must establish which.
- If it is split among several parties, specify the split and cost burden for every disposition.

Also separate estimated retained value from actual sales proceeds. Returning a repaired device to its owner preserves value but does not automatically create resale cash. A donation creates no sale receipt. Material proceeds may be paid on graded output, or on feedstock purchased by a processor; these are different pricing models.

The current material formula uses whole-device mass times Rp9,000/kg. That is only commercially meaningful if a processor actually buys the relevant feedstock on that basis, or if recoverable yields and treatment deductions are added. The data-clearance fixture is Rp3,500 per device; obtain a scoped quote before presenting it as feasible sanitization pricing. [F05]

Before expansion, draw a waterfall for each pathway: owner permission → custody/title terms → inspection → approved costs → sale/return/treatment → actual settlement → recipient payments → platform fee. Include failed repairs, unsold devices, warranty/returns, negative-value fractions, and settlement delays.

#### A defensible funding structure

Proposed recurring funding should pay for a defined service:

- A readiness/program fee covers scheduling, trained coordination, intake support, and reporting for a specified site or period.
- Variable handling charges follow agreed category and complexity, with transparent caps.
- Sponsor funding buys an explicit amount of community access or covers unattractive fractions; it is not an unspecified donation balancing the spreadsheet.
- A reserve remains available for accepted specialist/negative-value work and exceptions.
- Recovery sharing is supplementary where title and realized proceeds justify it.

An institution may be both buyer and sponsor. If so, show one real budget split into service and access obligations rather than imply two independent customers.

Grants can fund development and pilot learning. A recurring service still needs paid labor, support, transport, equipment, storage where applicable, incidents, and working capital funded. Do not add software subscriptions on top unless someone will pay for software separately from the managed program.

**Stock versus flow matters:** clearing stored electronics may produce a strong first event and a weak second event. Test replenishment before promising monthly volume. Quarterly collection or a readiness contract may fit better than a monthly tonnage commitment.

### 7. A hidden incentive problem already visible in the prototype

The source’s specialist-held branch has Rp1,951,974 contribution versus Rp1,678,174 in the complete branch: a Rp273,800 apparent improvement. The two excluded specialist assets generate no modeled recovered value, while collection/treatment costs are avoided and funding stays fixed. The documentation honestly acknowledges this boundary. [L3; finance and branch fixtures]

This is strategically valuable evidence of why **profit per completed short window is an incomplete objective**. A system rewarded only for short-run contribution could prefer deferring the difficult waste.

Preserve safety holds. Add an explicit outstanding-service obligation and earmarked reserve, separate from cash already spent. Report the held quantity, owner of the next action, expected treatment cost, and age of the hold. A delayed cost is not necessarily a permanent saving. Do not book a reserve as paid expense twice when settlement later occurs.

The same issue affects impact denominators. A 100% completion rate among collected devices can coexist with difficult requests never collected. Keep request coverage, acceptance, collection, and evidenced outcomes visible together. This is a strong reason to preserve the existing denominator discipline and extend it, rather than replacing it with one success percentage.

There is a second accounting limitation: `metrics.ts:62–66` charges processing only when an asset completes and data clearance only when clearance occurs. A held device may already have consumed intake, diagnosis, storage, or a failed sanitization attempt. Meanwhile the fixed funding enters every snapshot without a contractual earning schedule. Split costs by the event that incurs them, and separate cash received, revenue earned, estimated value, actual settlement, and remaining obligations. Otherwise a delayed outcome can make the current window look healthier than the whole service will be.

### 8. Differentiate from the strongest substitute

Existing operators already collect electronics; existing programs already offer incentives and reporting. JejakBalik must show a measurable improvement over **WhatsApp + spreadsheet + an experienced partner coordinator**, or an existing collection service. [F10–F12]

| Proposed differentiation | Mechanism | Credible test |
|---|---|---|
| Receiver acceptance before commitment | Do not promise slots for work no destination can accept | Compare refused/reworked handoffs and clarification messages |
| Access-mode matching | Use drop-off, pooled rounds, bulky pickup, or referral as appropriate | Full cost and completed eligible handoffs by mode |
| Evidence follow-up | Missing acknowledgment or outcome becomes an assigned task | Evidence completeness and operator minutes per batch |
| Protected unattractive fractions | Budget and responsibility persist for negative-value items | Accepted specialist work completed safely within funded scope |
| Proportionate identity | Item-level data-bearing records; batch-level low-value material records | Logging burden versus ability to reconcile discrepancies |
| Accountable bounded assistance | Suggestions cannot override permits, capacity, data holds, or owner permission | Hard-constraint violations and useful operator time saved |

A device passport alone is not a moat. The defensibility could accumulate through working partner relationships, accepted intake formats, measured category costs, outcome reconciliation, and evidence that customers renew. Those assets are earned through operation, not the number of dashboard screens.

#### Fix the transport argument

The modeled 75.2 km versus 319 km produces 76.4% less distance; Rp637,700 versus Rp2,738,900 produces 76.7% lower modeled collection cost. This is a same-cohort comparison, which is good. The alternative is still 41 separate trips. An experienced operator may already batch pickups, so the percentage does not isolate JejakBalik’s advantage. [F07]

Compare four options where relevant: current partner practice; simple scheduled clusters; existing drop-off access; JejakBalik’s capacity-aware plan. Use the same accepted workload, completion criteria, operating boundary, and accounting treatment.

If backhaul remains central, show a carrier’s pre-existing route, collection detour, added dwell, handling compatibility, available space, timing, and actual acceptance. Present incremental distance/time separately from total distance. Current route labels and animations do not establish marginal backhaul savings. No existing transport partnership is verified.

The most useful technical improvement may be a transparent deterministic planner before any model integration: compare FIFO with a constrained insertion/route-improvement heuristic on the same small dataset. Check every changed plan for receiving capacity, handling compatibility, time windows, and required approvals. Show infeasibility rather than silently discard difficult work. A vehicle cancellation or receiver-capacity change should produce newly calculated alternatives, not just select a prepared story branch. That would demonstrate a real improvement in decision support without pretending an LLM is a routing solver.

### 9. Make AI visible through useful work

The present seven-role workspace uses authored records and deterministic statuses; it is not live multi-agent AI. That is compatible with a useful future design. It is not a basis for claiming autonomous operations. [F01–F04]

Keep the current rules engine authoritative. Add model assistance only where messy language or incomplete evidence creates work that rules alone handle poorly.

| Existing role | Useful proposed assistance | Authority boundary |
|---|---|---|
| Scout | Parse a message into draft intake fields and identify missing information | No invented device condition, ownership, or measurements |
| Pilah | Suggest a provisional pathway and explain uncertainty | Physical inspection/authorized staff decide actual condition |
| Mitra | Draft a partner inquiry or summarize a structured acceptance response | No invented capacity or binding commitment |
| Rute | Explain feasible plans produced by a scheduling/optimization tool | Model prose is not a route optimizer |
| Jaga | Explain rule failures and flag conflicting evidence | Cannot override data/safety holds |
| Kendali | Select the next authorized task and coordinate bounded tool calls | No unilateral dispatch, payments, or disposition release |
| Dampak | Draft a summary from reconciled event records | Cannot create certificates or convert plans into outcomes |

Implement these as roles around one controlled workflow; they do not require seven separate models. Begin with one high-value path: **messy intake → missing-field question → validated record → feasible plan → operator approval**. Compare against a form/checklist. If AI adds no useful improvement, retain deterministic automation.

A proposed exception demo: a user describes an old laptop ambiguously; the assistant asks about ownership/data status; receiving capacity then changes; a planning tool offers two feasible windows; the safety/data hold remains intact; the operator chooses a funded plan; reporting updates only from supporting records. Most of the state foundation already exists. The missing piece is a genuine, inspectable suggestion/tool/validation loop.

Show a compact decision card containing input evidence, proposed action, constraints checked, alternative, uncertainty, required approver, and changed result. Avoid theatrical walls of agent dialogue or hidden-reasoning displays.

Production would require a secure server for model credentials, authenticated roles, attributable event writes, partner acceptance, retry/idempotency handling, and controlled access to personal data. Replay remains appropriate for demonstration; operational history cannot be silently rewritten by moving a slider. Offline browser logic is not a trustworthy shared authority between organizations.

Evaluate hard-constraint adherence, extraction quality, unsupported assertions, clarification count, operator minutes, latency, and cost per successfully resolved task. Use a bounded test set including unknown devices, duplicate requests, revoked capacity, missing evidence, and unsafe/unauthorized releases. Synthetic tests establish behavior on those cases, not field effectiveness.

### 10. Website changes that strengthen the argument

The embedded desktop/mobile screenshots show a coherent warm visual system. Keep it. The important upgrade is making the operating decision and its evidence easier to inspect. A screenshot is design evidence, not proof of a usable live flow.

| Priority | Change | Why it matters | Acceptance criterion |
|---|---|---|---|
| P0 | Put the proposition and funded service boundary on the entry screen | Explains buyer, user, and actual promise immediately | A new reader can name the beneficiary, buyer hypothesis, and next step |
| P0 | Add a short “why this batch can run” panel | Makes capacity, receiver acceptance, and funding concrete | Source of each prerequisite visible; missing prerequisites block commitment |
| P0 | Add a decision inbox | Turns the twin into a usable work surface | Every exception has owner, deadline, evidence, next action |
| P0 | Show money waterfall and funding toggles | Makes viability inspectable | Totals reconcile; removing funding can produce negative results |
| P0 | Add a realistic comparator beside separate trips | Prevents a weak novelty claim | Same workload and boundaries; baseline assumptions visible |
| P0 | Add an evidence ladder to item/lot outcomes | Separates planned, received, and supported final outcomes | Missing evidence stays pending and is excluded from final claims |
| P1 | Add one genuine bounded AI workflow if feasible | Proves a contribution instead of a character label | Inputs, tool results, constraints, approval, and fallback inspectable |
| P1 | Show committed future cost for held items | Prevents misleading short-run margin | No silent disappearance of held inventory or treatment obligation |
| P1 | Give households access-mode choices | Improves density and keeps promises realistic | Eligibility and window reflect actual funded/accepted capacity |
| P1 | Provide a concise methodology/evidence page | Lets judges distinguish model, prototype, and proposed pilot | Direct access to assumptions, cohort definitions, sources, limitations |
| P2 | Profile the real presentation device | Reliability matters more than geometry count | Complete demo works on target hardware and with 2D fallback |

Suggested entry copy, a proposal rather than an existing claim:

**“Elektronik kembali bernilai. Setiap serah terima dapat ditelusuri.”**

“JejakBalik mengoordinasikan pengumpulan elektronik berbasis komunitas, menghubungkan jadwal, kapasitas mitra, serta bukti hasil dalam satu alur.”

Actions: **“Lihat satu perjalanan”**, **“Tinjau keputusan operasi”**, and **“Lihat asumsi biaya.”** Household access remains available, without forcing a judge to enter personal details.

Do not bury the twin: use selection to connect a request, receiver, route, hold, and evidence record. For routine operators, the list/queue can be primary and the 3D world optional.

The supplied performance report leaves integrated-laptop verification open and records low FPS under software rendering. Do not interpret that as proof that your laptop performs badly; do not promise 30 FPS without measuring it. Added 3D detail is a lower priority than reliable access to the operational story. [F16]

### 11. Hypotheses you may not have considered

These are testable hypotheses, not customer findings.

| Hypothesis | Business intuition | Smallest useful test | What would change the plan |
|---|---|---|---|
| The real competitor is keeping the device in a drawer | The owner retains backup value, memories, or control | Ask people to describe a specific retained device and the last failed attempt to release it | If backup/nostalgia dominates, more pickup availability alone will not convert them |
| Good devices leave through existing resale channels, leaving a costly residual mix | Valuable national e-waste is not the same as value accessible to this program | Record offered devices by condition and compare with actual partner acceptance/payouts | Reduce dependence on recovery sharing |
| One first campaign clears a stockpile rather than creating recurring flow | First-month demand can overstate renewal value | Observe a second collection cycle and budget-owner renewal decision | Move to periodic rounds/readiness pricing |
| The bottleneck is confirmed receiving capacity, not request volume | More demand can worsen backlogs | Follow each request until accepted by a receiver and record delays | Invest in partner coordination before acquisition |
| Privacy assistance unlocks devices that rewards do not | Perceived irreversible loss matters | Compare clear data/ownership explanation with convenience-only messaging; actual handoff is the outcome | Prioritize trusted process over points |
| Evidence work costs more than intake | Reporting becomes unpaid back-office work | Time staff from pickup request through downstream documentation | Price evidence administration explicitly |
| A repaired device can remain unsold or unsuitable | Technical repair is not productive second life | Track functioning devices through actual placement and later use | Add demand matching and aftercare before claiming functional impact |
| Waiting can be better than dispatching immediately | Density can improve economics within acceptable service time | Compare two feasible collection windows with full cost and user acceptance | Make scheduling flexibility a visible product feature |
| Backhaul capacity exists on paper but is unavailable for this handling class | Empty space is not authorized transport | Obtain an actual carrier acceptance and log constraints | Use scheduled dedicated rounds where needed |
| A sponsor values reliable modest results more than a large unverified counter | Reputational value depends on believable claims | Show a program owner a priced, bounded evidence package | Sell accountable service scope rather than tonnage theater |
| The highest-value AI use is resolving exceptions | Routine cases may be cheap to handle with rules | Time the same difficult cases using checklist vs assistance | Focus AI narrowly or remove unnecessary model calls |
| Informal collectors can improve access | Local networks may already solve discovery and transport | Interview collectors and test paid, agreed referral/collection roles | Integrate fairly instead of assuming displacement creates benefit |

Vodafone’s study supplies an external reason to investigate retention motives, but it covered five European countries. It cannot establish how many UI students or Jakarta households have those motives. The local evidence must be collected. [F15; S12]

### 12. Physical evidence, safety, and service quality

A useful passport needs a physical counterpart: an item tag or lot identifier that remains connected to the receiving acknowledgment. For data-bearing or high-value devices, individual identity is appropriate. For mixed low-value accessories, a weighed batch may be proportionate. Record splits/merges when sorting changes the unit of tracking.

Distinguish estimated intake weight, measured collection weight, accepted downstream weight, and recovered output. Reusing the input weight at every step does not establish material recovery. Define tolerances and discrepancy handling with the operator.

Production data clearance requires actual media identification, applicable sanitization method, execution/verification evidence, and authorized review. A release button records a decision; it does not erase data. NIST SP 800-88 Rev.2 provides current technical guidance, not a certificate issued to this project or a substitute for Indonesian obligations. [S11]

The regulatory record makes it inappropriate to assume one legal pathway for every household and corporate stream. Have a competent operating partner establish applicable classification and responsibilities for accepted categories, collection, storage, transport, and treatment. Software does not confer those permissions. [S10]

Include the downstream user in the definition of quality. Donation or resale should involve functionality, suitability, ownership, and support/return terms. Passing an unusable device to a recipient can simply move the disposal burden. Do not make successful reuse depend on unsafe disassembly by students or households.

## Next steps / Risks

### 13. A bounded validation plan

The following sequence is proposed work. No field pilot or partner interview was performed in this review.

**Stage 1: establish the workflow and payer.** Interview an actual collection coordinator/processor, an anchor-site organizer, and a budget owner. Ask for the last real batch: messages exchanged, rejected items, delays, staff minutes, documentation, actual settlement, and who paid. Ask households about a specific device and actual behavior rather than “would you use an eco app?” Record consent and avoid collecting unnecessary personal data.

**Stage 2: run a matched desk/shadow comparison.** Use the same de-identified request set through the existing workflow, a structured checklist/spreadsheet, and the proposed assistant workflow. Record omissions, constraint failures, clarification exchanges, time, and evidence completeness. Counterbalance order where possible to reduce learning effects. A small exercise estimates workflow behavior; it does not establish general efficiency.

**Stage 3: conduct one operator-approved collection cycle.** Agree categories, budget, responsible custodian, receiving acceptance, physical records, and escalation before collecting anything. Use actual costs and measured handoffs. Retain unresolved items openly. If partner/site authorization is unavailable, stop at the desk proof and report that ceiling honestly.

**Stage 4: test recurring viability.** Present a concrete renewal offer with scope and cost. Interest without a price is weak demand evidence. Observe another cycle before extrapolating volume.

| Metric | Definition | Proposed acceptance logic |
|---|---|---|
| Intake completeness | In-scope submitted requests not requiring avoidable clarification / all in-scope submitted requests | Include incomplete requests; report rejection/withdrawal reasons separately and compare against the actual baseline |
| Coordinator effort | Paid staff minutes through an agreed workflow boundary | Seek useful reduction without shifting invisible work to volunteers/partners |
| Hard-constraint errors | Unauthorized capacity, safety, data, or ownership actions | Zero permitted in the tested workflow; a failure triggers redesign |
| Receiving acknowledgment | Collected item/lots with attributable receiving record / collected item/lots | Every collected unit must be accountable; missing evidence is an exception, not a success |
| Supported outcome coverage | Supported final outcomes / collected units, separately by unit type | Publish unresolved proportion and aging; do not force 100% within an unrealistic period |
| Full program cost | All agreed labor, collection, treatment, evidence, and exception costs | Within identified funding, with held obligations visible |
| Commercial test | Budget owner accepts an explicitly priced continuation | If absent, revise buyer/scope before adding features |
| Additionality | What participants would otherwise have done with the item | Do not call every collected item diverted from landfill |

A useful north-star measure is **cost per item/lot reaching its predefined, supported disposition milestone within the agreed service window**, reported alongside access, exclusions, final-disposition coverage, unresolved inventory, and time to closure. Define the milestone for each pathway before the pilot; an intermediate hub receipt cannot substitute for final disposition. Item and lot metrics should not be added into a misleading single unit count.

### 14. Prioritized execution brief

**First: strengthen the argument and model.** Lock the official rule version; write one central problem statement; select the initial buyer/site type; add an assumption/source register; resolve the settlement waterfall; add missing costs and held obligations; replace the weak comparator. These actions are higher-value than adding visual detail.

**Second: make existing proof easy to inspect.** Put the operating prerequisites, evidence state, funding sensitivity, and decision inbox into the current five-workspace structure. Keep the deterministic engine, approval semantics, bilingual content, and useful fallback. Reuse source modules rather than redesigning unrelated systems.

**Third: add bounded AI only if it survives comparison.** Build one intake/exception path through a secure endpoint and validated tools. If it cannot be completed and evaluated in time, demonstrate the workflow as deterministic and identify AI as a proposed extension. Do not rename the present replay into a live agent system.

**Fourth: gather the smallest decisive external evidence.** A scoped quote, a partner’s critique, an actual coordination trace, or a priced renewal response addresses uncertainty the authored 48-device day cannot. Obtain permissions before a physical pilot; do not imply an agreement from a conversation.

**Fifth: prepare the competition evidence package.** On the supplied transcription, the base rubric rewards the problem, reasoning, feasibility, and clarity more heavily than conspicuous AI. Confirm current organizer amendments because the archived dates are old; a secondary listing reports an extension, but it was not independently confirmed through an accessible current organizer notice. Do not plan against an unverified deadline.

The supplied transcription also describes optional relevance/publication bonuses. Use program references where they strengthen the argument and verify the exact current terms. Publication must wait for the owner’s explicit instruction; no outreach or publishing was undertaken.

### 15. How to explain it under questioning

| Likely judge question | Defensible answer direction |
|---|---|
| Why not use EwasteRJ or the government service directly? | Use them where suitable. Test whether structured intake, pooled access, and evidence coordination reduce work for one defined cluster. Existing services are operating partners/substitutes, not evidence of an empty market. |
| Where is the innovation? | A specific tested coordination mechanism: acceptance and funding before commitment, accountable exceptions, and supported outcomes. AI is one enabling component. |
| Is this already agentic AI? | Current prototype is deterministic. Identify exactly which proposed/implemented assistant path uses models and which controls remain rule-based. |
| Who pays for free collection? | A named institutional/program buyer pays for a defined service and access scope. Recovery income is supplementary and conditional. |
| Are the savings real? | Current savings are authored scenario results versus separate trips. Real advantage requires comparison with existing batched practice. |
| Are you Lintasarta’s partner? | No verified relationship exists. The proposal is designed to be testable with relevant operators and institutions. |
| Does collecting 190 kg prove environmental impact? | It is currently fictional scenario mass, and collection alone would not prove recycling or avoided emissions even if measured. |
| What happens to the batteries or data-held devices? | They remain visible, assigned, and funded for appropriate resolution; no automatic release or disappearance from the backlog. |
| Why would a host renew? | Only if the measured service value justifies its full cost. A priced renewal test is part of validation. |
| What would make you stop? | No payer, no accepted safe pathway, no improvement over the simple baseline, or unfunded residual obligations. |

### 16. Recommended thesis and claim ceiling

**Working thesis:** the unresolved problem is not merely getting electronics out of homes. It is coordinating a return that is accepted downstream, financially supported, and accountable after handover.

**Indonesian direction for the owner to develop:** “JejakBalik menghubungkan permintaan penyerahan elektronik dengan kapasitas mitra, pembiayaan layanan, serta bukti hasil penanganan agar pengumpulan berbasis komunitas dapat dijalankan secara terencana dan bertanggung jawab.”

The current evidence supports a functional design and statically inspected operating model. It does not support claims of field-validated savings, real AI autonomy, actual collection outcomes, profitability, partner adoption, or verified environmental benefit.

The strongest next competitive advantage is **one important uncertainty resolved with evidence**, supported by a website that makes that evidence easy to understand.

## Source register

All web pages below were opened during this review on 29 October 2026. Company statements establish what the company publicly states, not independent certification or performance. URLs are retained so the owner can verify original context.

- **S1. Lintasarta.** (2026, September 23). *[Official Fact Sheet] Pengelolaan Perangkat Elektronik dan E-Waste di Lintasarta.* https://www.lintasarta.net/berita/official-fact-sheet-pengelolaan-perangkat-elektronik-dan-e-waste-di-lintasarta/
- **S2. Lintasarta.** (2026, September 29). *Lintasarta dan EwasteRJ Dorong E-Waste Jadi Sumber Daya Bernilai lewat #AksiCintaBumi.* https://www.lintasarta.net/berita/lintasarta-dan-ewasterj-dorong-e-waste-jadisumber-daya-bernilai-lewat-aksicintabumi/
- **S3. Lintasarta.** (2026, September 23). *Mengapa Lintasarta Peduli E-Waste? Memahami Empat Pilar Lintasarta Peduli Negeri.* https://www.lintasarta.net/berita/mengapa-lintasarta-peduli-e-waste-memahami-empat-pilar-lintasarta-peduli-negeri-mengapa-lintasarta-peduli-e-waste-memahami-empat-pilar-lintasarta-peduli-negeri/
- **S4. Lintasarta.** (2026, October 6). *Pertama di Indonesia, Lintasarta Raih Sertifikasi ISO/IEC 42001:2023 untuk AI Management System.* https://www.lintasarta.net/berita/pertama-di-indonesia-lintasarta-raih-sertifikasi-iso-iec-420012023-untuk-ai-management-system/
- **S5. Lintasarta.** (2026, September 23). *Bagaimana Lintasarta Menentukan Kapan Perangkat Elektronik Harus Dipensiunkan?* https://www.lintasarta.net/berita/bagaimana-lintasarta-menentukan-kapan-perangkat-elektronik-harus-dipensiunkan/
- **S6. EwasteRJ.** (n.d.). *Official website and services.* https://ewasterj.com/
- **S7. EwasteRJ.** (n.d.). *Company profile, About section.* LinkedIn. https://www.linkedin.com/company/ewasterj/
- **S8. Dinas Lingkungan Hidup Provinsi DKI Jakarta.** (n.d.). *Layanan Pengelolaan Sampah Elektronik.* https://lingkunganhidup.jakarta.go.id/layanan/ewaste
- **S9. SCG Indonesia.** (2026, March 18). *Mitra10 – Program Tukar Tambah Limbah Elektronik.* https://id.scg.com/id/mitra10-electronic-waste-trade-in-program/
- **S10. Kementerian Lingkungan Hidup dan Kehutanan.** (2024). *Peraturan Menteri LHK Nomor 9 Tahun 2024.* Official metadata and abstract, JDIH BPK. https://peraturan.bpk.go.id/Details/291985/permen-lhk-no-9-tahun-2024
- **S11. Chandramouli, R., & Hibbard, E.** (2025). *Guidelines for Media Sanitization* (NIST SP 800-88 Rev.2). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-88r2 ; publication page https://csrc.nist.gov/pubs/sp/800/88/r2/final . The publication page was inspected; this review does not claim a complete sanitization-method audit.
- **S12. Vodafone.** (2025). *Gen Z leads the way on buying refurbished devices.* Summary of a Kantar study with Wuppertal Institute support; methodology states 5,243 respondents in five European countries, March 2025. https://www.vodafone.com/news/newsroom/planet/gen-z-leads-the-way-on-buying-refurbished-devices
- **L1. Owner-supplied competition working record.** `JejakBalik/context-source/AksiCintaBumi_Competition_and_Essay_Hub.md`, especially lines 1–343. A transcription/working record, not an independently inspected current organizer PDF.
- **L2. Owner-supplied handoff and brand.** `upload/Jejak_Balik_Master_Context.md`; `upload/Jejak_Balik_Brand_Guidelines(1).pptx`. Embedded application screenshots inspected.
- **L3. Supplied source archive.** `upload/Jejak_Balik_Project(1).zip`, inspected files: `README.md`, `src/domain/{engine,context,fixtures,metrics,routing,exploration}.ts`, finance and branch fixtures, Team/Impact source, and metric/performance documentation. The ZIP has no authenticated commit identity; current GitHub contents may differ.

## Review status

Source claims, arithmetic, evidence boundaries, and recommendations received a consistency check. Independent parallel reviews examined external alternatives and the source/economic model. No source edits, dependency installation, fresh app build, browser runtime test, field activity, or external publication was performed. The reusable strategy is complete at this evidence level; operational validation remains proposed work.
