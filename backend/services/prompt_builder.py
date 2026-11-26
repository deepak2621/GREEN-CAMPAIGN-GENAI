"""
FLUX.2 Klein 4B Prompt Builder for Green Campaign AI.
Optimized for Black Forest Labs' FLUX.2 Klein 4B (Distilled) with Qwen3-4B text encoder.

Design principle:
- Preserve the user's exact prompt and campaign narrative verbatim at the front of the prompt.
- Anchor visual descriptors and category-specific exclusions cleanly for accurate 4-step generation.
"""

from backend.services.model_config import Flux2KleinConfig

FLUX2_STYLE_GUIDES = {
    "Realistic Photography": (
        "authentic photorealistic editorial photography, natural cinematic lighting, "
        "crisp 35mm lens clarity, realistic textures, balanced composition"
    ),
    "3D Illustration": (
        "clean 3D digital campaign illustration, smooth tactile materials, "
        "balanced studio lighting, sharp focus, high visual clarity"
    ),
    "Digital Art": (
        "detailed digital concept artwork, atmospheric depth, luminous lighting, "
        "rich color harmony, crisp environmental detail"
    ),
    "Flat Vector Illustration": (
        "modern minimalist flat vector poster illustration, clean geometric forms, "
        "cohesive color palette, crisp edges, balanced negative space"
    ),
    "Educational Infographic Illustration": (
        "modern environmental campaign poster illustration, clear visual hierarchy, "
        "bright clean lighting, accessible educational framing"
    ),
    "Cartoon Illustration": (
        "warm storybook cartoon illustration, friendly expressive styling, "
        "bright natural daylight, inviting colors, clean outlines"
    ),
}

CATEGORY_CONTEXT = {
    "Water Conservation": {
        "theme_desc": "water conservation and clean freshwater stewardship theme, crystal-clear water droplet and faucet",
        "exclusions": "solar panels, wind turbines, power plants, electrical wires, trash dump, industrial smokestacks",
    },
    "Energy Conservation": {
        "theme_desc": "energy conservation and mindful electricity saving theme, energy-efficient LED light bulb and light switch",
        "exclusions": "water droplets, dripping faucet, plumbing pipes, ocean, trash dump, agricultural irrigation",
    },
    "Renewable Energy": {
        "theme_desc": "clean renewable solar photovoltaic panels and wind turbines energy transition theme",
        "exclusions": "oil rigs, coal plants, dripping water, faucet, trash bins, landfill, dark smokestacks",
    },
    "Waste Management": {
        "theme_desc": "circular waste management, color-coded recycling bins, and reuse theme",
        "exclusions": "wind turbines, solar panels, electrical pylons, plumbing faucets, chaotic burning dump",
    },
    "Pollution Control": {
        "theme_desc": "pollution prevention, clean turquoise oceans, and plastic-free environment theme",
        "exclusions": "heavy industrial factories, toxic dump, dark smog, oily black sludge",
    },
    "Climate Awareness": {
        "theme_desc": "climate change awareness, biodiversity, and planetary protection theme",
        "exclusions": "smokestacks, dirty factories, garbage trucks, oil slicks, apocalypse",
    },
    "Sustainable Living": {
        "theme_desc": "sustainable living, planting young tree saplings, and green community theme",
        "exclusions": "heavy industrial factories, power transformers, oil pipelines, traffic gridlock, smokestacks",
    },
}

AUDIENCE_TONE = {
    "General Public": "broad public campaign appeal",
    "Students": "educational clarity for students",
    "Children": "friendly accessible tone for children",
    "Households": "relatable residential everyday context",
    "Industrial Consumers": "clean modern architectural and enterprise scale",
}


def build_prompt(
    theme: str,
    description: str,
    category: str,
    image_style: str,
    target_audience: str,
    aspect_ratio: str = "1:1",
    additional_instructions: str = "",
    preset: str = "fast",
    custom_prompt: str = "",
) -> dict:
    """
    Constructs a faithful FLUX.2 Klein 4B prompt while preserving the user's meaning.
    If `custom_prompt` is provided, it is sent directly to FLUX.2 Klein 4B unmodified.
    """
    dims = Flux2KleinConfig.get_dimensions(aspect_ratio=aspect_ratio, preset_id=preset)
    cat_info = CATEGORY_CONTEXT.get(
        category,
        {
            "theme_desc": "environmental sustainability campaign theme",
            "exclusions": "unrelated industrial clutter",
        },
    )

    clean_theme = (theme or "").strip()
    clean_desc = (description or "").strip()
    clean_extra = (additional_instructions or "").strip()
    clean_custom = (custom_prompt or "").strip()

    if clean_custom:
        full_prompt = clean_custom
    else:
        user_parts = []
        if clean_desc and clean_theme:
            if clean_theme.lower() in clean_desc.lower():
                user_parts.append(clean_desc)
            else:
                user_parts.append(f"{clean_theme}: {clean_desc}")
        elif clean_desc:
            user_parts.append(clean_desc)
        elif clean_theme:
            user_parts.append(clean_theme)

        if clean_extra:
            user_parts.append(clean_extra)

        style_desc = FLUX2_STYLE_GUIDES.get(image_style, FLUX2_STYLE_GUIDES["Realistic Photography"])
        aud_desc = AUDIENCE_TONE.get(target_audience, AUDIENCE_TONE["General Public"])

        prompt_parts = [
            *user_parts,
            style_desc,
            f"environmental sustainability campaign visual ({cat_info['theme_desc']}, {aud_desc})",
        ]
        full_prompt = ", ".join(p for p in prompt_parts if p)

    negative_prompt = (
        f"{cat_info['exclusions']}, blurry, distorted anatomy, watermark, low resolution, artifacts"
    )

    return {
        "prompt": full_prompt,
        "negative_prompt": negative_prompt,
        "dimensions": dims,
        "aspect_ratio": aspect_ratio,
        "preset": Flux2KleinConfig.get_preset(preset)["id"],
        "structured_components": {
            "user_theme": clean_theme,
            "user_description": clean_desc,
            "category": category,
            "style": image_style,
            "audience": target_audience,
            "exclusions": cat_info["exclusions"],
            "custom_prompt_used": bool(clean_custom),
        },
    }
