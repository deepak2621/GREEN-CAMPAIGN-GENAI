"""
FLUX.1 Dev Prompt Builder for Green Campaign AI.
Optimized for Black Forest Labs' FLUX.1 Dev (12B) with T5-XXL + CLIP-L dual text encoders.

Design principle:
- Preserve the user's exact prompt and campaign narrative verbatim at the front of the prompt.
- Never replace, override, or contradict the user's subject or meaning.
- Append non-intrusive visual style, lighting, and campaign quality descriptors tailored to FLUX.1 Dev.
"""

from backend.services.model_config import Flux1DevConfig

FLUX1_STYLE_GUIDES = {
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
    "Water Conservation": "water conservation and clean freshwater stewardship theme",
    "Energy Conservation": "energy conservation and mindful electricity saving theme",
    "Renewable Energy": "clean renewable solar and wind energy transition theme",
    "Waste Management": "circular waste management, recycling, and reuse theme",
    "Pollution Control": "pollution prevention, clean oceans, and plastic-free environment theme",
    "Climate Awareness": "climate change awareness, biodiversity, and planetary protection theme",
    "Sustainable Living": "sustainable living, reforestation, and green community theme",
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
    Constructs a faithful FLUX.1 Dev prompt while preserving the user's meaning.
    If `custom_prompt` is provided, it is sent directly to FLUX.1 Dev unmodified.
    """
    dims = Flux1DevConfig.get_dimensions(aspect_ratio=aspect_ratio, preset_id=preset)

    clean_theme = (theme or "").strip()
    clean_desc = (description or "").strip()
    clean_extra = (additional_instructions or "").strip()
    clean_custom = (custom_prompt or "").strip()

    if clean_custom:
        full_prompt = clean_custom
    else:
        # User's core subject & scene description always come FIRST so T5-XXL preserves exact intent
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

        style_desc = FLUX1_STYLE_GUIDES.get(image_style, FLUX1_STYLE_GUIDES["Realistic Photography"])
        cat_desc = CATEGORY_CONTEXT.get(category, "environmental sustainability campaign theme")
        aud_desc = AUDIENCE_TONE.get(target_audience, AUDIENCE_TONE["General Public"])

        prompt_parts = [
            *user_parts,
            style_desc,
            f"environmental sustainability campaign visual ({cat_desc}, {aud_desc})",
        ]
        full_prompt = ", ".join(p for p in prompt_parts if p)

    # FLUX.1 Dev uses distilled FluxGuidance (single-pass BasicGuider); negative prompt is retained as metadata only
    negative_prompt = "blurry, distorted anatomy, watermark, low resolution, artifacts"

    return {
        "prompt": full_prompt,
        "negative_prompt": negative_prompt,
        "dimensions": dims,
        "aspect_ratio": aspect_ratio,
        "preset": Flux1DevConfig.get_preset(preset)["id"],
        "structured_components": {
            "user_theme": clean_theme,
            "user_description": clean_desc,
            "category": category,
            "style": image_style,
            "audience": target_audience,
            "custom_prompt_used": bool(clean_custom),
        },
    }
