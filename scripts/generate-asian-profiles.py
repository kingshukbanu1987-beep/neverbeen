import json

indian_names = [
    ('Aarav Sharma', 'Male', 'Delhi', 'Heritage Architect'),
    ('Priya Patel', 'Female', 'Mumbai', 'UX Travel Designer'),
    ('Rohan Mehta', 'Male', 'Bengaluru', 'AI Engineer & Trekker'),
    ('Ananya Iyer', 'Female', 'Chennai', 'Carnatic Vocalist & Explorer'),
    ('Vikram Malhotra', 'Male', 'Jaipur', 'Royal Heritage Curator'),
    ('Sneha Banerjee', 'Female', 'Kolkata', 'Literary Travel Writer'),
    ('Aditya Verma', 'Male', 'Hyderabad', 'Tech Nomad & Foodie'),
    ('Kavita Nair', 'Female', 'Kochi', 'Spice Trail Documentarian'),
    ('Arjun Kapoor', 'Male', 'Pune', 'Motorcycle Expedition Leader'),
    ('Diya Joshi', 'Female', 'Ahmedabad', 'Textile Artisan & Historian'),
    ('Kabir Singh', 'Male', 'Amritsar', 'Culinary Historian'),
    ('Meera Deshmukh', 'Female', 'Goa', 'Coastal Marine Biologist'),
    ('Siddharth Rao', 'Male', 'Varanasi', 'Ghats Landscape Photographer'),
    ('Pooja Reddy', 'Female', 'Visakhapatnam', 'Scuba Diving Instructor'),
    ('Rahul Saxena', 'Male', 'Lucknow', 'Awadhi Cuisine Researcher'),
    ('Ishita Mukherjee', 'Female', 'Darjeeling', 'Organic Tea Planter'),
    ('Manish Gupta', 'Male', 'Chandigarh', 'Urban Green Space Planner'),
    ('Rhea Sen', 'Female', 'Shillong', 'Indie Folk Singer & Trekker'),
    ('Naveen Kumar', 'Male', 'Mysore', 'Silk Weaving Chronicler'),
    ('Tanya Das', 'Female', 'Guwahati', 'Brahmaputra River Naturalist'),
    ('Kunal Singhania', 'Male', 'Udaipur', 'Lakeside Boutique Hotelier'),
    ('Simran Kaur', 'Female', 'Shimla', 'Pine Forest Trail Guide'),
    ('Gaurav Tiwari', 'Male', 'Rishikesh', 'Yoga & White Water Guide'),
    ('Pallavi Kulkarni', 'Female', 'Nashik', 'Vineyard Viticulturist'),
    ('Harshvardhan Rathore', 'Male', 'Jodhpur', 'Desert Safari Naturalist'),
    ('Neha Agarwal', 'Female', 'Bhopal', 'Ancient Rock Art Researcher'),
    ('Abhishek Pillai', 'Male', 'Thiruvananthapuram', 'Ayurvedic Wellness Explorer'),
    ('Shruti Nambiar', 'Female', 'Madurai', 'Temple Architecture Historian'),
    ('Varun Grover', 'Male', 'Dehradun', 'Himalayan Bird Watcher'),
    ('Shweta Swaminathan', 'Female', 'Coimbatore', 'Western Ghats Botanist'),
    ('Devendra Rathod', 'Male', 'Rajkot', 'Handicraft Preservationist'),
    ('Tarun Bhatia', 'Male', 'Agra', 'Mughal Marble Crafts Researcher'),
    ('Geetika Sharma', 'Female', 'Srinagar', 'Houseboat Hospitality Host'),
    ('Alok Chawla', 'Male', 'Leh', 'High-Altitude Pass Biker'),
    ('Sunita Soren', 'Female', 'Ranchi', 'Tribal Ecotourism Leader'),
    ('Deepak Mahapatra', 'Male', 'Bhubaneswar', 'Temple Sculpture Documentarian'),
    ('Aparna Senapati', 'Female', 'Cuttack', 'Filigree Silver Artist'),
    ('Vivek Anand', 'Male', 'Patna', 'Buddhist Circuit Pilgrim Guide'),
    ('Madhavi Latha', 'Female', 'Vijayawada', 'Krishna Delta Explorer'),
    ('Pranav Trivedi', 'Male', 'Vadodara', 'Palace Art Archivist'),
    ('Natasha Dsouza', 'Female', 'Mangalore', 'Coastline Surf Enthusiast'),
    ('Rajat Bose', 'Male', 'Jamshedpur', 'Industrial Heritage Mapper'),
    ('Vandana Mishra', 'Female', 'Jabalpur', 'Marble Rocks Boat Pilot'),
    ('Mohit Chauhan', 'Male', 'Gwalior', 'Classical Music Archivist'),
    ('Sanjana Chawla', 'Female', 'Indore', 'Street Food Columnist'),
    ('Ashwin Raman', 'Male', 'Pondicherry', 'French Quarter Sketch Artist'),
    ('Lalitha Sundaram', 'Female', 'Tiruchirappalli', 'Chola Dynasty Explorer'),
    ('Bikram Thapa', 'Male', 'Gangtok', 'Kanchenjunga High Treks Guide'),
    ('Suraj Kashyap', 'Male', 'Raipur', 'Bastar Forest Explorer'),
    ('Ritika Roy', 'Female', 'Nagpur', 'Tiger Reserve Safari Naturalist')
]

pakistan_names = [
    ('Hamza Malik', 'Male', 'Lahore', 'Walled City Heritage Historian'),
    ('Ayesha Khan', 'Female', 'Karachi', 'Arabian Sea Sailing Instructor'),
    ('Bilal Ahmed', 'Male', 'Islamabad', 'Margalla Hills Trekking Host'),
    ('Fatima Zahra', 'Female', 'Rawalpindi', 'Traditional Pottery Designer'),
    ('Usman Tariq', 'Male', 'Peshawar', 'Silk Route Caravan Chronicler'),
    ('Zainab Noor', 'Female', 'Gilgit', 'Karakoram Alpine Mountaineer'),
    ('Saad Qureshi', 'Male', 'Multan', 'Blue Pottery & Sufi Scholar'),
    ('Hina Rabbani', 'Female', 'Faisalabad', 'Handloom Textile Documenter'),
    ('Omer Farooq', 'Male', 'Sialkot', 'Sports Craft Craftsman'),
    ('Maryam Nawaz', 'Female', 'Quetta', 'Baloch Rugs & Juniper Guide'),
    ('Shahid Afridi', 'Male', 'Peshawar', 'Frontier Pass Explorer'),
    ('Sanam Saeed', 'Female', 'Karachi', 'Sindh Coast Environmentalist'),
    ('Babar Azam', 'Male', 'Lahore', 'Badshahi Heritage Guide'),
    ('Mahira Khan', 'Female', 'Islamabad', 'Cinema & Cultural Curator'),
    ('Fawad Khan', 'Male', 'Lahore', 'Mughal Architecture Enthusiast'),
    ('Rabia Basri', 'Female', 'Sukkur', 'Indus River Wildlife Protector'),
    ('Danish Taimoor', 'Male', 'Hyderabad', 'Sindhi Ajrak Chronicler'),
    ('Aima Baig', 'Female', 'Hunza', 'Karakoram Valley Storyteller'),
    ('Haris Rauf', 'Male', 'Rawalpindi', 'Potohar Plateau Hiker'),
    ('Hania Aamir', 'Female', 'Swat', 'Emerald Valley Ecotourist')
]

bangladesh_names = [
    ('Tanvir Hossain', 'Male', 'Dhaka', 'Old Dhaka Heritage Food Blogger'),
    ('Nusrat Jahan', 'Female', 'Chittagong', 'Shipyard & Port Photographer'),
    ('Farhan Rahman', 'Male', 'Sylhet', 'Ratargul Swamp Forest Naturalist'),
    ('Sadia Islam', 'Female', 'Cox\'s Bazar', 'Longest Sandy Beach Lifeguard & Surfer'),
    ('Shakib Al Hasan', 'Male', 'Rajshahi', 'Padma River Boat Explorer'),
    ('Mehedi Hasan', 'Male', 'Khulna', 'Sundarbans Mangrove Conservationist'),
    ('Tahmina Akhter', 'Female', 'Barisal', 'Floating Guava Market Chronicler'),
    ('Kazi Nazrul Islam', 'Male', 'Rangpur', 'North Bengal Folklorist'),
    ('Rumana Ahmed', 'Female', 'Comilla', 'Archaeological Shalban Vihara Guide'),
    ('Asif Mahmud', 'Male', 'Mymensingh', 'Brahmaputra Riverside Camp Host'),
    ('Tamim Iqbal', 'Male', 'Chittagong', 'Karnaphuli River Maritime Historian'),
    ('Bidya Sinha Mim', 'Female', 'Dhaka', 'Lalbagh Heritage Walk Host'),
    ('Mushfiqur Rahim', 'Male', 'Bogra', 'Mahasthangarh Archaeological Guide'),
    ('Shabnur Sultana', 'Female', 'Jessore', 'Date Palm Crafts Chronicler'),
    ('Mustafizur Rahman', 'Male', 'Satkhira', 'Sundarbans Honey Hunter Guide'),
    ('Joya Ahsan', 'Female', 'Dhaka', 'Bengal Cinema & Art Historian'),
    ('Mashrafe Mortaza', 'Male', 'Narail', 'Chitra River Boat Conservationist'),
    ('Pori Moni', 'Female', 'Patuakhali', 'Kuakata Sunrise & Sunset Chronicler'),
    ('Mahmudullah Riyad', 'Male', 'Mymensingh', 'Garo Hills Border Trekker'),
    ('Tasnia Farin', 'Female', 'Sylhet', 'Jaflong Stone & River Naturalist')
]

female_photos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
]

male_photos = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517070208541-6ddc4d3efbcb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
]

covers = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
]

items = []
current_id = 101

all_tuples = []
for n, g, c, p in indian_names:
    all_tuples.append((n, g, c, 'India', p))
for n, g, c, p in pakistan_names:
    all_tuples.append((n, g, c, 'Pakistan', p))
for n, g, c, p in bangladesh_names:
    all_tuples.append((n, g, c, 'Bangladesh', p))

print(f"Total profiles: {len(all_tuples)} (India: {len(indian_names)}, Pakistan: {len(pakistan_names)}, Bangladesh: {len(bangladesh_names)})")

for i, (name, gender, city, country, prof) in enumerate(all_tuples):
    uid_str = f"8920153401{str(current_id).zfill(10)}"
    photo = female_photos[i % len(female_photos)] if gender == 'Female' else male_photos[i % len(male_photos)]
    cover = covers[i % len(covers)]
    
    status = 'connected' if i < 18 else 'none'
    clean_name = name.lower().replace(" ", ".").replace("'", "")
    clean_handle = name.lower().replace(" ", "_").replace("'", "")
    clean_fb = name.lower().replace(" ", "").replace("'", "")
    
    comp = {
        'id': current_id,
        'uniqueId': uid_str,
        'fullName': name,
        'profilePhotoUrl': photo,
        'coverPhotoUrl': cover,
        'country': country,
        'city': city,
        'profession': prof,
        'isOnline': (i % 3 == 0),
        'activeStatus': 'Active' if (i % 2 == 0) else 'Away',
        'mutualCompanionsCount': (i % 18) + 1,
        'status': status,
        'isProfileLocked': (i % 7 == 0),
        'bio': f"Passionate traveler and {prof.lower()} based in {city}, {country}. Exploring scenic cultures and AI travel stories.",
        'aboutMe': f"Hello! I am {name}, a {prof.lower()} from {city}, {country}. I travel to understand heritage, authentic local cuisines, and forgotten trails.",
        'aboutMeDetails': {
            'intro': f"{prof} and passionate wanderer exploring {city} and beyond.",
            'gender': gender,
            'dateOfBirth': f"199{i%10}-{(i%12)+1:02d}-15",
            'location': f"{city}, {country}",
            'hometown': city,
            'relationshipStatus': 'Single' if i%2 == 0 else 'In a relationship',
            'languagesKnown': ['English', 'Hindi'] if country == 'India' else (['English', 'Urdu'] if country == 'Pakistan' else ['English', 'Bengali']),
            'workExperience': [
                {
                    'id': current_id * 10 + 1,
                    'company': f"{city} Cultural Heritage Trust",
                    'yearFrom': '2021',
                    'yearTo': '',
                    'currentlyWorkHere': True,
                    'country': country,
                    'city': city,
                    'town': 'Central',
                    'description': "Leading initiatives in cultural preservation and travel storytelling."
                }
            ],
            'education': [
                {
                    'id': current_id * 10 + 2,
                    'institutionName': f"{city} University",
                    'level': 'University',
                    'courseOrDegree': "Bachelor of Arts / Science",
                    'yearFrom': '2015',
                    'yearTo': '2019',
                    'currentlyStudying': False
                }
            ],
            'hobbies': ['Photography', 'Traveling', 'Cycling', 'Cooking'][:3 + (i%2)],
            'interests': ['Architecture', 'Historical Heritage', 'Street Food', 'Sunset Chasing'][:3 + (i%2)],
            'contactEmail': f"{clean_name}@travelers.example",
            'contactPhone': f"+{91 if country=='India' else (92 if country=='Pakistan' else 880)} 98{i:02d} {current_id:04d}",
            'socialLinks': [
                {'platform': 'Instagram', 'urlOrHandle': f"@{clean_handle}"},
                {'platform': 'Facebook', 'urlOrHandle': f"facebook.com/{clean_fb}"}
            ],
            'aboutThePerson': f"{name} believes every journey is an opportunity to learn from locals and celebrate common humanity."
        },
        'gallery': [
            {
                'id': current_id * 100 + 1,
                'url': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80',
                'caption': f"Vibrant morning in {city}",
                'createdAtUtc': '2026-09-15T08:00:00Z'
            }
        ]
    }
    items.append(comp)
    current_id += 1

ts_content = "import { Companion } from './community';\n\nexport const SEED_ASIAN_COMPANIONS: Companion[] = " + json.dumps(items, indent=2) + ";\n"

with open('src/app/models/community-asian-profiles.ts', 'w') as f:
    f.write(ts_content)

print(f"Wrote {len(items)} profiles to src/app/models/community-asian-profiles.ts")
