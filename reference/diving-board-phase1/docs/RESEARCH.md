# What goes wrong with today's pool software

Research done October 2026 to set the design rules for The Diving Board. Every
row ends in a requirement; [DESIGN-RULES.md](DESIGN-RULES.md) tracks which
ones are built.

**About the evidence.** Review sites lean positive: Skimmer is 4.9/5 on
Capterra, and Pool Brain has 26 five-star reviews out of 27. The complaints
below come from a minority of users, but they keep coming up. Items marked
*(unverified)* come from search summaries, not from pages that were read in
full. Trouble Free Pool (TFP) forum pages blocked automated reading.

## Failure themes

| Theme | Evidence | Requirement |
|---|---|---|
| Field connectivity, crashes | Skimmer techs can't log in, lag, Android-only issues ([Capterra](https://www.capterra.com/p/177014/Skimmer/reviews/?page=6)). ServiceTitan Android rated 2.6/5 for crashes, sync and battery drain *(unverified)* | Offline-first local store with a queued, idempotent sync. Login works from a cached session. Sync state is always visible. Tested on low-end Android. |
| Sync and data loss | Pool Math users lost data after an app migration *(unverified, TFP)* | Server is the source of truth. Every editable record has a version and a conflict returns 409 with the current copy. Local data is never cleared before the server confirms it. |
| Route editing | Skimmer: moving a route reorders the stops, routes are rebuilt every year, estimated arrival times are wrong, no calendar view ([Capterra](https://www.capterra.com/p/177014/Skimmer/reviews/?page=6)) | Stop order is stored data. Moves keep the order. Bulk changes have a preview and undo. A real calendar view. |
| Wrong client picked | "Techs are easily able to pick the wrong client" ([Capterra](https://www.capterra.com/p/177014/Skimmer/reviews/?page=6)) | GPS check against the site, plus the address and a photo on the start-stop screen. |
| Billing and accounting | Pool Brain: no running totals, late notices sent to customers who had paid, QuickBooks sync problems ([Software Advice](https://www.softwareadvice.com/ca/field-service/pool-brain-profile/reviews/)). Skimmer autopay works only for routine service | Ledger with running balances. Payments reconcile before any late notice goes out. QuickBooks sync shows per-record diffs and errors. Autopay works on every invoice type. |
| Price hikes and lock-in | Skimmer raised prices three times in nine months ([Capterra](https://www.capterra.com/p/177014/Skimmer/reviews/?page=6)). ServiceTitan multi-year contracts and exit fees *(unverified)* | Published prices, 90 days' notice of any increase, no exit fees. |
| Integrations behind paywalls | Skimmer: Zapier and Spin Touch integration on the "Scaling Up" tier, public API on "Owning the Market" only ([help](https://help.getskimmer.com/article/354-zapier-integration), [dev portal](https://devportal.getskimmer.com/)) | Full export (CSV/JSON, including photos) and a read API on every tier. |
| Chemistry formulas that disagree | PHTA warned that apps "can provide inconsistent values and even suggest potentially dangerous chemical doses". Orenda changed its LSI formula outside PHTA/NPC channels ([Talking Pools](https://talkingpoolspodcast.buzzsprout.com/1752133/14790406-the-orenda-app-controversy), [Orenda](https://ask.orendatech.com/knowledge/why-is-the-orenda-calculator-lsi-different-from-other-lsi-calculators)) | Name the formula and version on every result. Show the PHTA chart value next to the full calculation. Reject out-of-range inputs. Record the formula version with each reading. |
| CYA/FC errors | An app recommended a 24 ppm shock where 10 ppm was right at CYA 20 *(unverified, TFP)*. Skimmer leaves interpretation to Orenda | Chlorine targets scale with CYA. Doses use the actual product strength (e.g. 10% vs 12.5% liquid chlorine, cal-hypo %). Volume units are checked. The math is shown, and doses above a ceiling need confirmation. |
| Test hardware accuracy | AquaChek photo reads "wildly inaccurate" *(unverified)*. Spin Touch errors with bubbles, partly filled disks, cloudy samples or lost calibration ([LaMotte](https://lamotte.com/?p=37731)) | Store how each reading was taken and how confident it is. Ask for a retest when a value is implausible. Track when each device was last calibrated. |
| Photos | Hard to attach photos to work orders in Skimmer ([Capterra](https://www.capterra.com/p/177014/Skimmer/reviews/?page=6)) | Upload in the background with retries. Keep the original resolution. Allow photos from the camera roll. |
| Equipment cloud outages | iAquaLink 2.6/5 with "connection lost" ([Birdeye](https://birdeye.com/iaqualink-app-144921960?page=198)). OmniLogic shows "Server not available" ([TFP](https://www.troublefreepool.com/goto/post?id=2009446)). Pentair's app migrations dropped features ([TFP](https://www.troublefreepool.com/posts/2560363/)) | Equipment links are read-only and may be unavailable. Service work never depends on a vendor's cloud. |
| Support | Pool Brain support is chat-only ([Software Advice](https://www.softwareadvice.com/ca/field-service/pool-brain-profile/reviews/)) | Phone support as well as chat. Segmented customer messaging. |

## How liner and cover orders reach manufacturers

None of the fabricators publishes an ordering API or documented EDI. That
means nothing public was found; it does not prove that nothing exists.

| Manufacturer | Channel found | Source |
|---|---|---|
| Latham | Measure by Latham device and app → web Builder Management Portal. Older EZMeasure PDF form | [announcement](https://www.globenewswire.com/news-release/2023/01/20/2592546/0/en/Latham-Group-Inc-Introduces-Measure-by-Latham.html), [form](https://www.lathampool.com/ca/wp-content/uploads/sites/3/2020/02/EZMeasure-1.pdf) |
| Loop-Loc | A-B Measure Pro app. Image-Loc requires registering by email. Dealer login; submission channel not documented | [news](https://www.looploc.com/news/a-picture-is-worth-a-thousand-measurements/) |
| Merlin | Dealer portal with order tracking. PDF order forms | [portal request](https://merlinindustries.com/new-portal-request/) |
| Garrett | Not researched yet. Needs the installer's dealer details | n/a |
| GLI | Measuring forms and the "My GLI" portal | [forms](https://shop.glipoolproducts.com/dealer-distributor-area/Measuring-Forms/) |
| Anchor | Dealer portal with online orders and status updates | [anchorinc.com](https://anchorinc.com/?p=2772) |

The only real programmatic channel is at the distributor level:
POOLCORP/Pool360 offers API and EDI for SKUs, pricing and purchase orders
([Evosus](https://evosus.com/lou/integrations/poolcorp)).

**What this means for the platform.** Measurements are captured once, in a
neutral format. Each order goes out as a PDF in the supplier's channel (email,
or an upload package for portal suppliers). Order status is tracked in the
platform, with an acknowledgement deadline per supplier. When a manufacturer
offers an API, it plugs in as another channel.
