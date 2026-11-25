import requests

campaigns = [
    {
        'title': 'Save Water',
        'desc': 'Encourage people to conserve water by turning off taps and reducing unnecessary water usage.',
        'category': 'Water Conservation',
        'style': '3D Illustration',
        'audience': 'Students',
        'filename': 'campaign_1f6a010f0f4b_1795553430.png',
        'prompt': 'A person turning off a running water tap, a large crystal-clear blue water droplet, clean water splash'
    },
    {
        'title': 'Save Electricity',
        'desc': 'Turn off lights and unplug electronics when not in use to conserve power.',
        'category': 'Energy Conservation',
        'style': '3D Illustration',
        'audience': 'Households',
        'filename': 'campaign_2d921a526a7d_1795553447.png',
        'prompt': 'A human hand switching off a modern illuminated light switch on a clean wall, a glowing energy-efficient LED light bulb'
    },
    {
        'title': 'Solar & Wind Clean Future',
        'desc': 'Transition from fossil fuels to clean renewable solar panels and wind turbines.',
        'category': 'Renewable Energy',
        'style': '3D Illustration',
        'audience': 'General Public',
        'filename': 'campaign_1ed826687972_1795553462.png',
        'prompt': 'Modern rooftop solar photovoltaic panels reflecting bright sunlight and sleek white wind turbines spinning on a green hill'
    },
    {
        'title': 'Clean Our Oceans',
        'desc': 'Eliminate single-use plastic to stop ocean waste and save marine life.',
        'category': 'Pollution Control',
        'style': '3D Illustration',
        'audience': 'General Public',
        'filename': 'campaign_2533f3937f9a_1795553477.png',
        'prompt': 'Pristine clear turquoise ocean water with healthy marine life, volunteer hands clearing plastic bottles'
    },
    {
        'title': 'Segregate Waste Daily',
        'desc': 'Sort recyclable paper, plastics, and organic waste into color-coded bins.',
        'category': 'Waste Management',
        'style': '3D Illustration',
        'audience': 'Students',
        'filename': 'campaign_e676049a208f_1795553490.png',
        'prompt': 'Organized color-coded recycling sorting bins (blue for paper, green for organic, yellow for plastic)'
    },
    {
        'title': 'Plant Urban Trees',
        'desc': 'Plant native tree saplings in fertile soil to restore ecological balance and clean air.',
        'category': 'Sustainable Living',
        'style': '3D Illustration',
        'audience': 'Children',
        'filename': 'campaign_452de6f5b1bd_1795553503.png',
        'prompt': 'People planting a vibrant green young tree sapling into rich soil and riding an urban commuter bicycle'
    }
]

for c in campaigns:
    payload = {
        'campaign_title': c['title'],
        'description': c['desc'],
        'category': c['category'],
        'image_style': c['style'],
        'target_audience': c['audience'],
        'aspect_ratio': '1:1',
        'image_path': f"/api/images/{c['filename']}",
        'filename': c['filename'],
        'generated_prompt': c['prompt'],
        'model': 'FLUX.2 Klein 4B Q4'
    }
    r = requests.post('http://127.0.0.1:5000/api/history', json=payload)
    print(c['title'], '->', r.status_code)
