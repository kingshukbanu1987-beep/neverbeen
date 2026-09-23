// Script to generate community-indian-profiles.ts and community-journey-feed-seed.ts
const fs = require('fs');
const path = require('path');

function generate20DigitUid(id) {
  const str = String(id).padStart(10, '0');
  return `8920153401${str}`;
}

const portraitPhotos = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1534751516642-a1714f52636c?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=400&q=80',
];

const coverPhotos = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
];

const travelPhotos = [
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=800&q=80',
];

// 500 West Bengal & Kolkata Users
const wbMaleFirstNames = [
  'Subhash', 'Debanjan', 'Anirban', 'Sayan', 'Arindam', 'Sourav', 'Tathagata', 'Tanmoy', 'Saptarshi', 'Indranil',
  'Pritam', 'Joydeep', 'Abhishek', 'Ritam', 'Kaushik', 'Sujit', 'Agniva', 'Debashis', 'Arnab', 'Ayan',
  'Bodhisattwa', 'Nilanjan', 'Swarnendu', 'Debabrata', 'Rajarshi', 'Debopam', 'Soumyajit', 'Avik', 'Sumanta', 'Sandip',
  'Partha', 'Prosenjit', 'Deep', 'Gourab', 'Rohan', 'Subrata', 'Kingshuk', 'Bhaswar', 'Anupam', 'Mainak',
  'Shubham', 'Suman', 'Bikram', 'Soumen', 'Debjit', 'Sayantan', 'Rupak', 'Dipayan', 'Samir', 'Amitava',
  'Tridib', 'Chayan', 'Animesh', 'Prasenjit', 'Soumya', 'Arka', 'Subhrajit', 'Dipankar', 'Debarshi', 'Atanu'
];

const wbFemaleFirstNames = [
  'Debolina', 'Moumita', 'Sarmistha', 'Ananya', 'Poulomi', 'Shreya', 'Sneha', 'Rupsha', 'Priyanka', 'Sohini',
  'Trisha', 'Madhumita', 'Koyel', 'Rimjhim', 'Rituparna', 'Swagata', 'Paramita', 'Payel', 'Shatabdi', 'Monalisa',
  'Gargi', 'Srijita', 'Ishita', 'Bhaswati', 'Tanusree', 'Sudeshna', 'Baishali', 'Sagarika', 'Ushashi', 'Arundhati',
  'Oindrila', 'Brishti', 'Tiasha', 'Laboni', 'Sanchita', 'Antara', 'Purbasha', 'Madhurima', 'Monami', 'Bidisha',
  'Dipannita', 'Debjani', 'Sangita', 'Ritwika', 'Aparajita', 'Somasree', 'Sharmila', 'Sreemoyee', 'Barnali', 'Kakali'
];

const wbSurnames = [
  'Banerjee', 'Chatterjee', 'Mukherjee', 'Ganguly', 'Bhattacharya', 'Chakraborty', 'Sen', 'Das', 'Ghosh', 'Bose',
  'Dutta', 'Roy', 'Guha', 'Majumdar', 'Bhowmick', 'Chowdhury', 'Biswas', 'Mondal', 'Pal', 'Dey',
  'Saha', 'Sarkar', 'Mitra', 'Nandi', 'Kar', 'Samanta', 'Kundu', 'Lahiri', 'Bagchi', 'Halder',
  'Pramanik', 'Adhikary', 'Santra', 'Maiti', 'Barman', 'Mallick', 'Goswami', 'Kashyap', 'Chanda', 'Kanjilal'
];

const wbLocations = [
  'Park Street, Kolkata', 'Salt Lake, Kolkata', 'New Town, Kolkata', 'Ballygunge, Kolkata', 'Alipore, Kolkata',
  'Gariahat, Kolkata', 'Jadavpur, Kolkata', 'Shyambazar, Kolkata', 'Behala, Kolkata', 'Dum Dum, Kolkata',
  'Howrah, Kolkata', 'Tollygunge, Kolkata', 'College Street, Kolkata', 'Bowbazar, Kolkata', 'Rajarhat, Kolkata',
  'Kasba, Kolkata', 'Sealdah, Kolkata', 'Bagbazar, Kolkata', 'Sovabazar, Kolkata', 'Lake Gardens, Kolkata',
  'Bhowanipore, Kolkata', 'Chetla, Kolkata', 'Kalighat, Kolkata', 'Barasat, Kolkata', 'Dakshineswar, Kolkata',
  'Darjeeling, West Bengal', 'Kalimpong, West Bengal', 'Kurseong, West Bengal', 'Siliguri, West Bengal', 'Mirik, West Bengal',
  'Jalpaiguri, West Bengal', 'Dooars, West Bengal', 'Digha, West Bengal', 'Mandarmani, West Bengal', 'Sundarbans, West Bengal',
  'Shantiniketan, West Bengal', 'Bolpur, West Bengal', 'Asansol, West Bengal', 'Durgapur, West Bengal', 'Bardhaman, West Bengal',
  'Malda, West Bengal', 'Murshidabad, West Bengal', 'Cooch Behar, West Bengal', 'Purulia, West Bengal', 'Bankura, West Bengal',
  'Bishnupur, West Bengal', 'Krishnanagar, West Bengal', 'Midnapore, West Bengal', 'Haldia, West Bengal', 'Raiganj, West Bengal'
];

const professions = [
  'Heritage Architect', 'Wildlife Photographer', 'Tea Planter & Taster', 'Documentary Filmmaker',
  'Software Engineer', 'Classical Vocalist', 'Trekking & Alpine Guide', 'Travel Columnist',
  'Culinary Explorer & Chef', 'Botanical Researcher', 'Marine Conservationist', 'History Professor',
  'Textile Designer', 'Street Photographer', 'Landscape Artist', 'Visual Storyteller',
  'Independent Journalist', 'Eco-Tourism Consultant', 'Archaeologist', 'Folk Music Archivist'
];

// Generate 500 WB & Kolkata companions
const wbCompanions = [];
for (let i = 0; i < 500; i++) {
  const id = 1001 + i;
  const isFemale = i % 2 === 0;
  const firstName = isFemale
    ? wbFemaleFirstNames[i % wbFemaleFirstNames.length]
    : wbMaleFirstNames[i % wbMaleFirstNames.length];
  const surname = wbSurnames[(i * 3 + Math.floor(i / 10)) % wbSurnames.length];
  const fullName = `${firstName} ${surname}`;
  const location = wbLocations[i % wbLocations.length];
  const city = location;
  const profession = professions[i % professions.length];
  const photo = portraitPhotos[i % portraitPhotos.length];
  const cover = coverPhotos[i % coverPhotos.length];
  const mutual = 1 + (i % 8);
  const isLocked = i % 4 === 0;
  const isOnline = i % 3 === 0;
  const status = i < 15 ? 'connected' : (i === 16 ? 'pending_incoming' : 'none');

  const intro = `Ever since I took my first journey beyond the familiar streets of ${city}, exploring our rich heritage has been an essential part of my life. Working as a ${profession.toLowerCase()} in ${city}, India, I have always believed that travel is about discovering the soul of a place, the rhythm of its daily life, and the warmth of the people who call it home.\n\nWhether discovering historic architecture tucked away in quiet side streets, hiking mountain trails at daybreak, or savoring regional delicacies at bustling neighborhood markets, I find inspiration in unexpected moments. Every landscape tells a story of human resilience, cultural depth, and nature's quiet majesty.\n\nThrough NeverBeen, I look forward to connecting with fellow wanderers, exchanging authentic travel tales, and sharing journeys that celebrate curiosity, mindful exploration, and global companionship.`;

  wbCompanions.push({
    id,
    uniqueId: generate20DigitUid(id),
    fullName,
    profilePhotoUrl: photo,
    coverPhotoUrl: cover,
    country: 'India',
    city,
    profession,
    isOnline,
    activeStatus: isOnline ? 'Active' : 'Away',
    mutualCompanionsCount: mutual,
    status,
    isProfileLocked: isLocked,
    bio: `${profession} exploring scenic trails, heritage routes, and vibrant local stories from ${city}, West Bengal.`,
    aboutMe: `Hello! I am ${fullName}, a ${profession.toLowerCase()} based in ${city}, India. Passionate about slow travel, regional culture, and photography.`,
    aboutMeDetails: {
      intro,
      gender: isFemale ? 'Female' : 'Male',
      dateOfBirth: `199${(i % 9) + 1}-0${(i % 8) + 1}-1${(i % 9) + 1}`,
      location: `${city}, India`,
      hometown: city.split(',')[0].trim(),
      relationshipStatus: i % 2 === 0 ? 'Single' : 'In a relationship',
      languagesKnown: ['Bengali', 'English', 'Hindi'],
      hobbies: ['Photography', 'Traveling', 'Reading', 'Music', 'Culinary Tasting'],
      interests: ['Heritage Trails', 'Nature Treks', 'Architecture', 'Folk Culture', 'Tea Gardens'],
      contactEmail: `${firstName.toLowerCase()}.${surname.toLowerCase()}@neverbeen.example`,
      contactPhone: `+91 9830${String(id).slice(-4)}12`,
      aboutThePerson: `An inspired explorer from ${city} dedicated to preserving cultural heritage and discovering authentic regional vistas.`
    },
    gallery: [
      {
        id: id * 10 + 1,
        url: travelPhotos[i % travelPhotos.length],
        caption: `Serene morning light in ${city}`,
        createdAtUtc: '2026-09-15T08:30:00Z'
      },
      {
        id: id * 10 + 2,
        url: travelPhotos[(i + 3) % travelPhotos.length],
        caption: `Exploring historic paths around ${city}`,
        createdAtUtc: '2026-09-18T16:45:00Z'
      }
    ]
  });
}

// 100 Indian Users from other states
const otherStateCities = [
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Madurai', state: 'Tamil Nadu' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Alleppey', state: 'Kerala' },
  { city: 'Munnar', state: 'Kerala' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Udaipur', state: 'Rajasthan' },
  { city: 'Jodhpur', state: 'Rajasthan' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Varanasi', state: 'Uttar Pradesh' },
  { city: 'Agra', state: 'Uttar Pradesh' },
  { city: 'New Delhi', state: 'Delhi' },
  { city: 'Gurugram', state: 'Haryana' },
  { city: 'Chandigarh', state: 'Punjab' },
  { city: 'Amritsar', state: 'Punjab' },
  { city: 'Shimla', state: 'Himachal Pradesh' },
  { city: 'Manali', state: 'Himachal Pradesh' },
  { city: 'Dharamshala', state: 'Himachal Pradesh' },
  { city: 'Rishikesh', state: 'Uttarakhand' },
  { city: 'Dehradun', state: 'Uttarakhand' },
  { city: 'Panaji', state: 'Goa' },
  { city: 'Anjuna', state: 'Goa' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { city: 'Bhopal', state: 'Madhya Pradesh' },
  { city: 'Indore', state: 'Madhya Pradesh' },
  { city: 'Bhubaneswar', state: 'Odisha' },
  { city: 'Puri', state: 'Odisha' },
  { city: 'Patna', state: 'Bihar' },
  { city: 'Ranchi', state: 'Jharkhand' },
  { city: 'Guwahati', state: 'Assam' },
  { city: 'Shillong', state: 'Meghalaya' },
  { city: 'Gangtok', state: 'Sikkim' },
  { city: 'Hampi', state: 'Karnataka' }
];

const indianNames = [
  { first: 'Rahul', last: 'Sharma', gender: 'Male' },
  { first: 'Priya', last: 'Nair', gender: 'Female' },
  { first: 'Aditya', last: 'Verma', gender: 'Male' },
  { first: 'Rohan', last: 'Kulkarni', gender: 'Male' },
  { first: 'Sneha', last: 'Reddy', gender: 'Female' },
  { first: 'Arjun', last: 'Menon', gender: 'Male' },
  { first: 'Divya', last: 'Iyer', gender: 'Female' },
  { first: 'Vikram', last: 'Singh', gender: 'Male' },
  { first: 'Neha', last: 'Joshi', gender: 'Female' },
  { first: 'Siddharth', last: 'Rao', gender: 'Male' },
  { first: 'Pooja', last: 'Deshmukh', gender: 'Female' },
  { first: 'Aman', last: 'Gupta', gender: 'Male' },
  { first: 'Riya', last: 'Kapoor', gender: 'Female' },
  { first: 'Karthik', last: 'Swaminathan', gender: 'Male' },
  { first: 'Meera', last: 'Pillai', gender: 'Female' },
  { first: 'Ankit', last: 'Chauhan', gender: 'Male' },
  { first: 'Tanvi', last: 'Hegde', gender: 'Female' },
  { first: 'Varun', last: 'Bhatia', gender: 'Male' },
  { first: 'Kavya', last: 'Nambiar', gender: 'Female' },
  { first: 'Harish', last: 'Kumar', gender: 'Male' },
  { first: 'Shweta', last: 'Patil', gender: 'Female' },
  { first: 'Manish', last: 'Tiwari', gender: 'Male' },
  { first: 'Shruti', last: 'Venkatesh', gender: 'Female' },
  { first: 'Nikhil', last: 'Mehta', gender: 'Male' },
  { first: 'Ananya', last: 'Trivedi', gender: 'Female' },
  { first: 'Saurabh', last: 'Mishra', gender: 'Male' },
  { first: 'Ishaan', last: 'Chawla', gender: 'Male' },
  { first: 'Aditi', last: 'Ranganathan', gender: 'Female' },
  { first: 'Deepak', last: 'Yadav', gender: 'Male' },
  { first: 'Kriti', last: 'Sanon', gender: 'Female' }
];

const otherStateCompanions = [];
for (let i = 0; i < 100; i++) {
  const id = 1501 + i;
  const nameObj = indianNames[i % indianNames.length];
  const locObj = otherStateCities[i % otherStateCities.length];
  const city = `${locObj.city}, ${locObj.state}`;
  const fullName = `${nameObj.first} ${nameObj.last}`;
  const isFemale = nameObj.gender === 'Female';
  const profession = professions[(i * 2) % professions.length];
  const photo = portraitPhotos[(i + 7) % portraitPhotos.length];
  const cover = coverPhotos[(i + 4) % coverPhotos.length];
  const mutual = 1 + (i % 6);
  const isLocked = i % 5 === 0;
  const isOnline = i % 2 === 0;
  const status = i < 8 ? 'connected' : 'none';

  const intro = `Ever since I took my first journey beyond the familiar streets of ${city}, exploring the world has been an essential part of my life. Working as a ${profession.toLowerCase()} in ${city}, India, I have always believed that travel is about discovering the soul of a place, the rhythm of its daily life, and the warmth of the people who call it home.\n\nWhether discovering historic architecture tucked away in quiet side streets, hiking mountain trails at daybreak, or savoring regional delicacies at bustling neighborhood markets, I find inspiration in unexpected moments. Every landscape tells a story of human resilience, cultural depth, and nature's quiet majesty.\n\nThrough NeverBeen, I look forward to connecting with fellow wanderers, exchanging authentic travel tales, and sharing journeys that celebrate curiosity, mindful exploration, and global companionship.`;

  otherStateCompanions.push({
    id,
    uniqueId: generate20DigitUid(id),
    fullName,
    profilePhotoUrl: photo,
    coverPhotoUrl: cover,
    country: 'India',
    city,
    profession,
    isOnline,
    activeStatus: isOnline ? 'Active' : 'Busy',
    mutualCompanionsCount: mutual,
    status,
    isProfileLocked: isLocked,
    bio: `${profession} roaming cultural trails and scenic vistas across ${locObj.state} and beyond.`,
    aboutMe: `Hello from ${city}! I am ${fullName}, a ${profession.toLowerCase()} passionate about Indian heritage, outdoor exploration, and photography.`,
    aboutMeDetails: {
      intro,
      gender: nameObj.gender,
      dateOfBirth: `199${(i % 9) + 1}-0${(i % 9) + 1}-2${(i % 8) + 1}`,
      location: `${city}, India`,
      hometown: locObj.city,
      relationshipStatus: i % 3 === 0 ? 'Single' : 'In a relationship',
      languagesKnown: ['Hindi', 'English'],
      hobbies: ['Road Trips', 'Photography', 'Heritage Architecture', 'Coffee', 'Local Cuisines'],
      interests: ['Mountain Passes', 'Ancient Temples', 'Coastal Villages', 'Desert Forts', 'Forest Reserves'],
      contactEmail: `${nameObj.first.toLowerCase()}.${nameObj.last.toLowerCase()}@neverbeen.example`,
      contactPhone: `+91 9900${String(id).slice(-4)}45`,
      aboutThePerson: `An inspired traveler from ${city} dedicated to discovering cultural roots and scenic wonders across the subcontinent.`
    },
    gallery: [
      {
        id: id * 10 + 1,
        url: travelPhotos[(i + 5) % travelPhotos.length],
        caption: `Sunset reflections around ${locObj.city}`,
        createdAtUtc: '2026-09-12T17:20:00Z'
      }
    ]
  });
}

// Generate 525 rich Journey posts
const travelCaptions = [
  'Watching the crimson morning glow wash over the Victoria Memorial and the gentle ripples of the Hooghly River. Truly magical start to the day!',
  'A winding journey on the historic Darjeeling Himalayan Toy Train, chugging through pine-clad ridges and tea gardens at Batasia Loop.',
  'Crisp mountain breeze and views of Kanchenjunga peaks from the hilltops of Kalimpong. The silence here is deeply calming.',
  'Walking the red laterite soil trails of Shantiniketan under the chhatim trees, listening to the soulful chords of baul singers at the weekly haat.',
  'Deep inside the mangrove creeks of the Sundarbans, watching kingfishers swoop over tidal channels as the mist slowly parts.',
  'Marveling at the intricate terracotta carvings on the centuries-old temples of Bishnupur. Such breathtaking craftsmanship preserved in clay!',
  'Golden sand dunes and crashing waves at Digha beach as the sun sinks into the Bay of Bengal.',
  'Browsing through stacks of vintage books along College Street with a steaming earthen cup of masala chai in hand. A paradise for literature lovers.',
  'The iconic arches of the Howrah Bridge framed against stormy monsoon clouds. Kolkata has a rhythm that touches the soul.',
  'Sipping freshly brewed single-estate Muscatel tea right in the middle of Happy Valley Tea Estate in Darjeeling.',
  'Quiet boat ride through the tranquil backwaters of Alleppey, floating beneath canopy arches of coconut palms and blooming water lilies.',
  'Evening Ganga Aarti at Dashashwamedh Ghat in Varanasi. The resonance of brass bells, chanting, and floating oil lamps is unforgettable.',
  'Wandering the pink sandstone colonnades and courtyard arches of Hawa Mahal and Amer Fort in Jaipur.',
  'Early morning jog along Marine Drive in Mumbai as the Arabian Sea breeze greets the awakening city skyline.',
  'Exploring the stone ruins and boulder hills of Hampi at golden hour. It feels like stepping into an ancient mythological dreamscape.',
  'Freshly baked appams and aromatic fish curry at a family-run heritage cafe in Fort Kochi. Coastal flavors at their finest!',
  'Trekking through pine forests and misty apple orchards on the mountain trails above Manali.',
  'Listening to classical sitar ragas echoing through an old courtyard mansion in North Kolkata on a rainy Sunday evening.',
  'Watching the sunset turn the blue-washed houses of Jodhpur into shimmering sapphire light from the ramparts of Mehrangarh Fort.',
  'Camping under star-studded skies in the high-altitude desert of Spiti Valley. The crisp thin air and milky way view are surreal.'
];

const travelMoods = [
  '🌅 Sunrise Magic', '🌿 Forest Wander', '🚂 Heritage Rail', '🍵 Peaceful Solitude',
  '🎨 Cultural Wonder', '🌊 Coastal Waves', '🏔️ Mountain Mist', '📸 Street Frames',
  '🏛️ Historic Marvel', '☕ Rain & Chai', '🎶 Soulful Melodies', '✨ Wanderlust'
];

const allCompanions = [...wbCompanions, ...otherStateCompanions];

const journeyPosts = [];
for (let i = 0; i < 525; i++) {
  const id = 3000 + i + 1;
  const authorComp = allCompanions[i % allCompanions.length];
  const photoCount = (i % 5) + 1; // 1 to 5 photos!
  const imageUrls = [];
  for (let p = 0; p < photoCount; p++) {
    imageUrls.push(travelPhotos[(i * 3 + p) % travelPhotos.length]);
  }
  const caption = travelCaptions[i % travelCaptions.length];
  const mood = travelMoods[i % travelMoods.length];
  const dateOffset = Math.floor(i / 15);
  const hour = (i % 12) + 8;
  const minute = (i * 7) % 60;
  const createdAtUtc = `2026-09-${String(Math.max(1, 22 - dateOffset)).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;

  const tagged = [];
  if (i % 3 === 0) {
    const taggedComp = allCompanions[(i + 17) % allCompanions.length];
    tagged.push({
      id: taggedComp.id,
      fullName: taggedComp.fullName,
      profilePhotoUrl: taggedComp.profilePhotoUrl,
      profession: taggedComp.profession
    });
  }

  const likeCount = (i * 13) % 45 + 3;
  const seedReactions = [
    {
      type: 'Heart',
      user: {
        id: allCompanions[(i + 2) % allCompanions.length].id,
        fullName: allCompanions[(i + 2) % allCompanions.length].fullName,
        profilePhotoUrl: allCompanions[(i + 2) % allCompanions.length].profilePhotoUrl,
        profession: allCompanions[(i + 2) % allCompanions.length].profession
      }
    },
    {
      type: 'Love',
      user: {
        id: allCompanions[(i + 5) % allCompanions.length].id,
        fullName: allCompanions[(i + 5) % allCompanions.length].fullName,
        profilePhotoUrl: allCompanions[(i + 5) % allCompanions.length].profilePhotoUrl,
        profession: allCompanions[(i + 5) % allCompanions.length].profession
      }
    }
  ];

  const comments = [];
  if (i % 2 === 0) {
    const commenter = allCompanions[(i + 9) % allCompanions.length];
    comments.push({
      id: 90000 + i,
      postId: id,
      author: {
        id: commenter.id,
        fullName: commenter.fullName,
        profilePhotoUrl: commenter.profilePhotoUrl,
        profession: commenter.profession
      },
      text: 'Stunning capture! The colors and atmosphere are pure poetry.',
      createdAtUtc: '2026-09-20T10:15:00Z',
      likeCount: 3,
      isLiked: false,
      replies: []
    });
  }

  journeyPosts.push({
    id,
    author: {
      id: authorComp.id,
      uniqueId: authorComp.uniqueId,
      fullName: authorComp.fullName,
      profilePhotoUrl: authorComp.profilePhotoUrl,
      profession: authorComp.profession,
      country: authorComp.country,
      city: authorComp.city
    },
    createdAtUtc,
    text: caption,
    location: authorComp.city,
    mood,
    imageUrl: imageUrls[0],
    imageUrls,
    taggedCompanions: tagged,
    likeCount,
    isLiked: i % 4 === 0,
    myReaction: i % 4 === 0 ? 'Heart' : null,
    reactions: seedReactions,
    likers: seedReactions.map(r => r.user),
    sharesCount: (i % 7),
    comments
  });
}

// Write community-indian-profiles.ts
const indianProfilesTs = `// Autogenerated Indian Community Profiles (Requirements H & I)
import { Companion } from './community';

export const SEED_WB_KOLKATA_COMPANIONS: Companion[] = ${JSON.stringify(wbCompanions, null, 2)};

export const SEED_OTHER_INDIA_COMPANIONS: Companion[] = ${JSON.stringify(otherStateCompanions, null, 2)};

export const ALL_SEED_INDIAN_COMPANIONS: Companion[] = [
  ...SEED_WB_KOLKATA_COMPANIONS,
  ...SEED_OTHER_INDIA_COMPANIONS,
];
`;

fs.writeFileSync(
  path.join(__dirname, '../src/app/models/community-indian-profiles.ts'),
  indianProfilesTs,
  'utf8'
);
console.log('Successfully generated community-indian-profiles.ts with 500 WB/Kolkata + 100 other Indian states companions!');

// Write community-journey-feed-seed.ts
const journeyFeedTs = `// Autogenerated 500+ Journey Posts (Requirement F)
import { JourneyPost } from './community';

export const SEED_EXTENDED_JOURNEY_POSTS: JourneyPost[] = ${JSON.stringify(journeyPosts, null, 2)};
`;

fs.writeFileSync(
  path.join(__dirname, '../src/app/models/community-journey-feed-seed.ts'),
  journeyFeedTs,
  'utf8'
);
console.log('Successfully generated community-journey-feed-seed.ts with 525 rich posts!');
