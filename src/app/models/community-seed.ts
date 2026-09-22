// Auto-generated seed data matching NeverBeen.API GeoSeedData
export interface SeedCity {
  id: number;
  name: string;
  countryId: number;
}

export interface SeedCountry {
  id: number;
  isoCode2: string;
  name: string;
  phoneCode: string;
  cities: SeedCity[];
}

export const SEED_COUNTRIES: SeedCountry[] = [
  {
    "id": 1,
    "isoCode2": "AD",
    "name": "Andorra",
    "phoneCode": "+376",
    "cities": [
      {
        "id": 1,
        "name": "Andorra la Vella",
        "countryId": 1
      },
      {
        "id": 2,
        "name": "Encamp",
        "countryId": 1
      },
      {
        "id": 3,
        "name": "La Massana",
        "countryId": 1
      }
    ]
  },
  {
    "id": 2,
    "isoCode2": "AE",
    "name": "United Arab Emirates",
    "phoneCode": "+971",
    "cities": [
      {
        "id": 4,
        "name": "Abu Dhabi",
        "countryId": 2
      },
      {
        "id": 5,
        "name": "Dubai",
        "countryId": 2
      },
      {
        "id": 6,
        "name": "Sharjah",
        "countryId": 2
      },
      {
        "id": 7,
        "name": "Ajman",
        "countryId": 2
      },
      {
        "id": 8,
        "name": "Al Ain",
        "countryId": 2
      },
      {
        "id": 9,
        "name": "Fujairah",
        "countryId": 2
      },
      {
        "id": 10,
        "name": "Ras Al Khaimah",
        "countryId": 2
      },
      {
        "id": 11,
        "name": "Umm Al Quwain",
        "countryId": 2
      }
    ]
  },
  {
    "id": 3,
    "isoCode2": "AF",
    "name": "Afghanistan",
    "phoneCode": "+93",
    "cities": [
      {
        "id": 12,
        "name": "Kabul",
        "countryId": 3
      },
      {
        "id": 13,
        "name": "Kandahar",
        "countryId": 3
      },
      {
        "id": 14,
        "name": "Herat",
        "countryId": 3
      },
      {
        "id": 15,
        "name": "Mazar-i-Sharif",
        "countryId": 3
      },
      {
        "id": 16,
        "name": "Jalalabad",
        "countryId": 3
      }
    ]
  },
  {
    "id": 4,
    "isoCode2": "AG",
    "name": "Antigua and Barbuda",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 17,
        "name": "Saint John's",
        "countryId": 4
      },
      {
        "id": 18,
        "name": "Bolans",
        "countryId": 4
      }
    ]
  },
  {
    "id": 5,
    "isoCode2": "AL",
    "name": "Albania",
    "phoneCode": "+355",
    "cities": [
      {
        "id": 19,
        "name": "Tirana",
        "countryId": 5
      },
      {
        "id": 20,
        "name": "Durres",
        "countryId": 5
      },
      {
        "id": 21,
        "name": "Vlore",
        "countryId": 5
      },
      {
        "id": 22,
        "name": "Shkoder",
        "countryId": 5
      },
      {
        "id": 23,
        "name": "Fier",
        "countryId": 5
      }
    ]
  },
  {
    "id": 6,
    "isoCode2": "AM",
    "name": "Armenia",
    "phoneCode": "+374",
    "cities": [
      {
        "id": 24,
        "name": "Yerevan",
        "countryId": 6
      },
      {
        "id": 25,
        "name": "Gyumri",
        "countryId": 6
      },
      {
        "id": 26,
        "name": "Vanadzor",
        "countryId": 6
      },
      {
        "id": 27,
        "name": "Hrazdan",
        "countryId": 6
      }
    ]
  },
  {
    "id": 7,
    "isoCode2": "AO",
    "name": "Angola",
    "phoneCode": "+244",
    "cities": [
      {
        "id": 28,
        "name": "Luanda",
        "countryId": 7
      },
      {
        "id": 29,
        "name": "Huambo",
        "countryId": 7
      },
      {
        "id": 30,
        "name": "Lobito",
        "countryId": 7
      },
      {
        "id": 31,
        "name": "Benguela",
        "countryId": 7
      },
      {
        "id": 32,
        "name": "Namibe",
        "countryId": 7
      }
    ]
  },
  {
    "id": 8,
    "isoCode2": "AR",
    "name": "Argentina",
    "phoneCode": "+54",
    "cities": [
      {
        "id": 33,
        "name": "Buenos Aires",
        "countryId": 8
      },
      {
        "id": 34,
        "name": "Cordoba",
        "countryId": 8
      },
      {
        "id": 35,
        "name": "Rosario",
        "countryId": 8
      },
      {
        "id": 36,
        "name": "Mendoza",
        "countryId": 8
      },
      {
        "id": 37,
        "name": "Mar del Plata",
        "countryId": 8
      },
      {
        "id": 38,
        "name": "La Plata",
        "countryId": 8
      },
      {
        "id": 39,
        "name": "San Miguel de Tucuman",
        "countryId": 8
      },
      {
        "id": 40,
        "name": "Salta",
        "countryId": 8
      },
      {
        "id": 41,
        "name": "Neuquen",
        "countryId": 8
      }
    ]
  },
  {
    "id": 9,
    "isoCode2": "AT",
    "name": "Austria",
    "phoneCode": "+43",
    "cities": [
      {
        "id": 42,
        "name": "Vienna",
        "countryId": 9
      },
      {
        "id": 43,
        "name": "Graz",
        "countryId": 9
      },
      {
        "id": 44,
        "name": "Linz",
        "countryId": 9
      },
      {
        "id": 45,
        "name": "Salzburg",
        "countryId": 9
      },
      {
        "id": 46,
        "name": "Innsbruck",
        "countryId": 9
      },
      {
        "id": 47,
        "name": "Klagenfurt",
        "countryId": 9
      },
      {
        "id": 48,
        "name": "St. Polten",
        "countryId": 9
      }
    ]
  },
  {
    "id": 10,
    "isoCode2": "AU",
    "name": "Australia",
    "phoneCode": "+61",
    "cities": [
      {
        "id": 49,
        "name": "Sydney",
        "countryId": 10
      },
      {
        "id": 50,
        "name": "Melbourne",
        "countryId": 10
      },
      {
        "id": 51,
        "name": "Brisbane",
        "countryId": 10
      },
      {
        "id": 52,
        "name": "Perth",
        "countryId": 10
      },
      {
        "id": 53,
        "name": "Adelaide",
        "countryId": 10
      },
      {
        "id": 54,
        "name": "Canberra",
        "countryId": 10
      },
      {
        "id": 55,
        "name": "Newcastle",
        "countryId": 10
      },
      {
        "id": 56,
        "name": "Gold Coast",
        "countryId": 10
      },
      {
        "id": 57,
        "name": "Hobart",
        "countryId": 10
      },
      {
        "id": 58,
        "name": "Darwin",
        "countryId": 10
      },
      {
        "id": 59,
        "name": "Cairns",
        "countryId": 10
      },
      {
        "id": 60,
        "name": "Ballarat",
        "countryId": 10
      }
    ]
  },
  {
    "id": 11,
    "isoCode2": "AZ",
    "name": "Azerbaijan",
    "phoneCode": "+994",
    "cities": [
      {
        "id": 61,
        "name": "Baku",
        "countryId": 11
      },
      {
        "id": 62,
        "name": "Sumqayit",
        "countryId": 11
      },
      {
        "id": 63,
        "name": "Ganja",
        "countryId": 11
      },
      {
        "id": 64,
        "name": "Mingachevir",
        "countryId": 11
      }
    ]
  },
  {
    "id": 12,
    "isoCode2": "BA",
    "name": "Bosnia and Herzegovina",
    "phoneCode": "+387",
    "cities": [
      {
        "id": 65,
        "name": "Sarajevo",
        "countryId": 12
      },
      {
        "id": 66,
        "name": "Banja Luka",
        "countryId": 12
      },
      {
        "id": 67,
        "name": "Tuzla",
        "countryId": 12
      },
      {
        "id": 68,
        "name": "Zenica",
        "countryId": 12
      },
      {
        "id": 69,
        "name": "Mostar",
        "countryId": 12
      }
    ]
  },
  {
    "id": 13,
    "isoCode2": "BB",
    "name": "Barbados",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 70,
        "name": "Bridgetown",
        "countryId": 13
      },
      {
        "id": 71,
        "name": "Speightstown",
        "countryId": 13
      }
    ]
  },
  {
    "id": 14,
    "isoCode2": "BD",
    "name": "Bangladesh",
    "phoneCode": "+880",
    "cities": [
      {
        "id": 72,
        "name": "Dhaka",
        "countryId": 14
      },
      {
        "id": 73,
        "name": "Chittagong",
        "countryId": 14
      },
      {
        "id": 74,
        "name": "Khulna",
        "countryId": 14
      },
      {
        "id": 75,
        "name": "Rajshahi",
        "countryId": 14
      },
      {
        "id": 76,
        "name": "Sylhet",
        "countryId": 14
      },
      {
        "id": 77,
        "name": "Barishal",
        "countryId": 14
      },
      {
        "id": 78,
        "name": "Narayanganj",
        "countryId": 14
      },
      {
        "id": 79,
        "name": "Gazipur",
        "countryId": 14
      },
      {
        "id": 80,
        "name": "Comilla",
        "countryId": 14
      }
    ]
  },
  {
    "id": 15,
    "isoCode2": "BE",
    "name": "Belgium",
    "phoneCode": "+32",
    "cities": [
      {
        "id": 81,
        "name": "Brussels",
        "countryId": 15
      },
      {
        "id": 82,
        "name": "Antwerp",
        "countryId": 15
      },
      {
        "id": 83,
        "name": "Ghent",
        "countryId": 15
      },
      {
        "id": 84,
        "name": "Liege",
        "countryId": 15
      },
      {
        "id": 85,
        "name": "Bruges",
        "countryId": 15
      },
      {
        "id": 86,
        "name": "Charleroi",
        "countryId": 15
      },
      {
        "id": 87,
        "name": "Namur",
        "countryId": 15
      }
    ]
  },
  {
    "id": 16,
    "isoCode2": "BF",
    "name": "Burkina Faso",
    "phoneCode": "+226",
    "cities": [
      {
        "id": 88,
        "name": "Ouagadougou",
        "countryId": 16
      },
      {
        "id": 89,
        "name": "Bobo-Dioulasso",
        "countryId": 16
      },
      {
        "id": 90,
        "name": "Koudougou",
        "countryId": 16
      }
    ]
  },
  {
    "id": 17,
    "isoCode2": "BG",
    "name": "Bulgaria",
    "phoneCode": "+359",
    "cities": [
      {
        "id": 91,
        "name": "Sofia",
        "countryId": 17
      },
      {
        "id": 92,
        "name": "Plovdiv",
        "countryId": 17
      },
      {
        "id": 93,
        "name": "Varna",
        "countryId": 17
      },
      {
        "id": 94,
        "name": "Burgas",
        "countryId": 17
      },
      {
        "id": 95,
        "name": "Stara Zagora",
        "countryId": 17
      },
      {
        "id": 96,
        "name": "Ruse",
        "countryId": 17
      }
    ]
  },
  {
    "id": 18,
    "isoCode2": "BH",
    "name": "Bahrain",
    "phoneCode": "+973",
    "cities": [
      {
        "id": 97,
        "name": "Manama",
        "countryId": 18
      },
      {
        "id": 98,
        "name": "Muharraq",
        "countryId": 18
      },
      {
        "id": 99,
        "name": "Riffa",
        "countryId": 18
      }
    ]
  },
  {
    "id": 19,
    "isoCode2": "BI",
    "name": "Burundi",
    "phoneCode": "+257",
    "cities": [
      {
        "id": 100,
        "name": "Bujumbura",
        "countryId": 19
      },
      {
        "id": 101,
        "name": "Gitega",
        "countryId": 19
      },
      {
        "id": 102,
        "name": "Ngozi",
        "countryId": 19
      }
    ]
  },
  {
    "id": 20,
    "isoCode2": "BJ",
    "name": "Benin",
    "phoneCode": "+229",
    "cities": [
      {
        "id": 103,
        "name": "Cotonou",
        "countryId": 20
      },
      {
        "id": 104,
        "name": "Porto-Novo",
        "countryId": 20
      },
      {
        "id": 105,
        "name": "Parakou",
        "countryId": 20
      },
      {
        "id": 106,
        "name": "Abomey",
        "countryId": 20
      }
    ]
  },
  {
    "id": 21,
    "isoCode2": "BL",
    "name": "Saint Barthelemy",
    "phoneCode": "+590",
    "cities": [
      {
        "id": 107,
        "name": "Gustavia",
        "countryId": 21
      }
    ]
  },
  {
    "id": 22,
    "isoCode2": "BM",
    "name": "Bermuda",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 108,
        "name": "Hamilton",
        "countryId": 22
      },
      {
        "id": 109,
        "name": "Paget",
        "countryId": 22
      },
      {
        "id": 110,
        "name": "St. George's",
        "countryId": 22
      }
    ]
  },
  {
    "id": 23,
    "isoCode2": "BN",
    "name": "Brunei",
    "phoneCode": "+673",
    "cities": [
      {
        "id": 111,
        "name": "Bandar Seri Begawan",
        "countryId": 23
      },
      {
        "id": 112,
        "name": "Seria",
        "countryId": 23
      },
      {
        "id": 113,
        "name": "Kuala Belait",
        "countryId": 23
      }
    ]
  },
  {
    "id": 24,
    "isoCode2": "BO",
    "name": "Bolivia",
    "phoneCode": "+591",
    "cities": [
      {
        "id": 114,
        "name": "La Paz",
        "countryId": 24
      },
      {
        "id": 115,
        "name": "Santa Cruz de la Sierra",
        "countryId": 24
      },
      {
        "id": 116,
        "name": "Cochabamba",
        "countryId": 24
      },
      {
        "id": 117,
        "name": "Sucre",
        "countryId": 24
      },
      {
        "id": 118,
        "name": "Oruro",
        "countryId": 24
      }
    ]
  },
  {
    "id": 25,
    "isoCode2": "BR",
    "name": "Brazil",
    "phoneCode": "+55",
    "cities": [
      {
        "id": 119,
        "name": "Sao Paulo",
        "countryId": 25
      },
      {
        "id": 120,
        "name": "Rio de Janeiro",
        "countryId": 25
      },
      {
        "id": 121,
        "name": "Brasilia",
        "countryId": 25
      },
      {
        "id": 122,
        "name": "Salvador",
        "countryId": 25
      },
      {
        "id": 123,
        "name": "Fortaleza",
        "countryId": 25
      },
      {
        "id": 124,
        "name": "Belo Horizonte",
        "countryId": 25
      },
      {
        "id": 125,
        "name": "Curitiba",
        "countryId": 25
      },
      {
        "id": 126,
        "name": "Recife",
        "countryId": 25
      },
      {
        "id": 127,
        "name": "Manaus",
        "countryId": 25
      },
      {
        "id": 128,
        "name": "Goiania",
        "countryId": 25
      },
      {
        "id": 129,
        "name": "Belem",
        "countryId": 25
      },
      {
        "id": 130,
        "name": "Porto Alegre",
        "countryId": 25
      }
    ]
  },
  {
    "id": 26,
    "isoCode2": "BS",
    "name": "Bahamas",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 131,
        "name": "Nassau",
        "countryId": 26
      },
      {
        "id": 132,
        "name": "Freeport",
        "countryId": 26
      },
      {
        "id": 133,
        "name": "George Town",
        "countryId": 26
      }
    ]
  },
  {
    "id": 27,
    "isoCode2": "BT",
    "name": "Bhutan",
    "phoneCode": "+975",
    "cities": [
      {
        "id": 134,
        "name": "Thimphu",
        "countryId": 27
      },
      {
        "id": 135,
        "name": "Paro",
        "countryId": 27
      },
      {
        "id": 136,
        "name": "Punakha",
        "countryId": 27
      },
      {
        "id": 137,
        "name": "Gelephu",
        "countryId": 27
      }
    ]
  },
  {
    "id": 28,
    "isoCode2": "BW",
    "name": "Botswana",
    "phoneCode": "+267",
    "cities": [
      {
        "id": 138,
        "name": "Gaborone",
        "countryId": 28
      },
      {
        "id": 139,
        "name": "Francistown",
        "countryId": 28
      },
      {
        "id": 140,
        "name": "Maun",
        "countryId": 28
      },
      {
        "id": 141,
        "name": "Molepolole",
        "countryId": 28
      },
      {
        "id": 142,
        "name": "Mochudi",
        "countryId": 28
      }
    ]
  },
  {
    "id": 29,
    "isoCode2": "BY",
    "name": "Belarus",
    "phoneCode": "+375",
    "cities": [
      {
        "id": 143,
        "name": "Minsk",
        "countryId": 29
      },
      {
        "id": 144,
        "name": "Gomel",
        "countryId": 29
      },
      {
        "id": 145,
        "name": "Brest",
        "countryId": 29
      },
      {
        "id": 146,
        "name": "Vitebsk",
        "countryId": 29
      },
      {
        "id": 147,
        "name": "Grodno",
        "countryId": 29
      }
    ]
  },
  {
    "id": 30,
    "isoCode2": "BZ",
    "name": "Belize",
    "phoneCode": "+501",
    "cities": [
      {
        "id": 148,
        "name": "Belmopan",
        "countryId": 30
      },
      {
        "id": 149,
        "name": "Belize City",
        "countryId": 30
      },
      {
        "id": 150,
        "name": "San Ignacio",
        "countryId": 30
      }
    ]
  },
  {
    "id": 31,
    "isoCode2": "CA",
    "name": "Canada",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 151,
        "name": "Toronto",
        "countryId": 31
      },
      {
        "id": 152,
        "name": "Montreal",
        "countryId": 31
      },
      {
        "id": 153,
        "name": "Vancouver",
        "countryId": 31
      },
      {
        "id": 154,
        "name": "Calgary",
        "countryId": 31
      },
      {
        "id": 155,
        "name": "Ottawa",
        "countryId": 31
      },
      {
        "id": 156,
        "name": "Edmonton",
        "countryId": 31
      },
      {
        "id": 157,
        "name": "Winnipeg",
        "countryId": 31
      },
      {
        "id": 158,
        "name": "Quebec City",
        "countryId": 31
      },
      {
        "id": 159,
        "name": "Hamilton",
        "countryId": 31
      },
      {
        "id": 160,
        "name": "Mississauga",
        "countryId": 31
      },
      {
        "id": 161,
        "name": "London",
        "countryId": 31
      },
      {
        "id": 162,
        "name": "Kitchener",
        "countryId": 31
      },
      {
        "id": 163,
        "name": "Markham",
        "countryId": 31
      },
      {
        "id": 164,
        "name": "Surrey",
        "countryId": 31
      },
      {
        "id": 165,
        "name": "Victoria",
        "countryId": 31
      },
      {
        "id": 166,
        "name": "Oshawa",
        "countryId": 31
      },
      {
        "id": 167,
        "name": "St. Catharines",
        "countryId": 31
      }
    ]
  },
  {
    "id": 32,
    "isoCode2": "CD",
    "name": "Democratic Republic of the Congo",
    "phoneCode": "+243",
    "cities": [
      {
        "id": 168,
        "name": "Kinshasa",
        "countryId": 32
      },
      {
        "id": 169,
        "name": "Lubumbashi",
        "countryId": 32
      },
      {
        "id": 170,
        "name": "Mbuji-Mayi",
        "countryId": 32
      },
      {
        "id": 171,
        "name": "Goma",
        "countryId": 32
      }
    ]
  },
  {
    "id": 33,
    "isoCode2": "CF",
    "name": "Central African Republic",
    "phoneCode": "+236",
    "cities": [
      {
        "id": 172,
        "name": "Bangui",
        "countryId": 33
      },
      {
        "id": 173,
        "name": "Bimbo",
        "countryId": 33
      },
      {
        "id": 174,
        "name": "Bouar",
        "countryId": 33
      }
    ]
  },
  {
    "id": 34,
    "isoCode2": "CG",
    "name": "Republic of the Congo",
    "phoneCode": "+242",
    "cities": [
      {
        "id": 175,
        "name": "Brazzaville",
        "countryId": 34
      },
      {
        "id": 176,
        "name": "Pointe-Noire",
        "countryId": 34
      },
      {
        "id": 177,
        "name": "Owando",
        "countryId": 34
      }
    ]
  },
  {
    "id": 35,
    "isoCode2": "CH",
    "name": "Switzerland",
    "phoneCode": "+41",
    "cities": [
      {
        "id": 178,
        "name": "Zurich",
        "countryId": 35
      },
      {
        "id": 179,
        "name": "Geneva",
        "countryId": 35
      },
      {
        "id": 180,
        "name": "Basel",
        "countryId": 35
      },
      {
        "id": 181,
        "name": "Lausanne",
        "countryId": 35
      },
      {
        "id": 182,
        "name": "Bern",
        "countryId": 35
      },
      {
        "id": 183,
        "name": "Lugano",
        "countryId": 35
      },
      {
        "id": 184,
        "name": "St. Gallen",
        "countryId": 35
      }
    ]
  },
  {
    "id": 36,
    "isoCode2": "CI",
    "name": "Cote d'Ivoire",
    "phoneCode": "+225",
    "cities": [
      {
        "id": 185,
        "name": "Abidjan",
        "countryId": 36
      },
      {
        "id": 186,
        "name": "Bouake",
        "countryId": 36
      },
      {
        "id": 187,
        "name": "Yamoussoukro",
        "countryId": 36
      },
      {
        "id": 188,
        "name": "Korhogo",
        "countryId": 36
      },
      {
        "id": 189,
        "name": "San-Pedro",
        "countryId": 36
      }
    ]
  },
  {
    "id": 37,
    "isoCode2": "CL",
    "name": "Chile",
    "phoneCode": "+56",
    "cities": [
      {
        "id": 190,
        "name": "Santiago",
        "countryId": 37
      },
      {
        "id": 191,
        "name": "Valparaiso",
        "countryId": 37
      },
      {
        "id": 192,
        "name": "Concepcion",
        "countryId": 37
      },
      {
        "id": 193,
        "name": "Antofagasta",
        "countryId": 37
      },
      {
        "id": 194,
        "name": "Puerto Montt",
        "countryId": 37
      },
      {
        "id": 195,
        "name": "Vina del Mar",
        "countryId": 37
      },
      {
        "id": 196,
        "name": "Temuco",
        "countryId": 37
      }
    ]
  },
  {
    "id": 38,
    "isoCode2": "CM",
    "name": "Cameroon",
    "phoneCode": "+237",
    "cities": [
      {
        "id": 197,
        "name": "Douala",
        "countryId": 38
      },
      {
        "id": 198,
        "name": "Yaounde",
        "countryId": 38
      },
      {
        "id": 199,
        "name": "Bamenda",
        "countryId": 38
      },
      {
        "id": 200,
        "name": "Garoua",
        "countryId": 38
      },
      {
        "id": 201,
        "name": "Maroua",
        "countryId": 38
      }
    ]
  },
  {
    "id": 39,
    "isoCode2": "CN",
    "name": "China",
    "phoneCode": "+86",
    "cities": [
      {
        "id": 202,
        "name": "Beijing",
        "countryId": 39
      },
      {
        "id": 203,
        "name": "Shanghai",
        "countryId": 39
      },
      {
        "id": 204,
        "name": "Guangzhou",
        "countryId": 39
      },
      {
        "id": 205,
        "name": "Shenzhen",
        "countryId": 39
      },
      {
        "id": 206,
        "name": "Chengdu",
        "countryId": 39
      },
      {
        "id": 207,
        "name": "Hangzhou",
        "countryId": 39
      },
      {
        "id": 208,
        "name": "Wuhan",
        "countryId": 39
      },
      {
        "id": 209,
        "name": "Nanjing",
        "countryId": 39
      },
      {
        "id": 210,
        "name": "Tianjin",
        "countryId": 39
      },
      {
        "id": 211,
        "name": "Chongqing",
        "countryId": 39
      },
      {
        "id": 212,
        "name": "Xi'an",
        "countryId": 39
      },
      {
        "id": 213,
        "name": "Suzhou",
        "countryId": 39
      },
      {
        "id": 214,
        "name": "Qingdao",
        "countryId": 39
      },
      {
        "id": 215,
        "name": "Dalian",
        "countryId": 39
      }
    ]
  },
  {
    "id": 40,
    "isoCode2": "CO",
    "name": "Colombia",
    "phoneCode": "+57",
    "cities": [
      {
        "id": 216,
        "name": "Bogota",
        "countryId": 40
      },
      {
        "id": 217,
        "name": "Medellin",
        "countryId": 40
      },
      {
        "id": 218,
        "name": "Cali",
        "countryId": 40
      },
      {
        "id": 219,
        "name": "Cartagena",
        "countryId": 40
      },
      {
        "id": 220,
        "name": "Barranquilla",
        "countryId": 40
      },
      {
        "id": 221,
        "name": "Bucaramanga",
        "countryId": 40
      },
      {
        "id": 222,
        "name": "Pereira",
        "countryId": 40
      }
    ]
  },
  {
    "id": 41,
    "isoCode2": "CR",
    "name": "Costa Rica",
    "phoneCode": "+506",
    "cities": [
      {
        "id": 223,
        "name": "San Jose",
        "countryId": 41
      },
      {
        "id": 224,
        "name": "Alajuela",
        "countryId": 41
      },
      {
        "id": 225,
        "name": "Heredia",
        "countryId": 41
      },
      {
        "id": 226,
        "name": "Limon",
        "countryId": 41
      },
      {
        "id": 227,
        "name": "Escazu",
        "countryId": 41
      }
    ]
  },
  {
    "id": 42,
    "isoCode2": "CU",
    "name": "Cuba",
    "phoneCode": "+53",
    "cities": [
      {
        "id": 228,
        "name": "Havana",
        "countryId": 42
      },
      {
        "id": 229,
        "name": "Santiago de Cuba",
        "countryId": 42
      },
      {
        "id": 230,
        "name": "Camaguey",
        "countryId": 42
      },
      {
        "id": 231,
        "name": "Holguin",
        "countryId": 42
      },
      {
        "id": 232,
        "name": "Varadero",
        "countryId": 42
      }
    ]
  },
  {
    "id": 43,
    "isoCode2": "CV",
    "name": "Cape Verde",
    "phoneCode": "+238",
    "cities": [
      {
        "id": 233,
        "name": "Praia",
        "countryId": 43
      },
      {
        "id": 234,
        "name": "Mindelo",
        "countryId": 43
      }
    ]
  },
  {
    "id": 44,
    "isoCode2": "CY",
    "name": "Cyprus",
    "phoneCode": "+357",
    "cities": [
      {
        "id": 235,
        "name": "Nicosia",
        "countryId": 44
      },
      {
        "id": 236,
        "name": "Limassol",
        "countryId": 44
      },
      {
        "id": 237,
        "name": "Paphos",
        "countryId": 44
      },
      {
        "id": 238,
        "name": "Larnaca",
        "countryId": 44
      },
      {
        "id": 239,
        "name": "Famagusta",
        "countryId": 44
      }
    ]
  },
  {
    "id": 45,
    "isoCode2": "CZ",
    "name": "Czech Republic",
    "phoneCode": "+420",
    "cities": [
      {
        "id": 240,
        "name": "Prague",
        "countryId": 45
      },
      {
        "id": 241,
        "name": "Brno",
        "countryId": 45
      },
      {
        "id": 242,
        "name": "Ostrava",
        "countryId": 45
      },
      {
        "id": 243,
        "name": "Plzen",
        "countryId": 45
      },
      {
        "id": 244,
        "name": "Olomouc",
        "countryId": 45
      },
      {
        "id": 245,
        "name": "Liberec",
        "countryId": 45
      }
    ]
  },
  {
    "id": 46,
    "isoCode2": "DE",
    "name": "Germany",
    "phoneCode": "+49",
    "cities": [
      {
        "id": 246,
        "name": "Berlin",
        "countryId": 46
      },
      {
        "id": 247,
        "name": "Munich",
        "countryId": 46
      },
      {
        "id": 248,
        "name": "Hamburg",
        "countryId": 46
      },
      {
        "id": 249,
        "name": "Cologne",
        "countryId": 46
      },
      {
        "id": 250,
        "name": "Frankfurt am Main",
        "countryId": 46
      },
      {
        "id": 251,
        "name": "Stuttgart",
        "countryId": 46
      },
      {
        "id": 252,
        "name": "Dusseldorf",
        "countryId": 46
      },
      {
        "id": 253,
        "name": "Leipzig",
        "countryId": 46
      },
      {
        "id": 254,
        "name": "Dortmund",
        "countryId": 46
      },
      {
        "id": 255,
        "name": "Essen",
        "countryId": 46
      },
      {
        "id": 256,
        "name": "Bremen",
        "countryId": 46
      },
      {
        "id": 257,
        "name": "Dresden",
        "countryId": 46
      },
      {
        "id": 258,
        "name": "Nuremberg",
        "countryId": 46
      },
      {
        "id": 259,
        "name": "Hanover",
        "countryId": 46
      }
    ]
  },
  {
    "id": 47,
    "isoCode2": "DJ",
    "name": "Djibouti",
    "phoneCode": "+253",
    "cities": [
      {
        "id": 260,
        "name": "Djibouti City",
        "countryId": 47
      },
      {
        "id": 261,
        "name": "Tadjoura",
        "countryId": 47
      }
    ]
  },
  {
    "id": 48,
    "isoCode2": "DK",
    "name": "Denmark",
    "phoneCode": "+45",
    "cities": [
      {
        "id": 262,
        "name": "Copenhagen",
        "countryId": 48
      },
      {
        "id": 263,
        "name": "Aarhus",
        "countryId": 48
      },
      {
        "id": 264,
        "name": "Odense",
        "countryId": 48
      },
      {
        "id": 265,
        "name": "Aalborg",
        "countryId": 48
      },
      {
        "id": 266,
        "name": "Esbjerg",
        "countryId": 48
      }
    ]
  },
  {
    "id": 49,
    "isoCode2": "DM",
    "name": "Dominica",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 267,
        "name": "Roseau",
        "countryId": 49
      },
      {
        "id": 268,
        "name": "Saint Joseph",
        "countryId": 49
      }
    ]
  },
  {
    "id": 50,
    "isoCode2": "DO",
    "name": "Dominican Republic",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 269,
        "name": "Santo Domingo",
        "countryId": 50
      },
      {
        "id": 270,
        "name": "Santiago de los Caballeros",
        "countryId": 50
      },
      {
        "id": 271,
        "name": "La Romana",
        "countryId": 50
      },
      {
        "id": 272,
        "name": "Puerto Plata",
        "countryId": 50
      }
    ]
  },
  {
    "id": 51,
    "isoCode2": "DZ",
    "name": "Algeria",
    "phoneCode": "+213",
    "cities": [
      {
        "id": 273,
        "name": "Algiers",
        "countryId": 51
      },
      {
        "id": 274,
        "name": "Oran",
        "countryId": 51
      },
      {
        "id": 275,
        "name": "Constantine",
        "countryId": 51
      },
      {
        "id": 276,
        "name": "Annaba",
        "countryId": 51
      },
      {
        "id": 277,
        "name": "Blida",
        "countryId": 51
      }
    ]
  },
  {
    "id": 52,
    "isoCode2": "EC",
    "name": "Ecuador",
    "phoneCode": "+593",
    "cities": [
      {
        "id": 278,
        "name": "Quito",
        "countryId": 52
      },
      {
        "id": 279,
        "name": "Guayaquil",
        "countryId": 52
      },
      {
        "id": 280,
        "name": "Cuenca",
        "countryId": 52
      },
      {
        "id": 281,
        "name": "Ambato",
        "countryId": 52
      },
      {
        "id": 282,
        "name": "Riobamba",
        "countryId": 52
      }
    ]
  },
  {
    "id": 53,
    "isoCode2": "EE",
    "name": "Estonia",
    "phoneCode": "+372",
    "cities": [
      {
        "id": 283,
        "name": "Tallinn",
        "countryId": 53
      },
      {
        "id": 284,
        "name": "Tartu",
        "countryId": 53
      },
      {
        "id": 285,
        "name": "Parnu",
        "countryId": 53
      },
      {
        "id": 286,
        "name": "Narva",
        "countryId": 53
      }
    ]
  },
  {
    "id": 54,
    "isoCode2": "EG",
    "name": "Egypt",
    "phoneCode": "+20",
    "cities": [
      {
        "id": 287,
        "name": "Cairo",
        "countryId": 54
      },
      {
        "id": 288,
        "name": "Alexandria",
        "countryId": 54
      },
      {
        "id": 289,
        "name": "Giza",
        "countryId": 54
      },
      {
        "id": 290,
        "name": "Luxor",
        "countryId": 54
      },
      {
        "id": 291,
        "name": "Aswan",
        "countryId": 54
      },
      {
        "id": 292,
        "name": "Mansoura",
        "countryId": 54
      },
      {
        "id": 293,
        "name": "Tanta",
        "countryId": 54
      }
    ]
  },
  {
    "id": 55,
    "isoCode2": "ER",
    "name": "Eritrea",
    "phoneCode": "+291",
    "cities": [
      {
        "id": 294,
        "name": "Asmara",
        "countryId": 55
      },
      {
        "id": 295,
        "name": "Keren",
        "countryId": 55
      },
      {
        "id": 296,
        "name": "Massawa",
        "countryId": 55
      }
    ]
  },
  {
    "id": 56,
    "isoCode2": "ES",
    "name": "Spain",
    "phoneCode": "+34",
    "cities": [
      {
        "id": 297,
        "name": "Madrid",
        "countryId": 56
      },
      {
        "id": 298,
        "name": "Barcelona",
        "countryId": 56
      },
      {
        "id": 299,
        "name": "Valencia",
        "countryId": 56
      },
      {
        "id": 300,
        "name": "Seville",
        "countryId": 56
      },
      {
        "id": 301,
        "name": "Bilbao",
        "countryId": 56
      },
      {
        "id": 302,
        "name": "Malaga",
        "countryId": 56
      },
      {
        "id": 303,
        "name": "Zaragoza",
        "countryId": 56
      },
      {
        "id": 304,
        "name": "Murcia",
        "countryId": 56
      },
      {
        "id": 305,
        "name": "Palma de Mallorca",
        "countryId": 56
      },
      {
        "id": 306,
        "name": "Alicante",
        "countryId": 56
      },
      {
        "id": 307,
        "name": "Valladolid",
        "countryId": 56
      }
    ]
  },
  {
    "id": 57,
    "isoCode2": "ET",
    "name": "Ethiopia",
    "phoneCode": "+251",
    "cities": [
      {
        "id": 308,
        "name": "Addis Ababa",
        "countryId": 57
      },
      {
        "id": 309,
        "name": "Dire Dawa",
        "countryId": 57
      },
      {
        "id": 310,
        "name": "Mekele",
        "countryId": 57
      },
      {
        "id": 311,
        "name": "Hawassa",
        "countryId": 57
      }
    ]
  },
  {
    "id": 58,
    "isoCode2": "FJ",
    "name": "Fiji",
    "phoneCode": "+679",
    "cities": [
      {
        "id": 312,
        "name": "Suva",
        "countryId": 58
      },
      {
        "id": 313,
        "name": "Nadi",
        "countryId": 58
      },
      {
        "id": 314,
        "name": "Lautoka",
        "countryId": 58
      }
    ]
  },
  {
    "id": 59,
    "isoCode2": "FI",
    "name": "Finland",
    "phoneCode": "+358",
    "cities": [
      {
        "id": 315,
        "name": "Helsinki",
        "countryId": 59
      },
      {
        "id": 316,
        "name": "Espoo",
        "countryId": 59
      },
      {
        "id": 317,
        "name": "Tampere",
        "countryId": 59
      },
      {
        "id": 318,
        "name": "Turku",
        "countryId": 59
      },
      {
        "id": 319,
        "name": "Oulu",
        "countryId": 59
      },
      {
        "id": 320,
        "name": "Lahti",
        "countryId": 59
      }
    ]
  },
  {
    "id": 60,
    "isoCode2": "FR",
    "name": "France",
    "phoneCode": "+33",
    "cities": [
      {
        "id": 321,
        "name": "Paris",
        "countryId": 60
      },
      {
        "id": 322,
        "name": "Marseille",
        "countryId": 60
      },
      {
        "id": 323,
        "name": "Lyon",
        "countryId": 60
      },
      {
        "id": 324,
        "name": "Toulouse",
        "countryId": 60
      },
      {
        "id": 325,
        "name": "Nice",
        "countryId": 60
      },
      {
        "id": 326,
        "name": "Nantes",
        "countryId": 60
      },
      {
        "id": 327,
        "name": "Strasbourg",
        "countryId": 60
      },
      {
        "id": 328,
        "name": "Montpellier",
        "countryId": 60
      },
      {
        "id": 329,
        "name": "Bordeaux",
        "countryId": 60
      },
      {
        "id": 330,
        "name": "Lille",
        "countryId": 60
      },
      {
        "id": 331,
        "name": "Rennes",
        "countryId": 60
      },
      {
        "id": 332,
        "name": "Saint-Etienne",
        "countryId": 60
      }
    ]
  },
  {
    "id": 61,
    "isoCode2": "GA",
    "name": "Gabon",
    "phoneCode": "+241",
    "cities": [
      {
        "id": 333,
        "name": "Libreville",
        "countryId": 61
      },
      {
        "id": 334,
        "name": "Port-Gentil",
        "countryId": 61
      },
      {
        "id": 335,
        "name": "Franceville",
        "countryId": 61
      }
    ]
  },
  {
    "id": 62,
    "isoCode2": "GB",
    "name": "United Kingdom",
    "phoneCode": "+44",
    "cities": [
      {
        "id": 336,
        "name": "London",
        "countryId": 62
      },
      {
        "id": 337,
        "name": "Manchester",
        "countryId": 62
      },
      {
        "id": 338,
        "name": "Birmingham",
        "countryId": 62
      },
      {
        "id": 339,
        "name": "Glasgow",
        "countryId": 62
      },
      {
        "id": 340,
        "name": "Liverpool",
        "countryId": 62
      },
      {
        "id": 341,
        "name": "Leeds",
        "countryId": 62
      },
      {
        "id": 342,
        "name": "Bristol",
        "countryId": 62
      },
      {
        "id": 343,
        "name": "Sheffield",
        "countryId": 62
      },
      {
        "id": 344,
        "name": "Edinburgh",
        "countryId": 62
      },
      {
        "id": 345,
        "name": "Newcastle upon Tyne",
        "countryId": 62
      },
      {
        "id": 346,
        "name": "Nottingham",
        "countryId": 62
      },
      {
        "id": 347,
        "name": "Leicester",
        "countryId": 62
      },
      {
        "id": 348,
        "name": "Cardiff",
        "countryId": 62
      },
      {
        "id": 349,
        "name": "Belfast",
        "countryId": 62
      },
      {
        "id": 350,
        "name": "Brighton",
        "countryId": 62
      },
      {
        "id": 351,
        "name": "Aberdeen",
        "countryId": 62
      },
      {
        "id": 352,
        "name": "Southampton",
        "countryId": 62
      },
      {
        "id": 353,
        "name": "Derby",
        "countryId": 62
      },
      {
        "id": 354,
        "name": "Coventry",
        "countryId": 62
      },
      {
        "id": 355,
        "name": "Wolverhampton",
        "countryId": 62
      },
      {
        "id": 356,
        "name": "Norwich",
        "countryId": 62
      },
      {
        "id": 357,
        "name": "Exeter",
        "countryId": 62
      },
      {
        "id": 358,
        "name": "Reading",
        "countryId": 62
      },
      {
        "id": 359,
        "name": "Swansea",
        "countryId": 62
      }
    ]
  },
  {
    "id": 63,
    "isoCode2": "GE",
    "name": "Georgia",
    "phoneCode": "+995",
    "cities": [
      {
        "id": 360,
        "name": "Tbilisi",
        "countryId": 63
      },
      {
        "id": 361,
        "name": "Batumi",
        "countryId": 63
      },
      {
        "id": 362,
        "name": "Kutaisi",
        "countryId": 63
      },
      {
        "id": 363,
        "name": "Rustavi",
        "countryId": 63
      }
    ]
  },
  {
    "id": 64,
    "isoCode2": "GH",
    "name": "Ghana",
    "phoneCode": "+233",
    "cities": [
      {
        "id": 364,
        "name": "Accra",
        "countryId": 64
      },
      {
        "id": 365,
        "name": "Kumasi",
        "countryId": 64
      },
      {
        "id": 366,
        "name": "Takoradi",
        "countryId": 64
      },
      {
        "id": 367,
        "name": "Tamale",
        "countryId": 64
      },
      {
        "id": 368,
        "name": "Cape Coast",
        "countryId": 64
      },
      {
        "id": 369,
        "name": "Koforidua",
        "countryId": 64
      }
    ]
  },
  {
    "id": 65,
    "isoCode2": "GD",
    "name": "Grenada",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 370,
        "name": "St. George's",
        "countryId": 65
      },
      {
        "id": 371,
        "name": "Gouyave",
        "countryId": 65
      }
    ]
  },
  {
    "id": 66,
    "isoCode2": "GN",
    "name": "Guinea",
    "phoneCode": "+224",
    "cities": [
      {
        "id": 372,
        "name": "Conakry",
        "countryId": 66
      },
      {
        "id": 373,
        "name": "Kankan",
        "countryId": 66
      },
      {
        "id": 374,
        "name": "Labe",
        "countryId": 66
      }
    ]
  },
  {
    "id": 67,
    "isoCode2": "GQ",
    "name": "Equatorial Guinea",
    "phoneCode": "+240",
    "cities": [
      {
        "id": 375,
        "name": "Malabo",
        "countryId": 67
      },
      {
        "id": 376,
        "name": "Bata",
        "countryId": 67
      }
    ]
  },
  {
    "id": 68,
    "isoCode2": "GR",
    "name": "Greece",
    "phoneCode": "+30",
    "cities": [
      {
        "id": 377,
        "name": "Athens",
        "countryId": 68
      },
      {
        "id": 378,
        "name": "Thessaloniki",
        "countryId": 68
      },
      {
        "id": 379,
        "name": "Patras",
        "countryId": 68
      },
      {
        "id": 380,
        "name": "Heraklion",
        "countryId": 68
      },
      {
        "id": 381,
        "name": "Larissa",
        "countryId": 68
      },
      {
        "id": 382,
        "name": "Volos",
        "countryId": 68
      }
    ]
  },
  {
    "id": 69,
    "isoCode2": "GT",
    "name": "Guatemala",
    "phoneCode": "+502",
    "cities": [
      {
        "id": 383,
        "name": "Guatemala City",
        "countryId": 69
      },
      {
        "id": 384,
        "name": "Quetzaltenango",
        "countryId": 69
      },
      {
        "id": 385,
        "name": "Antigua",
        "countryId": 69
      },
      {
        "id": 386,
        "name": "Escuintla",
        "countryId": 69
      }
    ]
  },
  {
    "id": 70,
    "isoCode2": "GM",
    "name": "Gambia",
    "phoneCode": "+220",
    "cities": [
      {
        "id": 387,
        "name": "Banjul",
        "countryId": 70
      },
      {
        "id": 388,
        "name": "Serekunda",
        "countryId": 70
      },
      {
        "id": 389,
        "name": "Brikama",
        "countryId": 70
      }
    ]
  },
  {
    "id": 71,
    "isoCode2": "GW",
    "name": "Guinea-Bissau",
    "phoneCode": "+245",
    "cities": [
      {
        "id": 390,
        "name": "Bissau",
        "countryId": 71
      },
      {
        "id": 391,
        "name": "Bafata",
        "countryId": 71
      }
    ]
  },
  {
    "id": 72,
    "isoCode2": "GY",
    "name": "Guyana",
    "phoneCode": "+592",
    "cities": [
      {
        "id": 392,
        "name": "Georgetown",
        "countryId": 72
      },
      {
        "id": 393,
        "name": "Linden",
        "countryId": 72
      },
      {
        "id": 394,
        "name": "Corriverton",
        "countryId": 72
      }
    ]
  },
  {
    "id": 73,
    "isoCode2": "HK",
    "name": "Hong Kong",
    "phoneCode": "+852",
    "cities": [
      {
        "id": 395,
        "name": "Hong Kong Island",
        "countryId": 73
      },
      {
        "id": 396,
        "name": "Kowloon",
        "countryId": 73
      },
      {
        "id": 397,
        "name": "New Territories",
        "countryId": 73
      }
    ]
  },
  {
    "id": 74,
    "isoCode2": "HN",
    "name": "Honduras",
    "phoneCode": "+504",
    "cities": [
      {
        "id": 398,
        "name": "Tegucigalpa",
        "countryId": 74
      },
      {
        "id": 399,
        "name": "San Pedro Sula",
        "countryId": 74
      },
      {
        "id": 400,
        "name": "La Ceiba",
        "countryId": 74
      },
      {
        "id": 401,
        "name": "Choluteca",
        "countryId": 74
      }
    ]
  },
  {
    "id": 75,
    "isoCode2": "HR",
    "name": "Croatia",
    "phoneCode": "+385",
    "cities": [
      {
        "id": 402,
        "name": "Zagreb",
        "countryId": 75
      },
      {
        "id": 403,
        "name": "Split",
        "countryId": 75
      },
      {
        "id": 404,
        "name": "Dubrovnik",
        "countryId": 75
      },
      {
        "id": 405,
        "name": "Rijeka",
        "countryId": 75
      },
      {
        "id": 406,
        "name": "Osijek",
        "countryId": 75
      },
      {
        "id": 407,
        "name": "Zadar",
        "countryId": 75
      }
    ]
  },
  {
    "id": 76,
    "isoCode2": "HT",
    "name": "Haiti",
    "phoneCode": "+509",
    "cities": [
      {
        "id": 408,
        "name": "Port-au-Prince",
        "countryId": 76
      },
      {
        "id": 409,
        "name": "Cap-Haitien",
        "countryId": 76
      },
      {
        "id": 410,
        "name": "Gonaives",
        "countryId": 76
      }
    ]
  },
  {
    "id": 77,
    "isoCode2": "HU",
    "name": "Hungary",
    "phoneCode": "+36",
    "cities": [
      {
        "id": 411,
        "name": "Budapest",
        "countryId": 77
      },
      {
        "id": 412,
        "name": "Debrecen",
        "countryId": 77
      },
      {
        "id": 413,
        "name": "Szeged",
        "countryId": 77
      },
      {
        "id": 414,
        "name": "Miskolc",
        "countryId": 77
      },
      {
        "id": 415,
        "name": "Pecs",
        "countryId": 77
      },
      {
        "id": 416,
        "name": "Gyor",
        "countryId": 77
      }
    ]
  },
  {
    "id": 78,
    "isoCode2": "ID",
    "name": "Indonesia",
    "phoneCode": "+62",
    "cities": [
      {
        "id": 417,
        "name": "Jakarta",
        "countryId": 78
      },
      {
        "id": 418,
        "name": "Surabaya",
        "countryId": 78
      },
      {
        "id": 419,
        "name": "Bandung",
        "countryId": 78
      },
      {
        "id": 420,
        "name": "Medan",
        "countryId": 78
      },
      {
        "id": 421,
        "name": "Semarang",
        "countryId": 78
      },
      {
        "id": 422,
        "name": "Makassar",
        "countryId": 78
      },
      {
        "id": 423,
        "name": "Denpasar",
        "countryId": 78
      },
      {
        "id": 424,
        "name": "Yogyakarta",
        "countryId": 78
      },
      {
        "id": 425,
        "name": "Palembang",
        "countryId": 78
      },
      {
        "id": 426,
        "name": "Bekasi",
        "countryId": 78
      }
    ]
  },
  {
    "id": 79,
    "isoCode2": "IE",
    "name": "Ireland",
    "phoneCode": "+353",
    "cities": [
      {
        "id": 427,
        "name": "Dublin",
        "countryId": 79
      },
      {
        "id": 428,
        "name": "Cork",
        "countryId": 79
      },
      {
        "id": 429,
        "name": "Galway",
        "countryId": 79
      },
      {
        "id": 430,
        "name": "Limerick",
        "countryId": 79
      },
      {
        "id": 431,
        "name": "Waterford",
        "countryId": 79
      },
      {
        "id": 432,
        "name": "Kilkenny",
        "countryId": 79
      }
    ]
  },
  {
    "id": 80,
    "isoCode2": "IL",
    "name": "Israel",
    "phoneCode": "+972",
    "cities": [
      {
        "id": 433,
        "name": "Jerusalem",
        "countryId": 80
      },
      {
        "id": 434,
        "name": "Tel Aviv",
        "countryId": 80
      },
      {
        "id": 435,
        "name": "Haifa",
        "countryId": 80
      },
      {
        "id": 436,
        "name": "Beersheba",
        "countryId": 80
      },
      {
        "id": 437,
        "name": "Rishon LeZion",
        "countryId": 80
      }
    ]
  },
  {
    "id": 81,
    "isoCode2": "IN",
    "name": "India",
    "phoneCode": "+91",
    "cities": [
      {
        "id": 438,
        "name": "Mumbai",
        "countryId": 81
      },
      {
        "id": 439,
        "name": "Delhi",
        "countryId": 81
      },
      {
        "id": 440,
        "name": "Bengaluru",
        "countryId": 81
      },
      {
        "id": 441,
        "name": "Hyderabad",
        "countryId": 81
      },
      {
        "id": 442,
        "name": "Chennai",
        "countryId": 81
      },
      {
        "id": 443,
        "name": "Kolkata",
        "countryId": 81
      },
      {
        "id": 444,
        "name": "Ahmedabad",
        "countryId": 81
      },
      {
        "id": 445,
        "name": "Pune",
        "countryId": 81
      },
      {
        "id": 446,
        "name": "Jaipur",
        "countryId": 81
      },
      {
        "id": 447,
        "name": "Surat",
        "countryId": 81
      },
      {
        "id": 448,
        "name": "Lucknow",
        "countryId": 81
      },
      {
        "id": 449,
        "name": "Kanpur",
        "countryId": 81
      },
      {
        "id": 450,
        "name": "Nagpur",
        "countryId": 81
      },
      {
        "id": 451,
        "name": "Indore",
        "countryId": 81
      },
      {
        "id": 452,
        "name": "Bhopal",
        "countryId": 81
      },
      {
        "id": 453,
        "name": "Ludhiana",
        "countryId": 81
      },
      {
        "id": 454,
        "name": "Vadodara",
        "countryId": 81
      },
      {
        "id": 455,
        "name": "Nashik",
        "countryId": 81
      },
      {
        "id": 456,
        "name": "Agra",
        "countryId": 81
      },
      {
        "id": 457,
        "name": "Navi Mumbai",
        "countryId": 81
      },
      {
        "id": 458,
        "name": "Patna",
        "countryId": 81
      },
      {
        "id": 459,
        "name": "Faridabad",
        "countryId": 81
      },
      {
        "id": 460,
        "name": "Meerut",
        "countryId": 81
      },
      {
        "id": 461,
        "name": "Kochi",
        "countryId": 81
      },
      {
        "id": 462,
        "name": "Thiruvananthapuram",
        "countryId": 81
      },
      {
        "id": 463,
        "name": "Guwahati",
        "countryId": 81
      },
      {
        "id": 464,
        "name": "Chandigarh",
        "countryId": 81
      },
      {
        "id": 465,
        "name": "Dehradun",
        "countryId": 81
      },
      {
        "id": 466,
        "name": "Coimbatore",
        "countryId": 81
      },
      {
        "id": 467,
        "name": "Madurai",
        "countryId": 81
      },
      {
        "id": 468,
        "name": "Visakhapatnam",
        "countryId": 81
      },
      {
        "id": 469,
        "name": "Rajkot",
        "countryId": 81
      },
      {
        "id": 470,
        "name": "Amritsar",
        "countryId": 81
      },
      {
        "id": 471,
        "name": "Varanasi",
        "countryId": 81
      },
      {
        "id": 472,
        "name": "Prayagraj",
        "countryId": 81
      },
      {
        "id": 473,
        "name": "Raipur",
        "countryId": 81
      },
      {
        "id": 474,
        "name": "Jodhpur",
        "countryId": 81
      },
      {
        "id": 475,
        "name": "Udaipur",
        "countryId": 81
      },
      {
        "id": 476,
        "name": "Mysuru",
        "countryId": 81
      },
      {
        "id": 477,
        "name": "Mangaluru",
        "countryId": 81
      }
    ]
  },
  {
    "id": 82,
    "isoCode2": "IQ",
    "name": "Iraq",
    "phoneCode": "+964",
    "cities": [
      {
        "id": 478,
        "name": "Baghdad",
        "countryId": 82
      },
      {
        "id": 479,
        "name": "Basra",
        "countryId": 82
      },
      {
        "id": 480,
        "name": "Erbil",
        "countryId": 82
      },
      {
        "id": 481,
        "name": "Mosul",
        "countryId": 82
      },
      {
        "id": 482,
        "name": "Najaf",
        "countryId": 82
      },
      {
        "id": 483,
        "name": "Kirkuk",
        "countryId": 82
      }
    ]
  },
  {
    "id": 83,
    "isoCode2": "IR",
    "name": "Iran",
    "phoneCode": "+98",
    "cities": [
      {
        "id": 484,
        "name": "Tehran",
        "countryId": 83
      },
      {
        "id": 485,
        "name": "Mashhad",
        "countryId": 83
      },
      {
        "id": 486,
        "name": "Isfahan",
        "countryId": 83
      },
      {
        "id": 487,
        "name": "Shiraz",
        "countryId": 83
      },
      {
        "id": 488,
        "name": "Tabriz",
        "countryId": 83
      },
      {
        "id": 489,
        "name": "Karaj",
        "countryId": 83
      },
      {
        "id": 490,
        "name": "Qom",
        "countryId": 83
      }
    ]
  },
  {
    "id": 84,
    "isoCode2": "IS",
    "name": "Iceland",
    "phoneCode": "+354",
    "cities": [
      {
        "id": 491,
        "name": "Reykjavik",
        "countryId": 84
      },
      {
        "id": 492,
        "name": "Keflavik",
        "countryId": 84
      },
      {
        "id": 493,
        "name": "Akureyri",
        "countryId": 84
      }
    ]
  },
  {
    "id": 85,
    "isoCode2": "IT",
    "name": "Italy",
    "phoneCode": "+39",
    "cities": [
      {
        "id": 494,
        "name": "Rome",
        "countryId": 85
      },
      {
        "id": 495,
        "name": "Milan",
        "countryId": 85
      },
      {
        "id": 496,
        "name": "Naples",
        "countryId": 85
      },
      {
        "id": 497,
        "name": "Turin",
        "countryId": 85
      },
      {
        "id": 498,
        "name": "Florence",
        "countryId": 85
      },
      {
        "id": 499,
        "name": "Bologna",
        "countryId": 85
      },
      {
        "id": 500,
        "name": "Venice",
        "countryId": 85
      },
      {
        "id": 501,
        "name": "Genoa",
        "countryId": 85
      },
      {
        "id": 502,
        "name": "Palermo",
        "countryId": 85
      },
      {
        "id": 503,
        "name": "Verona",
        "countryId": 85
      },
      {
        "id": 504,
        "name": "Bari",
        "countryId": 85
      },
      {
        "id": 505,
        "name": "Catania",
        "countryId": 85
      }
    ]
  },
  {
    "id": 86,
    "isoCode2": "JM",
    "name": "Jamaica",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 506,
        "name": "Kingston",
        "countryId": 86
      },
      {
        "id": 507,
        "name": "Montego Bay",
        "countryId": 86
      },
      {
        "id": 508,
        "name": "Port Antonio",
        "countryId": 86
      },
      {
        "id": 509,
        "name": "Ocho Rios",
        "countryId": 86
      }
    ]
  },
  {
    "id": 87,
    "isoCode2": "JO",
    "name": "Jordan",
    "phoneCode": "+962",
    "cities": [
      {
        "id": 510,
        "name": "Amman",
        "countryId": 87
      },
      {
        "id": 511,
        "name": "Zarqa",
        "countryId": 87
      },
      {
        "id": 512,
        "name": "Irbid",
        "countryId": 87
      },
      {
        "id": 513,
        "name": "Aqaba",
        "countryId": 87
      },
      {
        "id": 514,
        "name": "Salt",
        "countryId": 87
      }
    ]
  },
  {
    "id": 88,
    "isoCode2": "JP",
    "name": "Japan",
    "phoneCode": "+81",
    "cities": [
      {
        "id": 515,
        "name": "Tokyo",
        "countryId": 88
      },
      {
        "id": 516,
        "name": "Osaka",
        "countryId": 88
      },
      {
        "id": 517,
        "name": "Yokohama",
        "countryId": 88
      },
      {
        "id": 518,
        "name": "Nagoya",
        "countryId": 88
      },
      {
        "id": 519,
        "name": "Sapporo",
        "countryId": 88
      },
      {
        "id": 520,
        "name": "Kobe",
        "countryId": 88
      },
      {
        "id": 521,
        "name": "Kyoto",
        "countryId": 88
      },
      {
        "id": 522,
        "name": "Fukuoka",
        "countryId": 88
      },
      {
        "id": 523,
        "name": "Sendai",
        "countryId": 88
      },
      {
        "id": 524,
        "name": "Hiroshima",
        "countryId": 88
      }
    ]
  },
  {
    "id": 89,
    "isoCode2": "KE",
    "name": "Kenya",
    "phoneCode": "+254",
    "cities": [
      {
        "id": 525,
        "name": "Nairobi",
        "countryId": 89
      },
      {
        "id": 526,
        "name": "Mombasa",
        "countryId": 89
      },
      {
        "id": 527,
        "name": "Kisumu",
        "countryId": 89
      },
      {
        "id": 528,
        "name": "Nakuru",
        "countryId": 89
      },
      {
        "id": 529,
        "name": "Eldoret",
        "countryId": 89
      },
      {
        "id": 530,
        "name": "Garissa",
        "countryId": 89
      }
    ]
  },
  {
    "id": 90,
    "isoCode2": "KG",
    "name": "Kyrgyzstan",
    "phoneCode": "+996",
    "cities": [
      {
        "id": 531,
        "name": "Bishkek",
        "countryId": 90
      },
      {
        "id": 532,
        "name": "Osh",
        "countryId": 90
      },
      {
        "id": 533,
        "name": "Naryn",
        "countryId": 90
      }
    ]
  },
  {
    "id": 91,
    "isoCode2": "KH",
    "name": "Cambodia",
    "phoneCode": "+855",
    "cities": [
      {
        "id": 534,
        "name": "Phnom Penh",
        "countryId": 91
      },
      {
        "id": 535,
        "name": "Siem Reap",
        "countryId": 91
      },
      {
        "id": 536,
        "name": "Sihanoukville",
        "countryId": 91
      },
      {
        "id": 537,
        "name": "Battambang",
        "countryId": 91
      }
    ]
  },
  {
    "id": 92,
    "isoCode2": "KM",
    "name": "Comoros",
    "phoneCode": "+269",
    "cities": [
      {
        "id": 538,
        "name": "Moroni",
        "countryId": 92
      },
      {
        "id": 539,
        "name": "Mutsamudu",
        "countryId": 92
      },
      {
        "id": 540,
        "name": "Fomboni",
        "countryId": 92
      }
    ]
  },
  {
    "id": 93,
    "isoCode2": "KP",
    "name": "North Korea",
    "phoneCode": "+850",
    "cities": [
      {
        "id": 541,
        "name": "Pyongyang",
        "countryId": 93
      },
      {
        "id": 542,
        "name": "Hamhung",
        "countryId": 93
      },
      {
        "id": 543,
        "name": "Chongjin",
        "countryId": 93
      },
      {
        "id": 544,
        "name": "Wonsan",
        "countryId": 93
      }
    ]
  },
  {
    "id": 94,
    "isoCode2": "KR",
    "name": "South Korea",
    "phoneCode": "+82",
    "cities": [
      {
        "id": 545,
        "name": "Seoul",
        "countryId": 94
      },
      {
        "id": 546,
        "name": "Busan",
        "countryId": 94
      },
      {
        "id": 547,
        "name": "Incheon",
        "countryId": 94
      },
      {
        "id": 548,
        "name": "Daegu",
        "countryId": 94
      },
      {
        "id": 549,
        "name": "Daejeon",
        "countryId": 94
      },
      {
        "id": 550,
        "name": "Gwangju",
        "countryId": 94
      },
      {
        "id": 551,
        "name": "Ulsan",
        "countryId": 94
      }
    ]
  },
  {
    "id": 95,
    "isoCode2": "KW",
    "name": "Kuwait",
    "phoneCode": "+965",
    "cities": [
      {
        "id": 552,
        "name": "Kuwait City",
        "countryId": 95
      },
      {
        "id": 553,
        "name": "Hawalli",
        "countryId": 95
      },
      {
        "id": 554,
        "name": "Salmiya",
        "countryId": 95
      }
    ]
  },
  {
    "id": 96,
    "isoCode2": "KZ",
    "name": "Kazakhstan",
    "phoneCode": "+7",
    "cities": [
      {
        "id": 555,
        "name": "Astana",
        "countryId": 96
      },
      {
        "id": 556,
        "name": "Almaty",
        "countryId": 96
      },
      {
        "id": 557,
        "name": "Shymkent",
        "countryId": 96
      },
      {
        "id": 558,
        "name": "Karaganda",
        "countryId": 96
      },
      {
        "id": 559,
        "name": "Atyrau",
        "countryId": 96
      }
    ]
  },
  {
    "id": 97,
    "isoCode2": "LA",
    "name": "Laos",
    "phoneCode": "+856",
    "cities": [
      {
        "id": 560,
        "name": "Vientiane",
        "countryId": 97
      },
      {
        "id": 561,
        "name": "Luang Prabang",
        "countryId": 97
      },
      {
        "id": 562,
        "name": "Pakse",
        "countryId": 97
      },
      {
        "id": 563,
        "name": "Savannakhet",
        "countryId": 97
      }
    ]
  },
  {
    "id": 98,
    "isoCode2": "LB",
    "name": "Lebanon",
    "phoneCode": "+961",
    "cities": [
      {
        "id": 564,
        "name": "Beirut",
        "countryId": 98
      },
      {
        "id": 565,
        "name": "Tripoli",
        "countryId": 98
      },
      {
        "id": 566,
        "name": "Sidon",
        "countryId": 98
      },
      {
        "id": 567,
        "name": "Tyre",
        "countryId": 98
      },
      {
        "id": 568,
        "name": "Zahle",
        "countryId": 98
      }
    ]
  },
  {
    "id": 99,
    "isoCode2": "LI",
    "name": "Liechtenstein",
    "phoneCode": "+423",
    "cities": [
      {
        "id": 569,
        "name": "Vaduz",
        "countryId": 99
      },
      {
        "id": 570,
        "name": "Schaan",
        "countryId": 99
      },
      {
        "id": 571,
        "name": "Balzers",
        "countryId": 99
      }
    ]
  },
  {
    "id": 100,
    "isoCode2": "LK",
    "name": "Sri Lanka",
    "phoneCode": "+94",
    "cities": [
      {
        "id": 572,
        "name": "Colombo",
        "countryId": 100
      },
      {
        "id": 573,
        "name": "Kandy",
        "countryId": 100
      },
      {
        "id": 574,
        "name": "Galle",
        "countryId": 100
      },
      {
        "id": 575,
        "name": "Negombo",
        "countryId": 100
      },
      {
        "id": 576,
        "name": "Jaffna",
        "countryId": 100
      },
      {
        "id": 577,
        "name": "Gampaha",
        "countryId": 100
      },
      {
        "id": 578,
        "name": "Kurunegala",
        "countryId": 100
      }
    ]
  },
  {
    "id": 101,
    "isoCode2": "LR",
    "name": "Liberia",
    "phoneCode": "+231",
    "cities": [
      {
        "id": 579,
        "name": "Monrovia",
        "countryId": 101
      },
      {
        "id": 580,
        "name": "Gbarnga",
        "countryId": 101
      },
      {
        "id": 581,
        "name": "Buchanan",
        "countryId": 101
      }
    ]
  },
  {
    "id": 102,
    "isoCode2": "LS",
    "name": "Lesotho",
    "phoneCode": "+266",
    "cities": [
      {
        "id": 582,
        "name": "Maseru",
        "countryId": 102
      },
      {
        "id": 583,
        "name": "Hlotse",
        "countryId": 102
      },
      {
        "id": 584,
        "name": "Teyateyaneng",
        "countryId": 102
      }
    ]
  },
  {
    "id": 103,
    "isoCode2": "LT",
    "name": "Lithuania",
    "phoneCode": "+370",
    "cities": [
      {
        "id": 585,
        "name": "Vilnius",
        "countryId": 103
      },
      {
        "id": 586,
        "name": "Kaunas",
        "countryId": 103
      },
      {
        "id": 587,
        "name": "Klaipeda",
        "countryId": 103
      },
      {
        "id": 588,
        "name": "Panevezys",
        "countryId": 103
      }
    ]
  },
  {
    "id": 104,
    "isoCode2": "LU",
    "name": "Luxembourg",
    "phoneCode": "+352",
    "cities": [
      {
        "id": 589,
        "name": "Luxembourg City",
        "countryId": 104
      },
      {
        "id": 590,
        "name": "Esch-sur-Alzette",
        "countryId": 104
      },
      {
        "id": 591,
        "name": "Differdange",
        "countryId": 104
      }
    ]
  },
  {
    "id": 105,
    "isoCode2": "LV",
    "name": "Latvia",
    "phoneCode": "+371",
    "cities": [
      {
        "id": 592,
        "name": "Riga",
        "countryId": 105
      },
      {
        "id": 593,
        "name": "Daugavpils",
        "countryId": 105
      },
      {
        "id": 594,
        "name": "Liepaja",
        "countryId": 105
      },
      {
        "id": 595,
        "name": "Jelgava",
        "countryId": 105
      }
    ]
  },
  {
    "id": 106,
    "isoCode2": "LY",
    "name": "Libya",
    "phoneCode": "+218",
    "cities": [
      {
        "id": 596,
        "name": "Tripoli",
        "countryId": 106
      },
      {
        "id": 597,
        "name": "Benghazi",
        "countryId": 106
      },
      {
        "id": 598,
        "name": "Misrata",
        "countryId": 106
      },
      {
        "id": 599,
        "name": "Zawiya",
        "countryId": 106
      }
    ]
  },
  {
    "id": 107,
    "isoCode2": "MA",
    "name": "Morocco",
    "phoneCode": "+212",
    "cities": [
      {
        "id": 600,
        "name": "Casablanca",
        "countryId": 107
      },
      {
        "id": 601,
        "name": "Rabat",
        "countryId": 107
      },
      {
        "id": 602,
        "name": "Marrakesh",
        "countryId": 107
      },
      {
        "id": 603,
        "name": "Fez",
        "countryId": 107
      },
      {
        "id": 604,
        "name": "Tangier",
        "countryId": 107
      },
      {
        "id": 605,
        "name": "Agadir",
        "countryId": 107
      },
      {
        "id": 606,
        "name": "Meknes",
        "countryId": 107
      }
    ]
  },
  {
    "id": 108,
    "isoCode2": "MC",
    "name": "Monaco",
    "phoneCode": "+377",
    "cities": [
      {
        "id": 607,
        "name": "Monaco",
        "countryId": 108
      },
      {
        "id": 608,
        "name": "Monte-Carlo",
        "countryId": 108
      },
      {
        "id": 609,
        "name": "La Condamine",
        "countryId": 108
      }
    ]
  },
  {
    "id": 109,
    "isoCode2": "MD",
    "name": "Moldova",
    "phoneCode": "+373",
    "cities": [
      {
        "id": 610,
        "name": "Chisinau",
        "countryId": 109
      },
      {
        "id": 611,
        "name": "Balti",
        "countryId": 109
      },
      {
        "id": 612,
        "name": "Benders",
        "countryId": 109
      },
      {
        "id": 613,
        "name": "Tiraspol",
        "countryId": 109
      }
    ]
  },
  {
    "id": 110,
    "isoCode2": "ME",
    "name": "Montenegro",
    "phoneCode": "+382",
    "cities": [
      {
        "id": 614,
        "name": "Podgorica",
        "countryId": 110
      },
      {
        "id": 615,
        "name": "Niksic",
        "countryId": 110
      },
      {
        "id": 616,
        "name": "Bar",
        "countryId": 110
      },
      {
        "id": 617,
        "name": "Herceg Novi",
        "countryId": 110
      }
    ]
  },
  {
    "id": 111,
    "isoCode2": "MG",
    "name": "Madagascar",
    "phoneCode": "+261",
    "cities": [
      {
        "id": 618,
        "name": "Antananarivo",
        "countryId": 111
      },
      {
        "id": 619,
        "name": "Toamasina",
        "countryId": 111
      },
      {
        "id": 620,
        "name": "Mahajanga",
        "countryId": 111
      },
      {
        "id": 621,
        "name": "Toliara",
        "countryId": 111
      }
    ]
  },
  {
    "id": 112,
    "isoCode2": "MK",
    "name": "North Macedonia",
    "phoneCode": "+389",
    "cities": [
      {
        "id": 622,
        "name": "Skopje",
        "countryId": 112
      },
      {
        "id": 623,
        "name": "Bitola",
        "countryId": 112
      },
      {
        "id": 624,
        "name": "Kumanovo",
        "countryId": 112
      }
    ]
  },
  {
    "id": 113,
    "isoCode2": "ML",
    "name": "Mali",
    "phoneCode": "+223",
    "cities": [
      {
        "id": 625,
        "name": "Bamako",
        "countryId": 113
      },
      {
        "id": 626,
        "name": "Segou",
        "countryId": 113
      },
      {
        "id": 627,
        "name": "Sikasso",
        "countryId": 113
      }
    ]
  },
  {
    "id": 114,
    "isoCode2": "MM",
    "name": "Myanmar",
    "phoneCode": "+95",
    "cities": [
      {
        "id": 628,
        "name": "Yangon",
        "countryId": 114
      },
      {
        "id": 629,
        "name": "Mandalay",
        "countryId": 114
      },
      {
        "id": 630,
        "name": "Naypyitaw",
        "countryId": 114
      },
      {
        "id": 631,
        "name": "Bago",
        "countryId": 114
      },
      {
        "id": 632,
        "name": "Mawlamyine",
        "countryId": 114
      }
    ]
  },
  {
    "id": 115,
    "isoCode2": "MN",
    "name": "Mongolia",
    "phoneCode": "+976",
    "cities": [
      {
        "id": 633,
        "name": "Ulaanbaatar",
        "countryId": 115
      },
      {
        "id": 634,
        "name": "Erdenet",
        "countryId": 115
      },
      {
        "id": 635,
        "name": "Darhan",
        "countryId": 115
      },
      {
        "id": 636,
        "name": "Choibalsan",
        "countryId": 115
      }
    ]
  },
  {
    "id": 116,
    "isoCode2": "MR",
    "name": "Mauritania",
    "phoneCode": "+222",
    "cities": [
      {
        "id": 637,
        "name": "Nouakchott",
        "countryId": 116
      },
      {
        "id": 638,
        "name": "Nouadhibou",
        "countryId": 116
      },
      {
        "id": 639,
        "name": "Rosso",
        "countryId": 116
      }
    ]
  },
  {
    "id": 117,
    "isoCode2": "MT",
    "name": "Malta",
    "phoneCode": "+356",
    "cities": [
      {
        "id": 640,
        "name": "Valletta",
        "countryId": 117
      },
      {
        "id": 641,
        "name": "Sliema",
        "countryId": 117
      },
      {
        "id": 642,
        "name": "Birkirkara",
        "countryId": 117
      },
      {
        "id": 643,
        "name": "Mosta",
        "countryId": 117
      }
    ]
  },
  {
    "id": 118,
    "isoCode2": "MV",
    "name": "Maldives",
    "phoneCode": "+960",
    "cities": [
      {
        "id": 644,
        "name": "Male",
        "countryId": 118
      },
      {
        "id": 645,
        "name": "Addu City",
        "countryId": 118
      }
    ]
  },
  {
    "id": 119,
    "isoCode2": "MW",
    "name": "Malawi",
    "phoneCode": "+265",
    "cities": [
      {
        "id": 646,
        "name": "Lilongwe",
        "countryId": 119
      },
      {
        "id": 647,
        "name": "Blantyre",
        "countryId": 119
      },
      {
        "id": 648,
        "name": "Mzuzu",
        "countryId": 119
      },
      {
        "id": 649,
        "name": "Zomba",
        "countryId": 119
      }
    ]
  },
  {
    "id": 120,
    "isoCode2": "MX",
    "name": "Mexico",
    "phoneCode": "+52",
    "cities": [
      {
        "id": 650,
        "name": "Mexico City",
        "countryId": 120
      },
      {
        "id": 651,
        "name": "Guadalajara",
        "countryId": 120
      },
      {
        "id": 652,
        "name": "Monterrey",
        "countryId": 120
      },
      {
        "id": 653,
        "name": "Puebla",
        "countryId": 120
      },
      {
        "id": 654,
        "name": "Tijuana",
        "countryId": 120
      },
      {
        "id": 655,
        "name": "Cancun",
        "countryId": 120
      },
      {
        "id": 656,
        "name": "Merida",
        "countryId": 120
      },
      {
        "id": 657,
        "name": "Queretaro",
        "countryId": 120
      },
      {
        "id": 658,
        "name": "Toluca",
        "countryId": 120
      },
      {
        "id": 659,
        "name": "Tampico",
        "countryId": 120
      }
    ]
  },
  {
    "id": 121,
    "isoCode2": "MY",
    "name": "Malaysia",
    "phoneCode": "+60",
    "cities": [
      {
        "id": 660,
        "name": "Kuala Lumpur",
        "countryId": 121
      },
      {
        "id": 661,
        "name": "George Town",
        "countryId": 121
      },
      {
        "id": 662,
        "name": "Johor Bahru",
        "countryId": 121
      },
      {
        "id": 663,
        "name": "Ipoh",
        "countryId": 121
      },
      {
        "id": 664,
        "name": "Shah Alam",
        "countryId": 121
      },
      {
        "id": 665,
        "name": "Kuantan",
        "countryId": 121
      },
      {
        "id": 666,
        "name": "Kota Kinabalu",
        "countryId": 121
      },
      {
        "id": 667,
        "name": "Kuching",
        "countryId": 121
      }
    ]
  },
  {
    "id": 122,
    "isoCode2": "MZ",
    "name": "Mozambique",
    "phoneCode": "+258",
    "cities": [
      {
        "id": 668,
        "name": "Maputo",
        "countryId": 122
      },
      {
        "id": 669,
        "name": "Beira",
        "countryId": 122
      },
      {
        "id": 670,
        "name": "Nampula",
        "countryId": 122
      },
      {
        "id": 671,
        "name": "Matola",
        "countryId": 122
      },
      {
        "id": 672,
        "name": "Chimoio",
        "countryId": 122
      }
    ]
  },
  {
    "id": 123,
    "isoCode2": "NA",
    "name": "Namibia",
    "phoneCode": "+264",
    "cities": [
      {
        "id": 673,
        "name": "Windhoek",
        "countryId": 123
      },
      {
        "id": 674,
        "name": "Walvis Bay",
        "countryId": 123
      },
      {
        "id": 675,
        "name": "Swakopmund",
        "countryId": 123
      },
      {
        "id": 676,
        "name": "Oshakati",
        "countryId": 123
      }
    ]
  },
  {
    "id": 124,
    "isoCode2": "NE",
    "name": "Niger",
    "phoneCode": "+227",
    "cities": [
      {
        "id": 677,
        "name": "Niamey",
        "countryId": 124
      },
      {
        "id": 678,
        "name": "Zinder",
        "countryId": 124
      },
      {
        "id": 679,
        "name": "Maradi",
        "countryId": 124
      },
      {
        "id": 680,
        "name": "Dosso",
        "countryId": 124
      }
    ]
  },
  {
    "id": 125,
    "isoCode2": "NG",
    "name": "Nigeria",
    "phoneCode": "+234",
    "cities": [
      {
        "id": 681,
        "name": "Lagos",
        "countryId": 125
      },
      {
        "id": 682,
        "name": "Abuja",
        "countryId": 125
      },
      {
        "id": 683,
        "name": "Kano",
        "countryId": 125
      },
      {
        "id": 684,
        "name": "Ibadan",
        "countryId": 125
      },
      {
        "id": 685,
        "name": "Port Harcourt",
        "countryId": 125
      },
      {
        "id": 686,
        "name": "Benin City",
        "countryId": 125
      },
      {
        "id": 687,
        "name": "Enugu",
        "countryId": 125
      },
      {
        "id": 688,
        "name": "Kaduna",
        "countryId": 125
      }
    ]
  },
  {
    "id": 126,
    "isoCode2": "NI",
    "name": "Nicaragua",
    "phoneCode": "+505",
    "cities": [
      {
        "id": 689,
        "name": "Managua",
        "countryId": 126
      },
      {
        "id": 690,
        "name": "Leon",
        "countryId": 126
      },
      {
        "id": 691,
        "name": "Granada",
        "countryId": 126
      },
      {
        "id": 692,
        "name": "Masaya",
        "countryId": 126
      }
    ]
  },
  {
    "id": 127,
    "isoCode2": "NL",
    "name": "Netherlands",
    "phoneCode": "+31",
    "cities": [
      {
        "id": 693,
        "name": "Amsterdam",
        "countryId": 127
      },
      {
        "id": 694,
        "name": "Rotterdam",
        "countryId": 127
      },
      {
        "id": 695,
        "name": "The Hague",
        "countryId": 127
      },
      {
        "id": 696,
        "name": "Utrecht",
        "countryId": 127
      },
      {
        "id": 697,
        "name": "Eindhoven",
        "countryId": 127
      },
      {
        "id": 698,
        "name": "Groningen",
        "countryId": 127
      },
      {
        "id": 699,
        "name": "Tilburg",
        "countryId": 127
      },
      {
        "id": 700,
        "name": "Almere",
        "countryId": 127
      }
    ]
  },
  {
    "id": 128,
    "isoCode2": "NO",
    "name": "Norway",
    "phoneCode": "+47",
    "cities": [
      {
        "id": 701,
        "name": "Oslo",
        "countryId": 128
      },
      {
        "id": 702,
        "name": "Bergen",
        "countryId": 128
      },
      {
        "id": 703,
        "name": "Trondheim",
        "countryId": 128
      },
      {
        "id": 704,
        "name": "Stavanger",
        "countryId": 128
      },
      {
        "id": 705,
        "name": "Tromso",
        "countryId": 128
      },
      {
        "id": 706,
        "name": "Alesund",
        "countryId": 128
      }
    ]
  },
  {
    "id": 129,
    "isoCode2": "NP",
    "name": "Nepal",
    "phoneCode": "+977",
    "cities": [
      {
        "id": 707,
        "name": "Kathmandu",
        "countryId": 129
      },
      {
        "id": 708,
        "name": "Pokhara",
        "countryId": 129
      },
      {
        "id": 709,
        "name": "Lalitpur",
        "countryId": 129
      },
      {
        "id": 710,
        "name": "Bhaktapur",
        "countryId": 129
      },
      {
        "id": 711,
        "name": "Biratnagar",
        "countryId": 129
      },
      {
        "id": 712,
        "name": "Butwal",
        "countryId": 129
      }
    ]
  },
  {
    "id": 130,
    "isoCode2": "NZ",
    "name": "New Zealand",
    "phoneCode": "+64",
    "cities": [
      {
        "id": 713,
        "name": "Auckland",
        "countryId": 130
      },
      {
        "id": 714,
        "name": "Wellington",
        "countryId": 130
      },
      {
        "id": 715,
        "name": "Christchurch",
        "countryId": 130
      },
      {
        "id": 716,
        "name": "Hamilton",
        "countryId": 130
      },
      {
        "id": 717,
        "name": "Dunedin",
        "countryId": 130
      },
      {
        "id": 718,
        "name": "Napier",
        "countryId": 130
      },
      {
        "id": 719,
        "name": "Tauranga",
        "countryId": 130
      }
    ]
  },
  {
    "id": 131,
    "isoCode2": "OM",
    "name": "Oman",
    "phoneCode": "+968",
    "cities": [
      {
        "id": 720,
        "name": "Muscat",
        "countryId": 131
      },
      {
        "id": 721,
        "name": "Salalah",
        "countryId": 131
      },
      {
        "id": 722,
        "name": "Sohar",
        "countryId": 131
      },
      {
        "id": 723,
        "name": "Nizwa",
        "countryId": 131
      },
      {
        "id": 724,
        "name": "Sur",
        "countryId": 131
      }
    ]
  },
  {
    "id": 132,
    "isoCode2": "PA",
    "name": "Panama",
    "phoneCode": "+507",
    "cities": [
      {
        "id": 725,
        "name": "Panama City",
        "countryId": 132
      },
      {
        "id": 726,
        "name": "David",
        "countryId": 132
      },
      {
        "id": 727,
        "name": "Colon",
        "countryId": 132
      },
      {
        "id": 728,
        "name": "Boquete",
        "countryId": 132
      }
    ]
  },
  {
    "id": 133,
    "isoCode2": "PE",
    "name": "Peru",
    "phoneCode": "+51",
    "cities": [
      {
        "id": 729,
        "name": "Lima",
        "countryId": 133
      },
      {
        "id": 730,
        "name": "Arequipa",
        "countryId": 133
      },
      {
        "id": 731,
        "name": "Cusco",
        "countryId": 133
      },
      {
        "id": 732,
        "name": "Trujillo",
        "countryId": 133
      },
      {
        "id": 733,
        "name": "Chiclayo",
        "countryId": 133
      },
      {
        "id": 734,
        "name": "Piura",
        "countryId": 133
      },
      {
        "id": 735,
        "name": "Iquitos",
        "countryId": 133
      }
    ]
  },
  {
    "id": 134,
    "isoCode2": "PG",
    "name": "Papua New Guinea",
    "phoneCode": "+675",
    "cities": [
      {
        "id": 736,
        "name": "Port Moresby",
        "countryId": 134
      },
      {
        "id": 737,
        "name": "Lae",
        "countryId": 134
      },
      {
        "id": 738,
        "name": "Madang",
        "countryId": 134
      },
      {
        "id": 739,
        "name": "Goroka",
        "countryId": 134
      }
    ]
  },
  {
    "id": 135,
    "isoCode2": "PH",
    "name": "Philippines",
    "phoneCode": "+63",
    "cities": [
      {
        "id": 740,
        "name": "Manila",
        "countryId": 135
      },
      {
        "id": 741,
        "name": "Quezon City",
        "countryId": 135
      },
      {
        "id": 742,
        "name": "Cebu City",
        "countryId": 135
      },
      {
        "id": 743,
        "name": "Davao City",
        "countryId": 135
      },
      {
        "id": 744,
        "name": "Bacoor",
        "countryId": 135
      },
      {
        "id": 745,
        "name": "Muntinlupa",
        "countryId": 135
      },
      {
        "id": 746,
        "name": "Baguio",
        "countryId": 135
      }
    ]
  },
  {
    "id": 136,
    "isoCode2": "PK",
    "name": "Pakistan",
    "phoneCode": "+92",
    "cities": [
      {
        "id": 747,
        "name": "Karachi",
        "countryId": 136
      },
      {
        "id": 748,
        "name": "Lahore",
        "countryId": 136
      },
      {
        "id": 749,
        "name": "Islamabad",
        "countryId": 136
      },
      {
        "id": 750,
        "name": "Rawalpindi",
        "countryId": 136
      },
      {
        "id": 751,
        "name": "Faisalabad",
        "countryId": 136
      },
      {
        "id": 752,
        "name": "Peshawar",
        "countryId": 136
      },
      {
        "id": 753,
        "name": "Multan",
        "countryId": 136
      },
      {
        "id": 754,
        "name": "Quetta",
        "countryId": 136
      },
      {
        "id": 755,
        "name": "Hyderabad",
        "countryId": 136
      },
      {
        "id": 756,
        "name": "Sialkot",
        "countryId": 136
      },
      {
        "id": 757,
        "name": "Gujranwala",
        "countryId": 136
      }
    ]
  },
  {
    "id": 137,
    "isoCode2": "PL",
    "name": "Poland",
    "phoneCode": "+48",
    "cities": [
      {
        "id": 758,
        "name": "Warsaw",
        "countryId": 137
      },
      {
        "id": 759,
        "name": "Krakow",
        "countryId": 137
      },
      {
        "id": 760,
        "name": "Lodz",
        "countryId": 137
      },
      {
        "id": 761,
        "name": "Wroclaw",
        "countryId": 137
      },
      {
        "id": 762,
        "name": "Poznan",
        "countryId": 137
      },
      {
        "id": 763,
        "name": "Gdansk",
        "countryId": 137
      },
      {
        "id": 764,
        "name": "Katowice",
        "countryId": 137
      },
      {
        "id": 765,
        "name": "Szczecin",
        "countryId": 137
      },
      {
        "id": 766,
        "name": "Lublin",
        "countryId": 137
      }
    ]
  },
  {
    "id": 138,
    "isoCode2": "PT",
    "name": "Portugal",
    "phoneCode": "+351",
    "cities": [
      {
        "id": 767,
        "name": "Lisbon",
        "countryId": 138
      },
      {
        "id": 768,
        "name": "Porto",
        "countryId": 138
      },
      {
        "id": 769,
        "name": "Coimbra",
        "countryId": 138
      },
      {
        "id": 770,
        "name": "Braga",
        "countryId": 138
      },
      {
        "id": 771,
        "name": "Faro",
        "countryId": 138
      },
      {
        "id": 772,
        "name": "Setubal",
        "countryId": 138
      }
    ]
  },
  {
    "id": 139,
    "isoCode2": "PY",
    "name": "Paraguay",
    "phoneCode": "+595",
    "cities": [
      {
        "id": 773,
        "name": "Asuncion",
        "countryId": 139
      },
      {
        "id": 774,
        "name": "Ciudad del Este",
        "countryId": 139
      },
      {
        "id": 775,
        "name": "Encarnacion",
        "countryId": 139
      },
      {
        "id": 776,
        "name": "Concepcion",
        "countryId": 139
      }
    ]
  },
  {
    "id": 140,
    "isoCode2": "QA",
    "name": "Qatar",
    "phoneCode": "+974",
    "cities": [
      {
        "id": 777,
        "name": "Doha",
        "countryId": 140
      },
      {
        "id": 778,
        "name": "Al Rayyan",
        "countryId": 140
      },
      {
        "id": 779,
        "name": "Al Wakrah",
        "countryId": 140
      },
      {
        "id": 780,
        "name": "Al Khor",
        "countryId": 140
      }
    ]
  },
  {
    "id": 141,
    "isoCode2": "RO",
    "name": "Romania",
    "phoneCode": "+40",
    "cities": [
      {
        "id": 781,
        "name": "Bucharest",
        "countryId": 141
      },
      {
        "id": 782,
        "name": "Cluj-Napoca",
        "countryId": 141
      },
      {
        "id": 783,
        "name": "Timisoara",
        "countryId": 141
      },
      {
        "id": 784,
        "name": "Iasi",
        "countryId": 141
      },
      {
        "id": 785,
        "name": "Constanta",
        "countryId": 141
      },
      {
        "id": 786,
        "name": "Brasov",
        "countryId": 141
      },
      {
        "id": 787,
        "name": "Craiova",
        "countryId": 141
      }
    ]
  },
  {
    "id": 142,
    "isoCode2": "RS",
    "name": "Serbia",
    "phoneCode": "+381",
    "cities": [
      {
        "id": 788,
        "name": "Belgrade",
        "countryId": 142
      },
      {
        "id": 789,
        "name": "Novi Sad",
        "countryId": 142
      },
      {
        "id": 790,
        "name": "Nis",
        "countryId": 142
      },
      {
        "id": 791,
        "name": "Kragujevac",
        "countryId": 142
      },
      {
        "id": 792,
        "name": "Subotica",
        "countryId": 142
      }
    ]
  },
  {
    "id": 143,
    "isoCode2": "RU",
    "name": "Russia",
    "phoneCode": "+7",
    "cities": [
      {
        "id": 793,
        "name": "Moscow",
        "countryId": 143
      },
      {
        "id": 794,
        "name": "Saint Petersburg",
        "countryId": 143
      },
      {
        "id": 795,
        "name": "Novosibirsk",
        "countryId": 143
      },
      {
        "id": 796,
        "name": "Yekaterinburg",
        "countryId": 143
      },
      {
        "id": 797,
        "name": "Kazan",
        "countryId": 143
      },
      {
        "id": 798,
        "name": "Nizhny Novgorod",
        "countryId": 143
      },
      {
        "id": 799,
        "name": "Samara",
        "countryId": 143
      },
      {
        "id": 800,
        "name": "Rostov-on-Don",
        "countryId": 143
      }
    ]
  },
  {
    "id": 144,
    "isoCode2": "RW",
    "name": "Rwanda",
    "phoneCode": "+256",
    "cities": [
      {
        "id": 801,
        "name": "Kigali",
        "countryId": 144
      },
      {
        "id": 802,
        "name": "Butare",
        "countryId": 144
      },
      {
        "id": 803,
        "name": "Gitarama",
        "countryId": 144
      },
      {
        "id": 804,
        "name": "Rwamagana",
        "countryId": 144
      }
    ]
  },
  {
    "id": 145,
    "isoCode2": "SA",
    "name": "Saudi Arabia",
    "phoneCode": "+966",
    "cities": [
      {
        "id": 805,
        "name": "Riyadh",
        "countryId": 145
      },
      {
        "id": 806,
        "name": "Jeddah",
        "countryId": 145
      },
      {
        "id": 807,
        "name": "Mecca",
        "countryId": 145
      },
      {
        "id": 808,
        "name": "Medina",
        "countryId": 145
      },
      {
        "id": 809,
        "name": "Dammam",
        "countryId": 145
      },
      {
        "id": 810,
        "name": "Khobar",
        "countryId": 145
      },
      {
        "id": 811,
        "name": "Taif",
        "countryId": 145
      }
    ]
  },
  {
    "id": 146,
    "isoCode2": "SC",
    "name": "Seychelles",
    "phoneCode": "+248",
    "cities": [
      {
        "id": 812,
        "name": "Victoria",
        "countryId": 146
      },
      {
        "id": 813,
        "name": "Bel Ombre",
        "countryId": 146
      }
    ]
  },
  {
    "id": 147,
    "isoCode2": "SD",
    "name": "Sudan",
    "phoneCode": "+249",
    "cities": [
      {
        "id": 814,
        "name": "Khartoum",
        "countryId": 147
      },
      {
        "id": 815,
        "name": "Omdurman",
        "countryId": 147
      },
      {
        "id": 816,
        "name": "Port Sudan",
        "countryId": 147
      },
      {
        "id": 817,
        "name": "Kassala",
        "countryId": 147
      }
    ]
  },
  {
    "id": 148,
    "isoCode2": "SE",
    "name": "Sweden",
    "phoneCode": "+46",
    "cities": [
      {
        "id": 818,
        "name": "Stockholm",
        "countryId": 148
      },
      {
        "id": 819,
        "name": "Gothenburg",
        "countryId": 148
      },
      {
        "id": 820,
        "name": "Malmo",
        "countryId": 148
      },
      {
        "id": 821,
        "name": "Uppsala",
        "countryId": 148
      },
      {
        "id": 822,
        "name": "Linkoping",
        "countryId": 148
      },
      {
        "id": 823,
        "name": "Sundsvall",
        "countryId": 148
      }
    ]
  },
  {
    "id": 149,
    "isoCode2": "SG",
    "name": "Singapore",
    "phoneCode": "+65",
    "cities": [
      {
        "id": 824,
        "name": "Singapore",
        "countryId": 149
      }
    ]
  },
  {
    "id": 150,
    "isoCode2": "SI",
    "name": "Slovenia",
    "phoneCode": "+386",
    "cities": [
      {
        "id": 825,
        "name": "Ljubljana",
        "countryId": 150
      },
      {
        "id": 826,
        "name": "Maribor",
        "countryId": 150
      },
      {
        "id": 827,
        "name": "Celje",
        "countryId": 150
      },
      {
        "id": 828,
        "name": "Koper",
        "countryId": 150
      }
    ]
  },
  {
    "id": 151,
    "isoCode2": "SK",
    "name": "Slovakia",
    "phoneCode": "+421",
    "cities": [
      {
        "id": 829,
        "name": "Bratislava",
        "countryId": 151
      },
      {
        "id": 830,
        "name": "Kosice",
        "countryId": 151
      },
      {
        "id": 831,
        "name": "Nitra",
        "countryId": 151
      },
      {
        "id": 832,
        "name": "Zilina",
        "countryId": 151
      },
      {
        "id": 833,
        "name": "Presov",
        "countryId": 151
      }
    ]
  },
  {
    "id": 152,
    "isoCode2": "SL",
    "name": "Sierra Leone",
    "phoneCode": "+232",
    "cities": [
      {
        "id": 834,
        "name": "Freetown",
        "countryId": 152
      },
      {
        "id": 835,
        "name": "Bo",
        "countryId": 152
      },
      {
        "id": 836,
        "name": "Kenema",
        "countryId": 152
      }
    ]
  },
  {
    "id": 153,
    "isoCode2": "SN",
    "name": "Senegal",
    "phoneCode": "+221",
    "cities": [
      {
        "id": 837,
        "name": "Dakar",
        "countryId": 153
      },
      {
        "id": 838,
        "name": "Thies",
        "countryId": 153
      },
      {
        "id": 839,
        "name": "Saint-Louis",
        "countryId": 153
      },
      {
        "id": 840,
        "name": "Ziguinchor",
        "countryId": 153
      }
    ]
  },
  {
    "id": 154,
    "isoCode2": "SO",
    "name": "Somalia",
    "phoneCode": "+252",
    "cities": [
      {
        "id": 841,
        "name": "Mogadishu",
        "countryId": 154
      },
      {
        "id": 842,
        "name": "Hargeisa",
        "countryId": 154
      },
      {
        "id": 843,
        "name": "Kismayo",
        "countryId": 154
      },
      {
        "id": 844,
        "name": "Bosaso",
        "countryId": 154
      }
    ]
  },
  {
    "id": 155,
    "isoCode2": "SR",
    "name": "Suriname",
    "phoneCode": "+597",
    "cities": [
      {
        "id": 845,
        "name": "Paramaribo",
        "countryId": 155
      },
      {
        "id": 846,
        "name": "Nickerie",
        "countryId": 155
      },
      {
        "id": 847,
        "name": "Lelydorp",
        "countryId": 155
      }
    ]
  },
  {
    "id": 156,
    "isoCode2": "SS",
    "name": "South Sudan",
    "phoneCode": "+211",
    "cities": [
      {
        "id": 848,
        "name": "Juba",
        "countryId": 156
      },
      {
        "id": 849,
        "name": "Malakal",
        "countryId": 156
      },
      {
        "id": 850,
        "name": "Wau",
        "countryId": 156
      }
    ]
  },
  {
    "id": 157,
    "isoCode2": "SV",
    "name": "El Salvador",
    "phoneCode": "+503",
    "cities": [
      {
        "id": 851,
        "name": "San Salvador",
        "countryId": 157
      },
      {
        "id": 852,
        "name": "Santa Ana",
        "countryId": 157
      },
      {
        "id": 853,
        "name": "San Miguel",
        "countryId": 157
      },
      {
        "id": 854,
        "name": "Sonsonate",
        "countryId": 157
      }
    ]
  },
  {
    "id": 158,
    "isoCode2": "SZ",
    "name": "Eswatini",
    "phoneCode": "+268",
    "cities": [
      {
        "id": 855,
        "name": "Mbabane",
        "countryId": 158
      },
      {
        "id": 856,
        "name": "Lobamba",
        "countryId": 158
      },
      {
        "id": 857,
        "name": "Manzini",
        "countryId": 158
      }
    ]
  },
  {
    "id": 159,
    "isoCode2": "SY",
    "name": "Syria",
    "phoneCode": "+963",
    "cities": [
      {
        "id": 858,
        "name": "Damascus",
        "countryId": 159
      },
      {
        "id": 859,
        "name": "Aleppo",
        "countryId": 159
      },
      {
        "id": 860,
        "name": "Homs",
        "countryId": 159
      },
      {
        "id": 861,
        "name": "Latakia",
        "countryId": 159
      },
      {
        "id": 862,
        "name": "Hama",
        "countryId": 159
      }
    ]
  },
  {
    "id": 160,
    "isoCode2": "TD",
    "name": "Chad",
    "phoneCode": "+235",
    "cities": [
      {
        "id": 863,
        "name": "N'Djamena",
        "countryId": 160
      },
      {
        "id": 864,
        "name": "Moundou",
        "countryId": 160
      },
      {
        "id": 865,
        "name": "Sarh",
        "countryId": 160
      }
    ]
  },
  {
    "id": 161,
    "isoCode2": "TG",
    "name": "Togo",
    "phoneCode": "+228",
    "cities": [
      {
        "id": 866,
        "name": "Lome",
        "countryId": 161
      },
      {
        "id": 867,
        "name": "Sokode",
        "countryId": 161
      },
      {
        "id": 868,
        "name": "Kpalime",
        "countryId": 161
      }
    ]
  },
  {
    "id": 162,
    "isoCode2": "TH",
    "name": "Thailand",
    "phoneCode": "+66",
    "cities": [
      {
        "id": 869,
        "name": "Bangkok",
        "countryId": 162
      },
      {
        "id": 870,
        "name": "Chiang Mai",
        "countryId": 162
      },
      {
        "id": 871,
        "name": "Phuket",
        "countryId": 162
      },
      {
        "id": 872,
        "name": "Pattaya",
        "countryId": 162
      },
      {
        "id": 873,
        "name": "Songkhla",
        "countryId": 162
      },
      {
        "id": 874,
        "name": "Nakhon Ratchasima",
        "countryId": 162
      },
      {
        "id": 875,
        "name": "Khon Kaen",
        "countryId": 162
      }
    ]
  },
  {
    "id": 163,
    "isoCode2": "TJ",
    "name": "Tajikistan",
    "phoneCode": "+992",
    "cities": [
      {
        "id": 876,
        "name": "Dushanbe",
        "countryId": 163
      },
      {
        "id": 877,
        "name": "Khujand",
        "countryId": 163
      },
      {
        "id": 878,
        "name": "Kulob",
        "countryId": 163
      }
    ]
  },
  {
    "id": 164,
    "isoCode2": "TL",
    "name": "Timor-Leste",
    "phoneCode": "+670",
    "cities": [
      {
        "id": 879,
        "name": "Dili",
        "countryId": 164
      },
      {
        "id": 880,
        "name": "Baucau",
        "countryId": 164
      },
      {
        "id": 881,
        "name": "Suai",
        "countryId": 164
      }
    ]
  },
  {
    "id": 165,
    "isoCode2": "TM",
    "name": "Turkmenistan",
    "phoneCode": "+993",
    "cities": [
      {
        "id": 882,
        "name": "Ashgabat",
        "countryId": 165
      },
      {
        "id": 883,
        "name": "Mary",
        "countryId": 165
      },
      {
        "id": 884,
        "name": "Turkmenabat",
        "countryId": 165
      }
    ]
  },
  {
    "id": 166,
    "isoCode2": "TN",
    "name": "Tunisia",
    "phoneCode": "+216",
    "cities": [
      {
        "id": 885,
        "name": "Tunis",
        "countryId": 166
      },
      {
        "id": 886,
        "name": "Sfax",
        "countryId": 166
      },
      {
        "id": 887,
        "name": "Sousse",
        "countryId": 166
      },
      {
        "id": 888,
        "name": "Bizerte",
        "countryId": 166
      },
      {
        "id": 889,
        "name": "Gabes",
        "countryId": 166
      }
    ]
  },
  {
    "id": 167,
    "isoCode2": "TO",
    "name": "Tonga",
    "phoneCode": "+676",
    "cities": [
      {
        "id": 890,
        "name": "Nuku'alofa",
        "countryId": 167
      },
      {
        "id": 891,
        "name": "Neiafu",
        "countryId": 167
      }
    ]
  },
  {
    "id": 168,
    "isoCode2": "TR",
    "name": "Turkey",
    "phoneCode": "+90",
    "cities": [
      {
        "id": 892,
        "name": "Istanbul",
        "countryId": 168
      },
      {
        "id": 893,
        "name": "Ankara",
        "countryId": 168
      },
      {
        "id": 894,
        "name": "Izmir",
        "countryId": 168
      },
      {
        "id": 895,
        "name": "Bursa",
        "countryId": 168
      },
      {
        "id": 896,
        "name": "Antalya",
        "countryId": 168
      },
      {
        "id": 897,
        "name": "Adana",
        "countryId": 168
      },
      {
        "id": 898,
        "name": "Konya",
        "countryId": 168
      },
      {
        "id": 899,
        "name": "Gaziantep",
        "countryId": 168
      }
    ]
  },
  {
    "id": 169,
    "isoCode2": "TT",
    "name": "Trinidad and Tobago",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 900,
        "name": "Port of Spain",
        "countryId": 169
      },
      {
        "id": 901,
        "name": "Chaguanas",
        "countryId": 169
      },
      {
        "id": 902,
        "name": "Arima",
        "countryId": 169
      }
    ]
  },
  {
    "id": 170,
    "isoCode2": "TW",
    "name": "Taiwan",
    "phoneCode": "+886",
    "cities": [
      {
        "id": 903,
        "name": "Taipei",
        "countryId": 170
      },
      {
        "id": 904,
        "name": "Kaohsiung",
        "countryId": 170
      },
      {
        "id": 905,
        "name": "Taichung",
        "countryId": 170
      },
      {
        "id": 906,
        "name": "New Taipei",
        "countryId": 170
      },
      {
        "id": 907,
        "name": "Taoyuan",
        "countryId": 170
      }
    ]
  },
  {
    "id": 171,
    "isoCode2": "TZ",
    "name": "Tanzania",
    "phoneCode": "+255",
    "cities": [
      {
        "id": 908,
        "name": "Dar es Salaam",
        "countryId": 171
      },
      {
        "id": 909,
        "name": "Arusha",
        "countryId": 171
      },
      {
        "id": 910,
        "name": "Mwanza",
        "countryId": 171
      },
      {
        "id": 911,
        "name": "Dodoma",
        "countryId": 171
      },
      {
        "id": 912,
        "name": "Zanzibar City",
        "countryId": 171
      },
      {
        "id": 913,
        "name": "Morogoro",
        "countryId": 171
      }
    ]
  },
  {
    "id": 172,
    "isoCode2": "UA",
    "name": "Ukraine",
    "phoneCode": "+380",
    "cities": [
      {
        "id": 914,
        "name": "Kyiv",
        "countryId": 172
      },
      {
        "id": 915,
        "name": "Kharkiv",
        "countryId": 172
      },
      {
        "id": 916,
        "name": "Odesa",
        "countryId": 172
      },
      {
        "id": 917,
        "name": "Lviv",
        "countryId": 172
      },
      {
        "id": 918,
        "name": "Dnipro",
        "countryId": 172
      },
      {
        "id": 919,
        "name": "Vinnytsia",
        "countryId": 172
      },
      {
        "id": 920,
        "name": "Poltava",
        "countryId": 172
      }
    ]
  },
  {
    "id": 173,
    "isoCode2": "UG",
    "name": "Uganda",
    "phoneCode": "+256",
    "cities": [
      {
        "id": 921,
        "name": "Kampala",
        "countryId": 173
      },
      {
        "id": 922,
        "name": "Entebbe",
        "countryId": 173
      },
      {
        "id": 923,
        "name": "Jinja",
        "countryId": 173
      },
      {
        "id": 924,
        "name": "Gulu",
        "countryId": 173
      },
      {
        "id": 925,
        "name": "Mbarara",
        "countryId": 173
      }
    ]
  },
  {
    "id": 174,
    "isoCode2": "US",
    "name": "United States",
    "phoneCode": "+1",
    "cities": [
      {
        "id": 926,
        "name": "New York",
        "countryId": 174
      },
      {
        "id": 927,
        "name": "Los Angeles",
        "countryId": 174
      },
      {
        "id": 928,
        "name": "Chicago",
        "countryId": 174
      },
      {
        "id": 929,
        "name": "Houston",
        "countryId": 174
      },
      {
        "id": 930,
        "name": "Phoenix",
        "countryId": 174
      },
      {
        "id": 931,
        "name": "Philadelphia",
        "countryId": 174
      },
      {
        "id": 932,
        "name": "San Antonio",
        "countryId": 174
      },
      {
        "id": 933,
        "name": "San Diego",
        "countryId": 174
      },
      {
        "id": 934,
        "name": "Dallas",
        "countryId": 174
      },
      {
        "id": 935,
        "name": "Austin",
        "countryId": 174
      },
      {
        "id": 936,
        "name": "Jacksonville",
        "countryId": 174
      },
      {
        "id": 937,
        "name": "Fort Worth",
        "countryId": 174
      },
      {
        "id": 938,
        "name": "San Jose",
        "countryId": 174
      },
      {
        "id": 939,
        "name": "Columbus",
        "countryId": 174
      },
      {
        "id": 940,
        "name": "Indianapolis",
        "countryId": 174
      },
      {
        "id": 941,
        "name": "Charlotte",
        "countryId": 174
      },
      {
        "id": 942,
        "name": "San Francisco",
        "countryId": 174
      },
      {
        "id": 943,
        "name": "Seattle",
        "countryId": 174
      },
      {
        "id": 944,
        "name": "Denver",
        "countryId": 174
      },
      {
        "id": 945,
        "name": "Washington",
        "countryId": 174
      },
      {
        "id": 946,
        "name": "Boston",
        "countryId": 174
      },
      {
        "id": 947,
        "name": "Detroit",
        "countryId": 174
      },
      {
        "id": 948,
        "name": "Nashville",
        "countryId": 174
      },
      {
        "id": 949,
        "name": "El Paso",
        "countryId": 174
      },
      {
        "id": 950,
        "name": "Portland",
        "countryId": 174
      },
      {
        "id": 951,
        "name": "Memphis",
        "countryId": 174
      },
      {
        "id": 952,
        "name": "Las Vegas",
        "countryId": 174
      },
      {
        "id": 953,
        "name": "Louisville",
        "countryId": 174
      },
      {
        "id": 954,
        "name": "Baltimore",
        "countryId": 174
      },
      {
        "id": 955,
        "name": "Oklahoma City",
        "countryId": 174
      },
      {
        "id": 956,
        "name": "Miami",
        "countryId": 174
      },
      {
        "id": 957,
        "name": "Atlanta",
        "countryId": 174
      },
      {
        "id": 958,
        "name": "New Orleans",
        "countryId": 174
      },
      {
        "id": 959,
        "name": "Raleigh",
        "countryId": 174
      },
      {
        "id": 960,
        "name": "Tucson",
        "countryId": 174
      }
    ]
  },
  {
    "id": 175,
    "isoCode2": "UY",
    "name": "Uruguay",
    "phoneCode": "+598",
    "cities": [
      {
        "id": 961,
        "name": "Montevideo",
        "countryId": 175
      },
      {
        "id": 962,
        "name": "Salto",
        "countryId": 175
      },
      {
        "id": 963,
        "name": "Paysandu",
        "countryId": 175
      },
      {
        "id": 964,
        "name": "Punta del Este",
        "countryId": 175
      }
    ]
  },
  {
    "id": 176,
    "isoCode2": "UZ",
    "name": "Uzbekistan",
    "phoneCode": "+998",
    "cities": [
      {
        "id": 965,
        "name": "Tashkent",
        "countryId": 176
      },
      {
        "id": 966,
        "name": "Samarkand",
        "countryId": 176
      },
      {
        "id": 967,
        "name": "Bukhara",
        "countryId": 176
      },
      {
        "id": 968,
        "name": "Nukus",
        "countryId": 176
      },
      {
        "id": 969,
        "name": "Fergana",
        "countryId": 176
      }
    ]
  },
  {
    "id": 177,
    "isoCode2": "VE",
    "name": "Venezuela",
    "phoneCode": "+58",
    "cities": [
      {
        "id": 970,
        "name": "Caracas",
        "countryId": 177
      },
      {
        "id": 971,
        "name": "Maracaibo",
        "countryId": 177
      },
      {
        "id": 972,
        "name": "Valencia",
        "countryId": 177
      },
      {
        "id": 973,
        "name": "Barquisimeto",
        "countryId": 177
      },
      {
        "id": 974,
        "name": "Ciudad Guayana",
        "countryId": 177
      }
    ]
  },
  {
    "id": 178,
    "isoCode2": "VN",
    "name": "Vietnam",
    "phoneCode": "+84",
    "cities": [
      {
        "id": 975,
        "name": "Hanoi",
        "countryId": 178
      },
      {
        "id": 976,
        "name": "Ho Chi Minh City",
        "countryId": 178
      },
      {
        "id": 977,
        "name": "Da Nang",
        "countryId": 178
      },
      {
        "id": 978,
        "name": "Hai Phong",
        "countryId": 178
      },
      {
        "id": 979,
        "name": "Can Tho",
        "countryId": 178
      },
      {
        "id": 980,
        "name": "Hue",
        "countryId": 178
      }
    ]
  },
  {
    "id": 179,
    "isoCode2": "VU",
    "name": "Vanuatu",
    "phoneCode": "+678",
    "cities": [
      {
        "id": 981,
        "name": "Port Vila",
        "countryId": 179
      },
      {
        "id": 982,
        "name": "Luganville",
        "countryId": 179
      },
      {
        "id": 983,
        "name": "Tanna",
        "countryId": 179
      }
    ]
  },
  {
    "id": 180,
    "isoCode2": "WS",
    "name": "Samoa",
    "phoneCode": "+685",
    "cities": [
      {
        "id": 984,
        "name": "Apia",
        "countryId": 180
      },
      {
        "id": 985,
        "name": "Vailele",
        "countryId": 180
      },
      {
        "id": 986,
        "name": "Salelologa",
        "countryId": 180
      }
    ]
  },
  {
    "id": 181,
    "isoCode2": "YE",
    "name": "Yemen",
    "phoneCode": "+967",
    "cities": [
      {
        "id": 987,
        "name": "Sanaa",
        "countryId": 181
      },
      {
        "id": 988,
        "name": "Aden",
        "countryId": 181
      },
      {
        "id": 989,
        "name": "Taiz",
        "countryId": 181
      },
      {
        "id": 990,
        "name": "Hodeidah",
        "countryId": 181
      },
      {
        "id": 991,
        "name": "Mukalla",
        "countryId": 181
      }
    ]
  },
  {
    "id": 182,
    "isoCode2": "ZA",
    "name": "South Africa",
    "phoneCode": "+27",
    "cities": [
      {
        "id": 992,
        "name": "Johannesburg",
        "countryId": 182
      },
      {
        "id": 993,
        "name": "Cape Town",
        "countryId": 182
      },
      {
        "id": 994,
        "name": "Durban",
        "countryId": 182
      },
      {
        "id": 995,
        "name": "Pretoria",
        "countryId": 182
      },
      {
        "id": 996,
        "name": "Port Elizabeth",
        "countryId": 182
      },
      {
        "id": 997,
        "name": "Bloemfontein",
        "countryId": 182
      },
      {
        "id": 998,
        "name": "Pietermaritzburg",
        "countryId": 182
      }
    ]
  },
  {
    "id": 183,
    "isoCode2": "ZM",
    "name": "Zambia",
    "phoneCode": "+260",
    "cities": [
      {
        "id": 999,
        "name": "Lusaka",
        "countryId": 183
      },
      {
        "id": 1000,
        "name": "Ndola",
        "countryId": 183
      },
      {
        "id": 1001,
        "name": "Kitwe",
        "countryId": 183
      },
      {
        "id": 1002,
        "name": "Livingstone",
        "countryId": 183
      }
    ]
  },
  {
    "id": 184,
    "isoCode2": "ZW",
    "name": "Zimbabwe",
    "phoneCode": "+263",
    "cities": [
      {
        "id": 1003,
        "name": "Harare",
        "countryId": 184
      },
      {
        "id": 1004,
        "name": "Bulawayo",
        "countryId": 184
      },
      {
        "id": 1005,
        "name": "Mutare",
        "countryId": 184
      },
      {
        "id": 1006,
        "name": "Gweru",
        "countryId": 184
      }
    ]
  }
];

export const SEED_PROFESSIONS: string[] = [
  "Student",
  "Homemaker",
  "Govt. Service Professional",
  "Private Sector Professional",
  "Business",
  "Retired",
  "Freelancer",
  "Looking for a Job",
  "Blogger",
  "Content Creator",
  "Influencer",
  "Teacher",
  "Others"
];

export const SEED_GENDERS: string[] = [
  "Male",
  "Female",
  "Other"
];
