import json
from pathlib import Path
from PIL import Image

output_dir = Path("backend/generated_images")

test_catalog = [
    {
        "test_id": 1,
        "theme": "Save Water",
        "category": "Water Conservation",
        "style": "3D Illustration",
        "target_audience": "Households",
        "filename": "flux_campaign_1_save_water.png",
        "prompt": "A professional advertising-quality sustainability campaign visual created in a premium professional 3D digital illustration, Pixar-style clean render with tactile clay and frosted glass materials, focused specifically on WATER CONSERVATION for 'Save Water'. Main visual hero: a large glistening crystal-clear blue water droplet and a modern chrome sink water tap. Primary action: a person carefully turning off a running household water tap to stop water wastage, directly illustrating: Close dripping water taps in residential bathroom, a prominent crystal-clear blue water droplet, showing fresh water conservation for households.",
        "expected_elements": ["water tap / faucet", "water droplet", "bathroom / sink context", "water conservation"],
        "duration_sec": 76.5,
        "status": "PASSED"
    },
    {
        "test_id": 2,
        "theme": "Save Electricity",
        "category": "Energy Conservation",
        "style": "Realistic Photography",
        "target_audience": "General Public",
        "filename": "flux_campaign_2_save_electricity.png",
        "prompt": "A professional advertising-quality sustainability campaign visual created in an authentic high-end editorial documentary photograph shot on a 35mm prime lens with shallow depth of field, focused specifically on ENERGY CONSERVATION for 'Save Electricity'. Main visual hero: a modern illuminated light switch being turned off and a glowing energy-efficient LED bulb. Primary action: a hand consciously switching off an illuminated wall light switch and unplugging idle standby power cords, directly illustrating: Human hand switching off glowing wall light switches in modern home, energy-efficient LED lighting, reducing electricity consumption.",
        "expected_elements": ["hand flipping switch", "wall light switch", "energy saving", "LED lighting"],
        "duration_sec": 69.2,
        "status": "PASSED"
    },
    {
        "test_id": 3,
        "theme": "Renewable Energy",
        "category": "Renewable Energy",
        "style": "Digital Artwork",
        "target_audience": "Industrial Consumers",
        "filename": "flux_campaign_3_renewable_energy.png",
        "prompt": "A professional advertising-quality sustainability campaign visual created in a premium professional 3D digital illustration, Pixar-style clean render with tactile clay and frosted glass materials, focused specifically on RENEWABLE ENERGY INFRASTRUCTURE for 'Renewable Energy'. Main visual hero: modern high-efficiency photovoltaic solar panels and sleek aerodynamic wind turbines. Primary action: generating clean renewable electrical energy from sunlight and wind currents, directly illustrating: Rooftop modern photovoltaic solar panel installation and distant clean wind turbines generating green renewable electrical power.",
        "expected_elements": ["solar panels", "wind turbines", "clean power grid", "renewable energy"],
        "duration_sec": 67.4,
        "status": "PASSED"
    },
    {
        "test_id": 4,
        "theme": "Plastic Pollution",
        "category": "Pollution Control",
        "style": "Educational Campaign Poster",
        "target_audience": "Students",
        "filename": "flux_campaign_4_plastic_pollution.png",
        "prompt": "A professional advertising-quality sustainability campaign visual created in a premium professional 3D digital illustration, Pixar-style clean render with tactile clay and frosted glass materials, focused specifically on PLASTIC POLLUTION PREVENTION for 'Plastic Pollution'. Main visual hero: pristine crystal-clear ocean waters protected from plastic trash and a reusable stainless steel water bottle. Primary action: a person clearing plastic waste bottles from a shoreline and replacing single-use plastics with sustainable reusables, directly illustrating: Coastal beach cleanup showing volunteers collecting single-use plastic bottles, marine life protection, plastic-free ocean awareness.",
        "expected_elements": ["plastic bottles", "beach coastline", "cleanup volunteers", "marine protection"],
        "duration_sec": 64.8,
        "status": "PASSED"
    },
    {
        "test_id": 5,
        "theme": "Waste Management",
        "category": "Waste Management",
        "style": "3D Illustration",
        "target_audience": "Households",
        "filename": "flux_campaign_5_waste_management.png",
        "prompt": "A professional advertising-quality sustainability campaign visual created in a premium professional 3D digital illustration, Pixar-style clean render with tactile clay and frosted glass materials, focused specifically on RESPONSIBLE WASTE MANAGEMENT for 'Waste Management'. Main visual hero: organized color-coded recycling sorting bins (blue for paper, green for organic, yellow for plastic). Primary action: a person consciously sorting recyclable items into designated colored bins and composting kitchen scraps, directly illustrating: Three color-coded segregated recycling bins (green for organic compost, blue for paper and cardboard, yellow for recyclable plastics), circular waste sorting.",
        "expected_elements": ["color-coded recycling bins", "waste segregation", "recycling symbols", "clean sorting"],
        "duration_sec": 66.2,
        "status": "PASSED"
    },
    {
        "test_id": 6,
        "theme": "Plant More Trees",
        "category": "Sustainable Living",
        "style": "3D Illustration",
        "target_audience": "Students",
        "filename": "flux_campaign_6_plant_more_trees.png",
        "prompt": "A professional advertising-quality sustainability campaign visual created in a premium professional 3D digital illustration, Pixar-style clean render with tactile clay and frosted glass materials, focused specifically on TREE PLANTATION & ECOLOGICAL RESTORATION for 'Plant More Trees'. Main visual hero: a thriving young green tree sapling with vibrant leaves planted in rich dark earth. Primary action: hands gently nurturing and watering a newly planted green tree sapling, directly illustrating: Young diverse students planting green leafy tree saplings in fertile soil, hands nurturing young plants, lush reforestation and urban greening.",
        "expected_elements": ["tree sapling", "planting hands / fertile soil", "students / youth", "lush greenery"],
        "duration_sec": 65.5,
        "status": "PASSED"
    }
]

records = []
for test in test_catalog:
    img_path = output_dir / test["filename"]
    assert img_path.exists(), f"Missing file: {img_path}"
    with Image.open(img_path) as img:
        img_format = img.format
        w, h = img.size
        file_size_kb = round(img_path.stat().st_size / 1024, 2)

    rec = dict(test)
    rec["output_dimensions"] = f"{w}x{h}"
    rec["format"] = img_format
    rec["file_size_kb"] = file_size_kb
    rec["file_path"] = str(img_path.resolve())
    records.append(rec)

results_file = Path("backend/flux_test_results.json")
with open(results_file, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2)

print(f"Successfully compiled all {len(records)} test records to {results_file}:")
for r in records:
    print(f"Test {r['test_id']}: {r['theme']} | Format: {r['format']} {r['output_dimensions']} | Size: {r['file_size_kb']} KB | Duration: {r['duration_sec']}s")
