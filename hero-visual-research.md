# Hero Visual Research: 提示词胶囊 / Prompt Capsule

Date: 2026-07-03
Status: Research notes, not final direction

## Goal

Find a hero object with real visual memory for Prompt Capsule.

The product has weak technical moat, so the hero cannot be a generic SaaS screen. It needs a recognizable object that makes people understand:

> long prompt -> sealed short-lived command object -> shareable URL

Do not lock the visual direction yet. This document maps reference territories and what can/cannot be borrowed.

## Sources Checked

- Playdate official site: https://play.date/
- Teenage Engineering OP-1 field: https://teenage.engineering/products/op-1
- Bandai Gashapon official site: https://gashapon.jp/
- Capsule toy / Gashapon background: https://en.wikipedia.org/wiki/Gashapon
- Capsule toy background: https://en.wikipedia.org/wiki/Capsule_toy
- Recent capsule-toy tech miniature example: https://www.tomshardware.com/desktops/pc-building/japanese-firm-launches-hyper-realistic-capsule-toy-pc-parts-you-can-assemble-and-play-with-tiny-motherboards-cases-and-cpus-are-coming-after-tarlin-inks-collab-with-the-big-four-pc-parts-makers
- Zenless Zone Zero official site / background: https://zenless.hoyoverse.com/ and https://en.wikipedia.org/wiki/Zenless_Zone_Zero
- Honkai: Star Rail background: https://en.wikipedia.org/wiki/Honkai:_Star_Rail
- Wuthering Waves background: https://en.wikipedia.org/wiki/Wuthering_Waves

## Reference Territory 1: Playdate

What matters:

- One memorable physical object beats a full UI system.
- Smallness is the point: "tiny handheld game system".
- Constraints become identity: black-and-white screen, pocket size, crank.
- It feels designed because the hardware has one unmistakable silhouette.

What to borrow:

- A simple object users can remember after one glance.
- Object-first brand system.
- Limited palette as identity.
- Physical interaction hint: seal, crank, insert, eject, lock.

What not to borrow:

- Yellow square body.
- Crank.
- 1-bit black-white screen as the main UI.

Implication for Prompt Capsule:

The hero should not be "a page". It should be one object: a capsule/card/token with a URL inside.

## Reference Territory 2: Teenage Engineering

What matters:

- Product labels, tiny metadata, knobs, tape formats, LEDs, and small typographic systems make tools feel collectible.
- Their copy and visual hierarchy are product-catalog precise, not SaaS explanatory.
- They make utilities feel like designed instruments.

What to borrow:

- Model numbers: `PC-7D`, `TEXT/PLAIN`, `AGENT READY`.
- Small technical inscriptions.
- Instrument-like precision.
- Quiet confidence, not loud gamification.

What not to borrow:

- White synth keyboard layout.
- Exact OP-1 / field design language.
- Minimalism so cold that it loses Xiaohongshu share energy.

Implication for Prompt Capsule:

The capsule can be treated like a small instrument or device, with technical inscriptions that make the URL feel intentional.

## Reference Territory 3: Gashapon / Capsule Toys

What matters:

- The capsule is a container of desire and surprise.
- Capsule toys now include adult collectors, niche, geeky, realistic, and surreal objects.
- Recent capsule examples include hyper-realistic PC components, proving "tech object inside capsule" is culturally legible.

What to borrow:

- Transparent shell.
- Object inside.
- Collectible insert card.
- Series / limited-run feeling.
- Sticker labels and small catalog codes.

What not to borrow:

- The gacha randomness mechanic. Prompt Capsule is not random.
- "Gashapon" as a product word. It is Bandai trademark territory.
- Toy-store cuteness.
- Full machine visual.

Implication for Prompt Capsule:

Capsule is useful as a sealing/container metaphor, but the hero should not become a gacha machine or blind-box product.

## Reference Territory 4: Japanese Anime/Game Capsule Icons

Known symbols:

- Poké Ball: ball captures/stores a character. Extremely iconic, but unusable as a visual source.
- Dragon Ball Capsule Corp / Hoi-Poi capsules: object compression in a capsule. Conceptually close, but strongly copyrighted and recognizable.
- Gashapon capsules: physical capsule culture. Safer if abstracted.

What to borrow:

- "A powerful thing compressed into a small container".
- Seal/compact/deploy logic.
- Small object as proof of ownership or capability.

What not to borrow:

- Red-white split sphere.
- Capsule Corp shape/marks.
- Any exact anime/game silhouette.

Implication for Prompt Capsule:

The conceptual metaphor is strong, but direct visual borrowing is legally and taste-wise dangerous. We need a new silhouette.

## Reference Territory 5: Current Anime/Gacha Game UI

Observed clusters:

- Zenless Zone Zero: urban, chunky, video-store/device culture, faction labels, youth street energy.
- Honkai: Star Rail: polished sci-fi, high production, more grand/fantasy than this product needs.
- Wuthering Waves: darker, atmospheric, less relevant to a text tool.
- Persona-style menu language: red/black/white, jagged typography, punk collage. Strong but too recognizable if copied.

What to borrow:

- From ZZZ-like direction: urban device/sticker energy, not fantasy.
- From Persona-like direction: confidence, asymmetry, red/black graphic punch.
- From inventory screens: obtaining an item, slots, traits, rarity, serial.

What not to borrow:

- Character art.
- Combat HUD.
- Exact Persona jagged menu grammar.
- Heavy neon game UI that makes the app feel fake.

Implication for Prompt Capsule:

Game language should appear as "obtained item / command object", not "full game UI".

## Prior Attempts Diagnosed

### Attempt 1: generic SaaS tool

Failed because:

- No object.
- No visual moat.
- Could be any prompt tool.

### Attempt 2: paper ticket / label

Improved because:

- URL became an artifact.

Failed because:

- Too stationery.
- Too polite.
- Not enough youth/cult energy.

### Attempt 3: industrial cartridge

Improved because:

- URL became a command object.

Failed because:

- Too heavy.
- Too military/industrial.
- Not Japanese enough.

### Attempt 4: realistic capsule render inside web UI

Improved because:

- Hero object became memorable.

Failed because:

- Page became toy/product showcase.
- Big 3D object fought the web tool.
- It implied gacha/toy more than utility.

### Attempt 5: game inventory card

Improved because:

- Item/card metaphor is closer to product action.

Failed because:

- Too much generic punk UI.
- Felt like an imitation game HUD, not a new brand object.

## Working Hypotheses

These are not final decisions.

### H1: The hero is not a full web page.

The hero is a self-contained object.

Candidate object:

> a "sealed prompt token": flat enough for UI, physical enough for memory.

It may combine capsule shell, card label, and URL strip, but should not be a full 3D toy photo.

### H2: The right metaphor is "seal", not "gacha".

"Gacha" implies random pull. Prompt Capsule is deterministic preservation.

Better verbs:

- seal
- pack
- compress
- stamp
- eject
- open
- expire

### H3: The page should behave like a crafting/result screen, but not look like a fake game.

The action loop is game-like:

```text
write prompt -> seal -> obtain capsule -> share/open
```

But the UI must remain a credible tool.

### H4: The strongest territory is "collectible command label".

Possible hero object:

- Flat 2.5D card/token.
- Capsule-like rounded container.
- URL as central item code.
- Sticker/seal/serial as supporting details.
- No realistic toy render as default.

### H5: Need a new silhouette.

The current silhouettes are too known:

- sphere capsule -> toy/gacha
- game cartridge -> Nintendo/Switch association
- trading card -> generic TCG
- terminal window -> generic devtool

Need hybrid:

> a short rounded capsule-card with one transparent side and one label side.

Think "URL ampoule" more than "toy ball".

## Design Constraints for Next Hero Exploration

Generate only hero objects first, not full pages.

Must include:

- `n78.xyz/c/a8K2mQp9`
- `PROMPT CAPSULE`
- `PC-7D`
- `TEXT/PLAIN`
- `AGENT READY`
- `EXPIRES 7D`

Must avoid:

- realistic 3D toy render as the main asset
- full gacha machine
- red-white ball
- Nintendo/Switch/Game Boy trade dress
- Capsule Corp / Dragon Ball references
- Persona/Splatoon exact visual grammar
- SaaS dashboard
- industrial military cartridge
- medicine packaging

## Next Research Prompt Direction

Do not ask image generation for a website.

Ask for 6 hero-object silhouette explorations:

```text
Create six distinct hero-object silhouette concepts for "提示词胶囊 / Prompt Capsule".

Do not design a full web page.
Do not copy any real game, anime, console, toy, or brand.

The object represents: a long AI prompt sealed into a short-lived plain-text URL.
Visible text must include: n78.xyz/c/a8K2mQp9, PC-7D, TEXT/PLAIN, AGENT READY, EXPIRES 7D.

Explore these directions:
1. URL ampoule: a slim transparent capsule tube with a paper URL strip inside.
2. Command talisman: a flat manga-style sealed tag with URL as spell/code.
3. Save-file chip: a fictional handheld-game memory chip with URL as save code.
4. Capsule card: rounded collectible card with transparent capsule window.
5. Sticker cartridge: small sticker-like command label with peel corner and serial.
6. Sealed zine insert: folded URL paper band held by a red seal sticker.

Style:
Japanese indie game culture, manga screentone, collectible toy insert, terminal command utility.
Young, sharp, cult, premium, not cute, not corporate.
Use off-white, near-black, capsule red, tiny cyan/mint status detail.

Output should look like a brand exploration sheet with six labeled objects on one canvas.
```

## Open Questions

- Should the hero object be physically plausible, or can it be more graphic/symbolic?
- Should the "capsule" be literal in the silhouette, or only in the language/sticker?
- How playful can it be before it loses trust as a tool?
- Does 小红书 audience respond better to cute/collectible or punk/tool?
- Should the hero object be suitable as favicon/logo, or only as homepage/result hero?

