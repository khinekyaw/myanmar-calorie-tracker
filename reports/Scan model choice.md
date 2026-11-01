# Which AI model for photo scans

November 2026. What the `scan` Edge Function should run on, and what each option costs.

## The short answer

**Run scans on Claude Haiku 5.5 at `low` effort.** It costs about **$0.0003–0.0008 per scan**, roughly 15–35× less than the current default, Claude Opus 5.5. Confirm it on the ~100 labelled photos before launch: the eval costs a few dollars on all three Claude models together. Move up to Sonnet 5.5 only if Haiku's accuracy isn't good enough.

At Opus prices, a heavy Premium user (4 scans a day) would cost about **$1.40 a month**. That's more than the pass earns at the street rate: 4,900 Ks ≈ $1.05 ([market research](Sar%20AI%20Myanmar%20market%20research.md)). On Haiku, the same user costs about **$0.04**.

## What one scan uses

These are estimates. Nothing has been measured, because no API key is set up yet.

| Part | Tokens | Notes |
|---|---|---|
| Rules + 115-dish catalogue (system prompt) | ~4,000 | Same for every user, so it is **cached already** (`cache_control` in `scan/index.ts`). 5,566 characters, 1,263 of them Burmese. |
| Meal photo, 800 × 600 | ~640 | Claude counts ⌈w/28⌉ × ⌈h/28⌉ patches ([vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)). The app already resizes to an 800 px long edge, which suits it. |
| Answer: JSON plus thinking, at `low` effort | ~300–500 | Thinking is billed as output. Haiku and Opus 5.5 default to `medium` effort, so set `low` explicitly. |

## Cost per 1,000 scans

Assumes a warm cache: 4,000 cached tokens, 700 uncached input tokens and 400 output tokens.

| Model | Input / output per MTok | Cache read | Per 1,000 scans | Notes |
|---|---|---|---|---|
| **Claude Haiku 5.5** | $0.10 / $0.50 | $0.01 | **≈ $0.30** (≈ $0.80 on a cold cache) | Cheapest Claude. Has no server-side fallback if it refuses, though that's unlikely for food photos. |
| Claude Sonnet 5.5 | $2 / $10 | $0.10 | ≈ $6 | Step up if Haiku misses too many. |
| Claude Opus 5.5 (current default) | $4 / $20 | $0.20 | ≈ $12 | Too costly for a free tier of 3 scans a day. |
| Gemini 2.5 Flash-Lite | $0.10 / $0.40 | $0.01 | ≈ $0.30 | Same price as Haiku but an older model. Would mean rewriting the function. |
| Gemini 3.5 Flash-Lite | $0.30 / $2.50 | $0.03 + storage | ≈ $1.40 | |
| Gemini 3.8 Flash | $0.75 / $3.75 | $0.075 + storage | ≈ $2.50 | **Doubles on 1 Jan 2027** ($1.50 / $7.50). |

Prices: [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) (page updated 2026-10-30). The Gemini image-token count is assumed (~1,000), not checked.

### OpenAI (ChatGPT's models)

From [OpenAI's pricing page](https://developers.openai.com/api/docs/pricing) and [image-token rules](https://developers.openai.com/api/docs/guides/images-vision). An 800 × 600 photo is 570 tokens on the GPT-5.4 family.

| Model | Input / cached / output per MTok | Per 1,000 scans | Notes |
|---|---|---|---|
| GPT-5.4 nano | $0.20 / $0.02 / $1.25 | ≈ $0.70 | Cheapest current one. |
| GPT-5.4 mini | $0.75 / $0.075 / $4.50 | ≈ $2.60 | |
| GPT-5 nano | $0.05 / $0.005 / $0.40 | ≈ $0.20 | **Deprecated**: don't build on it. |

### Chinese models

Mostly from third-party price lists; only Alibaba's Singapore prices were checked on [its own page](https://www.alibabacloud.com/help/en/model-studio/model-pricing).

| Model | Input / output per MTok (cache) | Per 1,000 scans | Notes |
|---|---|---|---|
| Zhipu GLM-4.6V-FlashX | $0.04 / $0.40 ($0.004) | ≈ $0.20 | Open-weight family. Prices from [Puter](https://developer.puter.com/tutorials/zai-glm-api-pricing/) and [InferenceHub](https://inferencehub.org/providers/zhipu-ai). |
| Zhipu GLM-4.6V-Flash | free | $0 | Free tier, so rate limits and no guarantees. Fine for testing, risky for production. |
| Alibaba qwen3.8-omni-flash (Singapore) | $0.15 / $0.47 ($0.016) | ≈ $0.35 | Takes images. Official price. |
| Alibaba qwen3-vl-plus (Singapore) | $0.20 / $1.60 (no cache price listed) | ≈ $1.60 | Official price. Open-weight family. |
| Zhipu GLM-4.6V | $0.30 / $0.90 ($0.05) | ≈ $0.80 | |
| DeepSeek V4 Flash Vision (experimental) | $0.22 input off-peak, $0.44 peak; output not confirmed | about $0.3–0.5 | Experimental model; images capped at 384 tokens ([report](https://runtimewire.com/article/deepseek-v4-flash-vision-api-image-billing)). |
| ByteDance Seed 2.1 Turbo (BytePlus) | $0.50 / $2.50 ($0.10) | ≈ $1.75 | Prices from [TechJack](https://techjacksolutions.com/ai-tools/bytedance-seed/bytedance-seed-pricing/). |
| Moonshot Kimi K2.5 / K2.6 | $0.60–0.95 input | > $3 | Sources disagree. |

### What this means

**Price is not what separates them.** The cheap end (Haiku 5.5, GLM-4.6V-FlashX, qwen3.8-omni-flash, GPT-5.4 nano, Gemini 2.5 Flash-Lite) costs **$0.20–0.70 per 1,000 scans**. For a heavy user that's **$0.02–0.08 a month**, a few percent of the pass price. Choose on accuracy on our own photos, reliability, and where the photos go.

Reasons to stay on Claude unless the photo test says otherwise:
- **Integration:** the scan function is built and tested on the Claude SDK with structured output and prompt caching. Another provider means a second code path (most offer OpenAI-style APIs, so about a day's work).
- **Where photos go:** meal photos are health data. Check each provider's training and retention terms, and say in the privacy policy where photos are processed. Alibaba has a Singapore region, next to our Supabase.
- **Accuracy is unproven for everyone.** One small study gave Qwen a slight edge on East Asian dishes ([arXiv 2601.04491](https://arxiv.org/pdf/2601.04491)). That is a reason to include Qwen in the test, not to switch.

Open-weight models (Qwen-VL, GLM-4.6V) matter more later. We could fine-tune one on our labelled photos, or run a small one on the phone (see "Later").

## Accuracy: no public answer for Myanmar food

No benchmark covers Burmese dishes. The closest studies:
- Models score above 94 % on multiple-choice food recognition, but only up to 56 % on telling regional cuisines apart ([CulturalMenuBench, 2026](https://arxiv.org/pdf/2609.03526)). Look-alike dishes are where they fail.
- A small 21-photo test put GPT-4o and Gemini 2.5 Flash ahead of Claude Sonnet 4 ([arXiv 2601.04491](https://arxiv.org/pdf/2601.04491)). These are older models and the test set is tiny.

Our setup helps the cheaper models. The model picks from a fixed list of 115 dishes rather than naming food freely. When it's unsure (below 0.6), the app shows 3 candidates, so the user fixes a miss in one tap. A miss costs a tap, not a wrong log.

**So measure it on our own photos.** That item is already on the launch checklist: about 100 labelled meal photos, including shared tables, curries in spoons, and tea-shop snacks. Run the same prompt on Claude Haiku 5.5 and Sonnet 5.5, GPT-5.4 nano, qwen3.8-omni-flash or qwen3-vl-plus, GLM-4.6V-FlashX and Gemini 2.5 Flash-Lite. That costs a few dollars in all. Score each model on:
- top-1 dish accuracy
- top-3 accuracy (the right dish among the candidates)
- whether shared tables are detected
- quantity error
- cost and latency

Pick the cheapest model that meets the bar. Rough cost: under $5 for all the models above.

## Not worth it now

- **Switching provider before the photo test** (Gemini, OpenAI, Qwen, GLM, DeepSeek). The cheap options cost about the same, and switching means a second code path. Switch only if the test shows a clear accuracy gap that Claude can't close. Of the Gemini models, the only one as cheap as Haiku is an older one, and the newer ones are about to double in price.
- **The Batch API (50 % off).** Users wait on the Result screen, and at Haiku prices the saving is cents.
- **A model cascade (Haiku, then Sonnet when unsure).** Only if the eval shows Haiku failing on a type of meal, such as shared tables. The candidate picker already covers low confidence.

## Later

- **An on-device classifier** for the top dishes, trained on photos users agree to share. Scans would cost nothing per photo and work offline, which matters with Myanmar's shutdowns. It needs thousands of labelled photos, so it's a post-launch project.
- **Watch real token use** in `scan_costs`. The estimates above assume ~400 output tokens; adaptive thinking may use more on hard photos.

## Small fixes in `scan/index.ts`

- The `PRICES` table lists Sonnet 5.5 cache reads at $0.20/MTok; it's $0.10. This only affects the cost log.
- The default `SCAN_MODEL` is `claude-opus-5-5`. Switch it to Haiku with the `SCAN_MODEL` secret, or change the default, once the eval agrees.
