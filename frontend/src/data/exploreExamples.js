export const exploreExamples = [
  {
    id: "ex-save-water",
    title: "Save Water",
    subtitle: "Every Drop Counts for Tomorrow",
    description: "An architectural and nature-inspired visual highlighting watershed stewardship, rainwater harvesting channels, and mindful everyday freshwater conservation.",
    category: "Water Conservation",
    image_style: "Realistic Photography",
    target_audience: "Students",
    aspect_ratio: "1:1",
    additional_instructions: "Clean architectural courtyard with rainwater reflecting pools, lush ferns, soft morning daylight.",
    previewImage: "/showcase/water-stewardship.jpg",
    previewGradient: "from-emerald-900 to-teal-950",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    iconName: "Droplet"
  },
  {
    id: "ex-save-electricity",
    title: "Save Electricity",
    subtitle: "Smart Power, Brighter Future",
    description: "Illustrating energy conservation at home: smart wall dimmers, warm recessed LED lighting, and mindful residential electricity use.",
    category: "Energy Conservation",
    image_style: "Realistic Photography",
    target_audience: "Households",
    aspect_ratio: "1:1",
    additional_instructions: "Minimalist eco-living room at twilight with warm LED lighting and smart wall dimmer switch.",
    previewImage: "/showcase/save-electricity.jpg",
    previewGradient: "from-amber-900 to-slate-950",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    iconName: "Zap"
  },
  {
    id: "ex-go-solar",
    title: "Go Solar",
    subtitle: "Harnessing the Clean Power of the Sun",
    description: "Sleek dark monocrystalline photovoltaic solar panels integrated onto a modern sustainable roofline bathed in crisp morning sunlight.",
    category: "Renewable Energy",
    image_style: "Realistic Photography",
    target_audience: "Industrial Consumers",
    aspect_ratio: "16:9",
    additional_instructions: "Modern residential rooftop solar panels under clear blue sky surrounded by green trees.",
    previewImage: "/showcase/rooftop-solar.png",
    previewGradient: "from-emerald-900 to-slate-950",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconName: "Sun"
  },
  {
    id: "ex-reduce-plastic",
    title: "Reduce Plastic",
    subtitle: "Breaking Free From Single-Use Waste",
    description: "Volunteers clearing plastic debris along a sunlit coastal shoreline beside turquoise ocean waves, protecting coastal ecosystems.",
    category: "Pollution Control",
    image_style: "Realistic Photography",
    target_audience: "General Public",
    aspect_ratio: "1:1",
    additional_instructions: "Natural coastal daylight, turquoise ocean surf, community beach cleanup action.",
    previewImage: "/showcase/coastal-cleanup.png",
    previewGradient: "from-teal-900 to-slate-950",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    iconName: "ShieldAlert"
  },
  {
    id: "ex-plant-trees",
    title: "Plant More Trees",
    subtitle: "Rooting Hope in Urban Spaces",
    description: "Lush rainforest canopy with sunbeams filtering onto an emerald river, celebrating forest restoration and natural carbon capture.",
    category: "Sustainable Living",
    image_style: "Realistic Photography",
    target_audience: "Children",
    aspect_ratio: "4:5",
    additional_instructions: "Rich emerald canopy, sunbeams through mist, thriving natural flora.",
    previewImage: "/showcase/rainforest-river.png",
    previewGradient: "from-green-900 to-slate-950",
    badgeColor: "bg-green-100 text-green-800 border-green-200",
    iconName: "Sprout"
  },
  {
    id: "ex-clean-energy",
    title: "Clean Energy",
    subtitle: "Wind & Grid Harmony",
    description: "Towering white wind turbines rotating gracefully over rolling green hills under a bright golden sky, transmitting clean renewable wind energy.",
    category: "Renewable Energy",
    image_style: "Digital Art",
    target_audience: "General Public",
    aspect_ratio: "16:9",
    additional_instructions: "Rolling green hills with wind turbines and clean horizon in golden morning sunlight.",
    previewImage: "/showcase/solar-wind.png",
    previewGradient: "from-sky-900 to-slate-950",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
    iconName: "Wind"
  },
  {
    id: "ex-protect-wildlife",
    title: "Protect Wildlife",
    subtitle: "Preserving Marine & Forest Biodiversity",
    description: "A green sea turtle gliding peacefully above vibrant coral reefs in crystal-clear turquoise water, underscoring ocean conservation.",
    category: "Climate Awareness",
    image_style: "Realistic Photography",
    target_audience: "Students",
    aspect_ratio: "1:1",
    additional_instructions: "Sunbeams piercing clear ocean water, healthy coral ecosystem, calm documentary framing.",
    previewImage: "/showcase/ocean-wildlife.jpg",
    previewGradient: "from-emerald-900 to-cyan-950",
    badgeColor: "bg-lime-100 text-lime-800 border-lime-200",
    iconName: "Leaf"
  },
  {
    id: "ex-reduce-carbon",
    title: "Reduce Carbon Footprint",
    subtitle: "Step Lightly on Our Shared Planet",
    description: "Low-carbon urban mobility showing commuter cyclists along a tree-shaded green avenue beside sustainable timber-and-glass eco buildings.",
    category: "Climate Awareness",
    image_style: "Realistic Photography",
    target_audience: "Households",
    aspect_ratio: "1:1",
    additional_instructions: "Tree-lined green bike lane, urban sustainability, soft natural morning light.",
    previewImage: "/showcase/reduce-carbon.png",
    previewGradient: "from-slate-800 to-emerald-950",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    iconName: "Footprints"
  }
];

/**
 * Validates that every Explore campaign card maps to a unique image asset.
 * Flags any duplicate image source so an unrelated visual is never silently reused.
 */
export function validateUniqueExampleImages(items) {
  const seenImages = new Map();
  const duplicateIds = new Set();

  for (const item of items) {
    const src = (item.previewImage || '').trim();
    if (!src) continue;
    if (seenImages.has(src)) {
      duplicateIds.add(item.id);
      if (import.meta.env.DEV) {
        console.warn(
          `[Explore] Duplicate image detected for "${item.id}" (${item.title}); already assigned to "${seenImages.get(src)}".`
        );
      }
    } else {
      seenImages.set(src, item.id);
    }
  }

  return duplicateIds;
}
