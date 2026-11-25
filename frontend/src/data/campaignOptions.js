export const CATEGORIES = [
  "Water Conservation",
  "Energy Conservation",
  "Renewable Energy",
  "Climate Awareness",
  "Waste Management",
  "Pollution Control",
  "Sustainable Living",
];

export const STYLES = [
  { label: "Realistic Photography", desc: "True-to-life documentary quality with authentic natural lighting" },
  { label: "3D Illustration", desc: "Clean 3D isometric render with smooth studio lighting" },
  { label: "Digital Art", desc: "Atmospheric concept art with rich environmental depth" },
  { label: "Flat Vector Illustration", desc: "Minimalist modern vector poster art with bold shapes" },
  { label: "Educational Infographic Illustration", desc: "Structured campaign poster with clear instructional framing" },
  { label: "Cartoon Illustration", desc: "Warm and inviting storybook styling, ideal for youth education" },
];

export const AUDIENCES = [
  { label: "General Public", desc: "Broad community appeal with everyday relatable situations" },
  { label: "Students", desc: "Curiosity-driven visuals emphasizing science and youth empowerment" },
  { label: "Children", desc: "Whimsical, friendly characters and bright, cheerful colors" },
  { label: "Households", desc: "Practical residential contexts focusing on home bill savings and comfort" },
  { label: "Industrial Consumers", desc: "Commercial & enterprise scale clean energy infrastructure" },
];

export const PRESETS = [
  {
    id: "fast",
    label: "Fast Mode",
    badge: "18 Steps • 512px",
    desc: "Prioritizes speed while preserving strong FLUX.1 Dev visual coherence.",
    dimensions: {
      "1:1": "512×512",
      "4:5": "512×640",
      "16:9": "640×384",
    },
  },
  {
    id: "quality",
    label: "Quality Mode",
    badge: "26 Steps • 768px",
    desc: "Higher resolution and detail for photorealistic campaign posters.",
    dimensions: {
      "1:1": "768×768",
      "4:5": "640×800",
      "16:9": "896×512",
    },
  },
];

export const RATIOS = [
  { id: "1:1", label: "Square", ratio: "1:1", purpose: "Social posts & balanced cards" },
  { id: "4:5", label: "Portrait", ratio: "4:5", purpose: "Campaign posters & flyers" },
  { id: "16:9", label: "Landscape", ratio: "16:9", purpose: "Web banners & slides" },
];

export const QUICK_THEMES = [
  "Save Water in Daily Life",
  "Rooftop Solar for Homes",
  "Protect Ocean Wildlife",
  "Zero Single-Use Plastic",
  "Plant Urban Trees",
];
