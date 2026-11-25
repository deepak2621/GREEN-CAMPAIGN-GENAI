"""
FLUX.2 Klein 4B Prompt Engineering System for Green Campaign AI.
Specifically optimized for Black Forest Labs' FLUX.2 Klein 4B (Distilled) with Qwen3-4B text encoder.
Enforces direct front-loaded subject anchoring for 4-step distilled diffusion,
with dedicated visual representations for all 7 sustainability categories:

1. Water Conservation – taps, water droplets, saving water, clean water
2. Energy Conservation – light switches, efficient appliances, electricity-saving activities
3. Renewable Energy – solar panels, wind turbines, clean-energy infrastructure
4. Waste Management – recycling bins, waste segregation, reusable materials
5. Plastic Pollution / Pollution Control – plastic waste, clean ocean, beach cleanup activities
6. Climate Awareness – climate change impacts, planetary care, Earth in hands
7. Tree Plantation / Sustainable Living – people planting trees, green spaces, ecological restoration
"""

# Style descriptors optimized for FLUX.2 Klein + Qwen3-4B
FLUX2_STYLE_GUIDES = {
    "3D Illustration": "professional 3D digital illustration, Pixar style clean render, studio key lighting, smooth clay textures, sharp focus, octane render, 8k",
    "Professional 3D illustration": "professional 3D digital illustration, Pixar style clean render, studio key lighting, smooth clay textures, sharp focus, octane render, 8k",
    "Realistic Photography": "authentic editorial photograph, shot on 35mm prime lens, cinematic natural daylight, crisp detail, sharp focus, high resolution",
    "Realistic photography": "authentic editorial photograph, shot on 35mm prime lens, cinematic natural daylight, crisp detail, sharp focus, high resolution",
    "Educational Infographic Illustration": "modern educational public utility campaign poster, clear visual hierarchy, bright clean lighting, crisp vector graphic elements, high visual clarity",
    "Educational campaign poster": "modern educational public utility campaign poster, clear visual hierarchy, bright clean lighting, crisp vector graphic elements, high visual clarity",
    "Digital Art": "masterpiece digital concept artwork, atmospheric depth, vibrant cinematic lighting, detailed brushwork, luminous environmental highlights",
    "Digital artwork": "masterpiece digital concept artwork, atmospheric depth, vibrant cinematic lighting, detailed brushwork, luminous environmental highlights",
    "Flat Vector Illustration": "clean modern minimalist vector poster art, bold geometric shapes, flat color palette, high contrast, clean negative space",
    "Minimalist illustration": "clean modern minimalist vector poster art, bold geometric shapes, flat color palette, high contrast, clean negative space",
    "Cartoon Illustration": "whimsical storybook cartoon illustration, friendly character design, cheerful bright daylight, warm colors, gentle outlines, Disney Ghibli style"
}

# Dedicated category visual rules for FLUX.2 Klein 4B
CATEGORY_FLUX2_RULES = {
    "Water Conservation": {
        "category_title": "Water Conservation",
        "primary_subject": "A person turning off a running water tap, a large crystal-clear blue water droplet, clean water splash",
        "environment": "modern clean sink setting, fresh indoor green potted plants, clean water ripples",
        "action": "turning off faucet to conserve water and prevent waste",
        "color_palette": "crisp aquatic blue, azure, crystal cyan, pure white, fresh green accents",
        "exclusions": "solar panels, wind turbines, power plants, electrical wires, trash dump, industrial smokestacks"
    },
    "Energy Conservation": {
        "category_title": "Energy Conservation",
        "primary_subject": "A human hand switching off a modern illuminated light switch on a clean wall, a glowing energy-efficient LED light bulb, an unplugged power cord",
        "environment": "cozy modern energy-efficient home interior, soft ambient natural daylight",
        "action": "switching off light switch and saving electricity",
        "color_palette": "warm amber glow, electric golden yellow, sleek modern white, soft emerald green",
        "exclusions": "water droplets, dripping faucet, plumbing pipes, ocean, trash dump, agricultural irrigation"
    },
    "Renewable Energy": {
        "category_title": "Renewable Energy",
        "primary_subject": "Modern rooftop solar photovoltaic panels reflecting bright sunlight and sleek white wind turbines spinning on a green hill under clear blue skies",
        "environment": "sunlit rolling green hills, eco-friendly modern homes, clean electric grid",
        "action": "generating clean limitless renewable energy from solar and wind",
        "color_palette": "vibrant solar gold, crystal sky blue, metallic silver, meadow green",
        "exclusions": "oil rigs, coal plants, dripping water, faucet, trash bins, landfill, dark smokestacks"
    },
    "Waste Management": {
        "category_title": "Waste Management",
        "primary_subject": "Organized color-coded recycling sorting bins (blue for paper, green for organic, yellow for plastic) with clear recycling symbols",
        "environment": "clean community recycling station and modern eco-friendly courtyard",
        "action": "a person responsibly sorting recyclable materials into designated color bins",
        "color_palette": "recycling blue, energetic yellow, compost rich brown, fresh leaf green",
        "exclusions": "wind turbines, solar panels, electrical pylons, plumbing faucets, chaotic burning dump"
    },
    "Plastic Pollution": {
        "category_title": "Plastic Pollution",
        "primary_subject": "Pristine clear turquoise ocean water with a sea turtle swimming safely, volunteer hands clearing plastic bottles and trash from a clean sandy shoreline",
        "environment": "beautiful ocean coastline with transparent water, clean white sand, healthy marine life",
        "action": "clearing plastic waste from beaches and protecting marine ecosystem",
        "color_palette": "crystal ocean turquoise, sparkling aqua, mountain sky blue, clean white",
        "exclusions": "heavy industrial factories, toxic dump, dark smog, oily black sludge, radioactive symbols"
    },
    "Pollution Control": {
        "category_title": "Pollution Control",
        "primary_subject": "Pristine clear turquoise ocean water with healthy marine life, volunteer hands clearing plastic bottles and trash from a sandy shoreline, clean fresh air",
        "environment": "clean coastal environment with transparent water, clean skyline, thriving nature",
        "action": "cleaning up plastic pollution and stopping emissions at source",
        "color_palette": "crystal turquoise, sparkling aqua, clear sky blue, pure white",
        "exclusions": "heavy industrial factories, toxic dump, dark smog, oily sludge"
    },
    "Climate Awareness": {
        "category_title": "Climate Awareness",
        "primary_subject": "Planet Earth gently held and protected in caring human hands, surrounded by flourishing green trees, blue oceans, and clean atmosphere",
        "environment": "global ecological balance showing vibrant nature, green canopy, clean horizon",
        "action": "protecting Earth from global warming and caring for the planetary ecosystem",
        "color_palette": "planetary ocean blue, lush continental emerald green, pure cloud white, warm sunlight",
        "exclusions": "smokestacks, dirty factories, garbage trucks, oil slicks, radioactive symbols, apocalypse"
    },
    "Tree Plantation": {
        "category_title": "Tree Plantation",
        "primary_subject": "People carefully planting a vibrant green young tree sapling into rich dark fertile soil, watering can with clean water droplets",
        "environment": "flourishing community park and green neighborhood with tree-lined pathway",
        "action": "planting young trees to restore nature, clean air, and provide cool shade",
        "color_palette": "botanical forest green, warm soil brown, sunny leaf yellow, clean sky blue",
        "exclusions": "heavy industrial factories, power transformers, oil pipelines, traffic gridlock, smokestacks"
    },
    "Sustainable Living": {
        "category_title": "Sustainable Living",
        "primary_subject": "People planting a vibrant green young tree sapling into rich soil and riding an urban commuter bicycle in a green eco-friendly neighborhood",
        "environment": "walkable green neighborhood with rooftop planters, solar pergolas, flourishing trees",
        "action": "planting trees and practicing sustainable daily eco-friendly habits",
        "color_palette": "botanical sage green, warm wood tones, cheerful sunlight yellow, crisp white",
        "exclusions": "heavy industrial factories, power transformers, oil pipelines, traffic gridlock, smokestacks"
    }
}

AUDIENCE_TONE = {
    "General Public": "broad community appeal, relatable public setting",
    "Students": "youth empowerment, scientific educational visual clarity",
    "Children": "cheerful friendly characters, bright joyful colors, whimsical storybook appeal",
    "Households": "cozy residential home setting, everyday practical bill-saving lifestyle",
    "Industrial Consumers": "modern architectural enterprise scale, clean corporate efficiency"
}

ASPECT_RATIO_DIMENSIONS = {
    "1:1": {"width": 512, "height": 512, "label": "Square (1:1)"},
    "4:5": {"width": 512, "height": 640, "label": "Portrait (4:5)"},
    "16:9": {"width": 640, "height": 384, "label": "Landscape (16:9)"}
}

def build_prompt(
    theme: str,
    description: str,
    category: str,
    image_style: str,
    target_audience: str,
    aspect_ratio: str = "1:1",
    additional_instructions: str = ""
) -> dict:
    """
    Constructs an optimized visual prompt for FLUX.2 Klein 4B (Distilled).
    The prompt anchors the specific category subject at the very start to guarantee
    direct semantic alignment under 4-step distilled flow matching.
    """
    cat_rule = CATEGORY_FLUX2_RULES.get(category, CATEGORY_FLUX2_RULES["Water Conservation"])
    style_desc = FLUX2_STYLE_GUIDES.get(image_style, FLUX2_STYLE_GUIDES["3D Illustration"])
    audience_mod = AUDIENCE_TONE.get(target_audience, AUDIENCE_TONE["General Public"])
    dims = ASPECT_RATIO_DIMENSIONS.get(aspect_ratio, ASPECT_RATIO_DIMENSIONS["1:1"])

    # 1. Front-loaded Primary Subject
    prompt_parts = [
        f"{cat_rule['primary_subject']}",
        f"{cat_rule['action']}",
        f"focused on '{theme}': {description}" if description else f"focused on '{theme}'",
        f"setting in {cat_rule['environment']}",
        f"tailored for {target_audience} ({audience_mod})",
        f"color harmony with {cat_rule['color_palette']}",
        f"{style_desc}",
        "award-winning public utility education visual, high clarity, centered composition"
    ]

    if additional_instructions and additional_instructions.strip():
        prompt_parts.append(f"details: {additional_instructions.strip()}")

    full_prompt = ", ".join(prompt_parts)

    negative_exclusions = [
        cat_rule["exclusions"],
        "blurry, low quality, distorted anatomy, extra limbs, ugly, oversaturated, watermark, signature, copyrighted text"
    ]
    negative_prompt = ", ".join(negative_exclusions)

    return {
        "prompt": full_prompt,
        "negative_prompt": negative_prompt,
        "dimensions": dims,
        "aspect_ratio": aspect_ratio,
        "structured_components": {
            "primary_subject": cat_rule["primary_subject"],
            "theme": theme,
            "category": category,
            "style": image_style,
            "audience": target_audience,
            "color_palette": cat_rule["color_palette"],
            "exclusions": cat_rule["exclusions"]
        }
    }
