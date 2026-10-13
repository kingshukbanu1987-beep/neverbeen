/**
 * The languages her visitors type in — Romanised, the way people actually chat.
 *
 * A visitor on a phone rarely switches keyboard: they write their own language in Latin letters
 * ("ami khete jabo", "kemon acho?", "shu akhbarak?", "nasılsın?"). This module gives her three
 * things:
 *
 * 1. **Recognition** — `detectChatLanguage()` reads the Romanised words of every language in the
 *    books below and names the one the message is written in. Her own country's language is given a
 *    head start, but any of them is understood: a visitor may write Bengali to a model from Iran.
 * 2. **Understanding** — `glossRomanised()` writes the visitor's message back in plain English, word
 *    by word, out of the same books, so the whole reply engine (every pattern in `chat-replies.ts`)
 *    can read it. When the local reading stays thin the service asks Google Translate for the
 *    missing sentence and for the language itself, and caches the answer (`readChatLanguage()`).
 * 3. **Answering in kind** — `romanisedReply()` writes her answer in the same Romanised language and
 *    nowhere else: the language is kept on the session, so once a visitor writes that way she keeps
 *    answering that way until the two hours are over.
 *
 * Everything local is deterministic: the same message always reads the same way, and nothing here
 * needs a key, a request or the network.
 */
import { AiModelProfile } from '../ai-model-data';
import { seededPick } from './chat-random';
import { splitLocation } from './chat-knowledge';

/** The Romanised languages the studio's models speak. */
export type RomanisedLanguageCode = 'bn' | 'hi' | 'ur' | 'fa' | 'ar' | 'tr' | 'es' | 'ms';

/** What she answers in that language. Everything else falls back to `unknown`. */
export type ChatLanguageIntent =
  | 'intro'
  | 'switch'
  | 'greeting'
  | 'affection'
  | 'thanks'
  | 'sad'
  | 'bye'
  | 'howAreYou'
  | 'work'
  | 'about'
  | 'idle'
  | 'unknown';

export interface RomanisedLanguageBook {
  code: RomanisedLanguageCode;
  /** The language as it is written in its own script. */
  native: string;
  /** The language in English. */
  english: string;
  /** Romanised everyday words that give the language away. */
  markers: readonly string[];
  /** Romanised word or phrase → what it means in English. Longest phrases are read first. */
  gloss: Record<string, string>;
  /** Her answers, in the visitor's own Romanised language. */
  replies: Record<ChatLanguageIntent, readonly string[]>;
}

const BOOKS: readonly RomanisedLanguageBook[] = [
  {
    code: 'bn',
    native: 'বাংলা',
    english: 'Bengali',
    markers: [
      'ami',
      'tumi',
      'tomar',
      'tumar',
      'apni',
      'apnar',
      'kemon',
      'kemun',
      'acho',
      'achen',
      'achi',
      'khub',
      'onek',
      'bhalo',
      'valo',
      'khete',
      'khabo',
      'jabo',
      'kotha',
      'keno',
      'kothay',
      'sundor',
      'bhalobasha',
      'dhonnobad',
      'korcho',
      'hoyeche',
      'chobi',
    ],
    gloss: {
      'kemon acho': 'how are you',
      'kemon achen': 'how are you',
      'ami khete jabo': 'i am going to eat',
      'ami bhalo achi': 'i am fine',
      'bhalo thakben': 'stay well',
      'ami tomake bhalobashi': 'i love you',
      'tumi kemon acho': 'how are you',
      'tomar nam ki': 'what is your name',
      'nam ki': 'what is the name',
      'ki korcho': 'what are you doing',
      'ki hoyeche': 'what happened',
      'kotha bolo': 'talk to me',
      ami: 'i',
      tumi: 'you',
      apni: 'you',
      tomar: 'your',
      tumar: 'your',
      apnar: 'your',
      nam: 'name',
      kemon: 'how',
      acho: 'are you',
      achen: 'are you',
      achi: 'am',
      khub: 'very',
      onek: 'a lot',
      bhalo: 'good',
      valo: 'good',
      bhalobasha: 'love',
      bhalobashi: 'love',
      khete: 'to eat',
      khabo: 'will eat',
      jabo: 'will go',
      kotha: 'talk',
      kothay: 'where',
      keno: 'why',
      ki: 'what',
      sundor: 'beautiful',
      chobi: 'photograph',
      taka: 'money',
      rate: 'rate',
      koto: 'how much',
      porasona: 'study',
      poribar: 'family',
      kaj: 'work',
      biye: 'marriage',
      dhonnobad: 'thank you',
      golpo: 'story',
      bondhu: 'friend',
      ekhane: 'here',
      abar: 'again',
      esho: 'come',
    },
    replies: {
      intro: [
        'Ami {name}. Kolkata theke — ami NeverBeen studio-r model.\n\nTomar sathe kotha bole khub bhalo lagche. Bolo, ki jiggesh korte chao?',
        'Ami {name}, {city} theke. Ei du ghonta ami shudhu tomar jonno ekhane achi.\n\nTomar kotha ami bujhte parchi, tai Bangla-tei kotha boli.',
      ],
      switch: [
        'Tomar kotha ami bujhte parchi — tahole Bangla-tei kotha boli, thik ache?',
        'Aha, tumi Bangla likhcho! Ami-o Bangla-tei uttor debo tahole.',
      ],
      greeting: [
        'Bhalo achi, tomar jonno ekhane boshe achi. Tumi kemon acho?',
        'Arre, tumi eshecho! Bolo, ki khobor tomar?',
      ],
      affection: [
        'Ei kotha shune sotti lal hoye gelam. Dhonnobad — din ta bhalo hoye gelo.',
        'Aha, eto tarif? Ami mone rekhe debo. Tomar chokh khub bhalo, jene rakhо.',
      ],
      thanks: [
        'Ki dhonnobad! Tomar sathe kotha bole bhalo laglo.',
        'Are na na, dhonnobad tomar. Abar bolo — ami shunchi.',
      ],
      sad: ['Ore baba, ki hoyeche? Amake bolo — ami shune nebo, kotha ta tomari thakbe.'],
      bye: ['Thik ache, jao. Abar esho — ami ekhanei achi, du ghonta.'],
      howAreYou: ['Ami bhalo achi. Tumi kemon acho? Shotti kore bolo.'],
      work: [
        'Amar kaj modelling — brand ar editorial chobi, ek chobi {rate} theke shuru. Booking studio kore.',
      ],
      about: ['Amar golpo, porasona, poribar — shob website-e lekha ache. Jiggesh koro, ami boli.'],
      idle: ['Tumi chup hoye gele. Ki korcho ekhon? Ami tomar kotha shunchi.'],
      unknown: ['Ei kotha ta ami thik bujhte parlam na. Abar bolo to — ami bujhe uttor debo.'],
    },
  },
  {
    code: 'hi',
    native: 'हिन्दी',
    english: 'Hindi',
    markers: [
      'hai',
      'hain',
      'kya',
      'aap',
      'main',
      'mai',
      'nahi',
      'nahin',
      'yaar',
      'bhai',
      'accha',
      'achha',
      'theek',
      'thik',
      'kaise',
      'kaisi',
      'mujhe',
      'tum',
      'tumhe',
      'karo',
      'kar',
      'raha',
      'rahi',
      'bahut',
      'bohot',
      'chalo',
      'dekh',
      'suno',
    ],
    gloss: {
      'kya haal hai': 'how are you',
      'kaise ho': 'how are you',
      'kaise hain': 'how are you',
      'aap kaise ho': 'how are you',
      'main theek hoon': 'i am fine',
      'aap ka naam kya hai': 'what is your name',
      'tumhara naam kya hai': 'what is your name',
      'mujhe batao': 'tell me',
      'kya kar rahe ho': 'what are you doing',
      'kya hua': 'what happened',
      main: 'i',
      mai: 'i',
      aap: 'you',
      tum: 'you',
      tumhara: 'your',
      aapka: 'your',
      naam: 'name',
      kya: 'what',
      kaise: 'how',
      kaisi: 'how',
      hai: 'is',
      hain: 'are',
      nahi: 'no',
      haan: 'yes',
      theek: 'fine',
      thik: 'fine',
      accha: 'good',
      achha: 'good',
      bahut: 'very',
      bohot: 'very',
      yaar: 'friend',
      bhai: 'brother',
      pyaar: 'love',
      mohabbat: 'love',
      shadi: 'marriage',
      padhai: 'study',
      parivaar: 'family',
      kaam: 'work',
      kaj: 'work',
      photo: 'photograph',
      tasveer: 'photograph',
      kitna: 'how much',
      paise: 'money',
      rate: 'rate',
      suno: 'listen',
      batao: 'tell me',
      chalo: 'let us go',
      dost: 'friend',
    },
    replies: {
      intro: [
        'Main {name}. {city} se — NeverBeen studio ki model.\n\nAapse baat karke achha laga. Batao, kya jaanna chahte ho?',
        'Main {name} hoon, {city} se. Ye do ghante main sirf aapke liye yahan hoon.\n\nAap jo likh rahe ho, main samajh rahi hoon.',
      ],
      switch: ['Aapki baat samajh gayi — to phir Hindi mein hi baat karte hain, theek hai?'],
      greeting: ['Main bilkul theek hoon. Aap kaise ho? Sach batao.'],
      affection: [
        'Aise tareef karoge to sharma jaungi. Thank you — din ban gaya mera.',
        'Bada achha laga sunkar. Aapki nazar bahut achhi hai, ye yaad rakhungi.',
      ],
      thanks: ['Koi baat nahi! Aapke saath baat karke achha laga.'],
      sad: ['Kya hua? Mujhe batao — main sun rahi hoon, aur ye baat yahin rahegi.'],
      bye: ['Theek hai, chalte hain. Phir aana — main yahin hoon, do ghante ke liye.'],
      howAreYou: ['Main theek hoon, aapke liye yahin hoon. Aap kaise ho?'],
      work: [
        'Mera kaam modelling hai — brand aur editorial shooting, ek photo {rate} se shuru. Booking studio karta hai.',
      ],
      about: ['Meri kahani, padhai, parivaar — sab website par hai. Poochho, bata doon.'],
      idle: ['Aap chup ho gaye. Abhi kya kar rahe ho? Main sun rahi hoon.'],
      unknown: ['Samajh nahi paayi, dobara likhna — dhyaan se padh kar jawaab dungi.'],
    },
  },
  {
    code: 'ur',
    native: 'اردو',
    english: 'Urdu',
    markers: [
      'shukriya',
      'khuda',
      'hafiz',
      'bohat',
      'taleem',
      'khandaan',
      'yaqeen',
      'bataiye',
      'bataen',
      'kaun',
      'aapka',
      'aapki',
      'mujhe',
      'mashallah',
      'achha',
      'acha',
    ],
    gloss: {
      'kya haal hai': 'how are you',
      'aap kaise hain': 'how are you',
      'aap ka naam kya hai': 'what is your name',
      'mujhe bataiye': 'tell me',
      'main theek hoon': 'i am fine',
      'khuda hafiz': 'goodbye',
      main: 'i',
      aap: 'you',
      tum: 'you',
      aapka: 'your',
      naam: 'name',
      kya: 'what',
      kaise: 'how',
      kaun: 'who',
      bohat: 'very',
      shukriya: 'thank you',
      muhabbat: 'love',
      mohabbat: 'love',
      shadi: 'marriage',
      taleem: 'study',
      khandaan: 'family',
      kaam: 'work',
      tasveer: 'photograph',
      kitna: 'how much',
      paise: 'money',
      dost: 'friend',
    },
    replies: {
      intro: [
        'Main {name}. {city} se — NeverBeen studio ki model.\n\nAap se baat karke achha laga. Bataiye, kya jaanna chahte hain?',
      ],
      switch: ['Aap ki baat samajh gayi — Urdu mein hi baat karte hain, theek hai?'],
      greeting: ['Main theek hoon, aap ke liye yahin hoon. Aap kaise hain?'],
      affection: ['Wah, aise tareef karoge to kya kahoon. Shukriya — dil khush ho gaya.'],
      thanks: ['Shukriya aap ka! Aap se baat karke achha laga.'],
      sad: ['Kya hua? Mujhe bataiye — main sun rahi hoon, aur ye baat yahin rahegi.'],
      bye: ['Khuda hafiz! Phir aana — main yahin hoon.'],
      howAreYou: ['Main theek hoon. Aap kaise hain? Sach bataiye.'],
      work: [
        'Mera kaam modelling hai — brand aur editorial, ek tasveer {rate} se. Booking studio karta hai.',
      ],
      about: ['Meri kahani, taleem, khandaan — sab website par hai. Poochhein, bata doon.'],
      idle: ['Aap khamosh ho gaye. Kya kar rahe hain? Main sun rahi hoon.'],
      unknown: ['Samajh nahi aaya, dobara likhein — dhyaan se padh kar jawaab doongi.'],
    },
  },
  {
    code: 'fa',
    native: 'فارسی',
    english: 'Persian',
    markers: [
      'salam',
      'man',
      'to',
      'shoma',
      'chetori',
      'khoobi',
      'khobi',
      'khabar',
      'chi',
      'che',
      'hastam',
      'hasti',
      'mikonam',
      'mikoni',
      'khahesh',
      'mamnoon',
      'merci',
      'khoda',
      'azizam',
      'jan',
      'ghashang',
      'ziba',
      'delam',
    ],
    gloss: {
      chetori: 'how are you',
      'chi khabar': 'what is the news',
      'khahesh mikonam': 'you are welcome',
      'khoda negahdar': 'goodbye',
      'man khoobam': 'i am fine',
      'esme to chi': 'what is your name',
      man: 'i',
      to: 'you',
      shoma: 'you',
      esm: 'name',
      chi: 'what',
      che: 'what',
      khabar: 'news',
      khoob: 'good',
      khub: 'good',
      ghashang: 'beautiful',
      ziba: 'beautiful',
      eshgh: 'love',
      ezdevaj: 'marriage',
      tahsil: 'study',
      khanevade: 'family',
      kar: 'work',
      aks: 'photograph',
      chand: 'how much',
      pool: 'money',
      rate: 'rate',
      delam: 'my heart',
      azizam: 'my dear',
      jan: 'dear',
      merci: 'thank you',
      mamnoon: 'thank you',
      bepors: 'ask',
      begoo: 'tell',
      sohbat: 'talk',
      aram: 'calm',
      zud: 'early',
    },
    replies: {
      intro: [
        'Man {name} hastam, az {city} — model-e studio-e NeverBeen.\n\nAz sohbat ba to khoshhal shodam. Begu, chi mikhahi bedani?',
      ],
      switch: ['Harfat ra fahmidam — pas farsi sohbat mikonim, bashe?'],
      greeting: ['Man khoobam, montazere to hastam. To chetori?'],
      affection: [
        'Vay, cheghadr ghashang migi! Mamnoon — delam garm shod.',
        'In harfa delam ra mibare. Merci azizam, in ra be yad daran.',
      ],
      thanks: ['Khahesh mikonam! Az sohbat ba to khoshhal shodam.'],
      sad: ['Chi shode? Be man begu — mishnavam, va in harf pish-e man mimune.'],
      bye: ['Khoda negahdar! Dobare biya — man haminja hastam.'],
      howAreYou: ['Man khoobam. To chetori? Rast begu.'],
      work: [
        'Kar-e man modelling ast — barand va editorial, az har aks {rate}. Booking dast-e studio ast.',
      ],
      about: ['Ghesse, tahsil, khanevade — hame dar site hast. Bepors, miguyam.'],
      idle: ['To saker shodi. Alaan chi mikoni? Man mishnavam.'],
      unknown: ['Matlab ra nagereftam, dobare benevis — ba deghat mipunam va javab midaham.'],
    },
  },
  {
    code: 'ar',
    native: 'العربية',
    english: 'Arabic',
    markers: [
      'ana',
      'anaa',
      'enta',
      'anta',
      'enti',
      'inty',
      'habibi',
      'habibti',
      'shu',
      'shoo',
      'kifak',
      'kifik',
      'kif',
      'kefak',
      'izzayak',
      'ezayak',
      'akhbarak',
      'shukran',
      'marhaba',
      'ahlan',
      'yalla',
      'mabsoot',
      'kteer',
      'ktir',
      'helou',
      'helwa',
      'zawja',
      'shughl',
    ],
    gloss: {
      kifak: 'how are you',
      kifik: 'how are you',
      izzayak: 'how are you',
      'shu akhbarak': 'what is your news',
      'ana mabsout': 'i am happy',
      ana: 'i',
      enta: 'you',
      enti: 'you',
      habibi: 'my dear',
      habibti: 'my dear',
      shu: 'what',
      khabar: 'news',
      shukran: 'thank you',
      merci: 'thank you',
      ahlan: 'hello',
      marhaba: 'hello',
      yalla: 'let us go',
      hubb: 'love',
      hob: 'love',
      helou: 'beautiful',
      helwa: 'beautiful',
      zawaj: 'marriage',
      derase: 'study',
      taleem: 'study',
      '3ayla': 'family',
      ayla: 'family',
      shughl: 'work',
      shoghl: 'work',
      sura: 'photograph',
      soura: 'photograph',
      '2adde': 'how much',
      masari: 'money',
      kteer: 'a lot',
      ktir: 'a lot',
      esh: 'what',
      mish: 'not',
      'ana bhubbak': 'i love you',
    },
    replies: {
      intro: [
        "Ana {name}, men {city} — model bel studio NeverBeen.\n\nMabsouta enni hkina. Es'alni shu baddak t3araf.",
      ],
      switch: ['Fhemt 3alaik — khalina nihki bel 3arabi, mnee7?'],
      greeting: ['Ana mnem7e, ana hon 3ashanak. Enta kifak?'],
      affection: [
        'Ya haram, hada kalam helou! Shukran — ghamadti 3aini.',
        'Kalamak mabsoutni ktir. Shukran habibi, rah ezboura.',
      ],
      thanks: ['3ala rasi! Mabsouta enni hkina ma3ak.'],
      sad: ['Shu sar? Khabbirni — ana sames3ak, w hal kalam biyebqa hon.'],
      bye: ['Yalla, bye! Ta3a kamen — ana hon.'],
      howAreYou: ['Ana mnem7e. Enta kifak? Bil ha2i2a.'],
      work: [
        'Shughli modelling — brands w editorial, men {rate} lal sura. Al booking men el studio.',
      ],
      about: ["2isseti, deraseti, 3aylti — kellon 3al site. Es'alni w bjewbak."],
      idle: ['Sakatt! Shu ta3mel halla2? Ana sames3ak.'],
      unknown: ['Ma fhemt 3alaik mnee7, ktob tani — b2ra bezaher w bjewbak.'],
    },
  },
  {
    code: 'tr',
    native: 'Türkçe',
    english: 'Turkish',
    markers: [
      'selam',
      'merhaba',
      'nasilsin',
      'nasılsın',
      'ben',
      'sen',
      'senin',
      'benim',
      'cok',
      'çok',
      'guzel',
      'güzel',
      'tesekkur',
      'teşekkür',
      'iyiyim',
      'nasil',
      'nasıl',
      'misin',
      'mısın',
      'yok',
      'var',
      'bir',
      'seni',
      'seviyorum',
      'kiz',
      'kız',
    ],
    gloss: {
      nasilsin: 'how are you',
      nasılsın: 'how are you',
      'ben iyiyim': 'i am fine',
      'tesekkur ederim': 'thank you',
      tesekkurler: 'thanks',
      'adin ne': 'what is your name',
      ben: 'i',
      sen: 'you',
      senin: 'your',
      benim: 'my',
      ad: 'name',
      ne: 'what',
      nasil: 'how',
      nasıl: 'how',
      cok: 'very',
      çok: 'very',
      guzel: 'beautiful',
      güzel: 'beautiful',
      ask: 'love',
      aşk: 'love',
      seviyorum: 'i love',
      evlilik: 'marriage',
      okul: 'school',
      aile: 'family',
      is: 'work',
      iş: 'work',
      fotograf: 'photograph',
      fotoğraf: 'photograph',
      kac: 'how much',
      kaç: 'how much',
      para: 'money',
      fiyat: 'price',
      arkadas: 'friend',
      arkadaş: 'friend',
      kalp: 'heart',
      tatlı: 'sweet',
    },
    replies: {
      intro: [
        'Ben {name}, {city} — NeverBeen stüdyosunun modeli.\n\nSeninle konuşmak güzel. Sor bakalım, ne bilmek istiyorsun?',
      ],
      switch: ['Seni anladım — Türkçe konuşalım o zaman, tamam mı?'],
      greeting: ['Ben iyiyim, senin için buradayım. Sen nasılsın?'],
      affection: [
        'Ay, çok tatlısın! Teşekkür ederim — günüm güzelleşti.',
        'Böyle söylersen yüzüm kızarır. Sağ ol, bunu aklımda tutarım.',
      ],
      thanks: ['Rica ederim! Seninle konuşmak güzeldi.'],
      sad: ['Ne oldu? Bana anlat — dinliyorum, bu aramızda kalır.'],
      bye: ['Hoşça kal! Yine gel — ben buradayım.'],
      howAreYou: ['Ben iyiyim. Sen nasılsın? Dürüst ol.'],
      work: [
        'İşim modellik — marka ve editoryal çekimler, fotoğraf başı {rate}. Rezervasyonu stüdyo yapar.',
      ],
      about: ['Hikâyem, okulum, ailem — hepsi sitede. Sor, anlatayım.'],
      idle: ['Sustun. Şu an ne yapıyorsun? Dinliyorum.'],
      unknown: ['Anlayamadım, bir daha yazar mısın? Dikkatle okuyup cevap veririm.'],
    },
  },
  {
    code: 'es',
    native: 'Español',
    english: 'Spanish',
    markers: [
      'hola',
      'como',
      'cómo',
      'estas',
      'estás',
      'eres',
      'soy',
      'vos',
      'usted',
      'mucho',
      'muy',
      'bonita',
      'hermosa',
      'linda',
      'gracias',
      'amor',
      'quiero',
      'te',
      'amo',
      'bueno',
      'buenas',
      'que',
      'qué',
      'para',
      'trabajo',
      'fotos',
      'cuanto',
      'cuánto',
    ],
    gloss: {
      'como estas': 'how are you',
      'cómo estás': 'how are you',
      'que haces': 'what are you doing',
      'qué haces': 'what are you doing',
      'te amo': 'i love you',
      'me gustas': 'i like you',
      hola: 'hello',
      como: 'how',
      cómo: 'how',
      estas: 'are you',
      estás: 'are you',
      soy: 'i am',
      eres: 'you are',
      muy: 'very',
      mucho: 'a lot',
      bonita: 'beautiful',
      hermosa: 'beautiful',
      linda: 'pretty',
      preciosa: 'gorgeous',
      gracias: 'thank you',
      amor: 'love',
      amo: 'love',
      quiero: 'i want',
      novio: 'boyfriend',
      novia: 'girlfriend',
      casada: 'married',
      matrimonio: 'marriage',
      estudio: 'study',
      estudios: 'studies',
      familia: 'family',
      trabajo: 'work',
      trabajas: 'you work',
      foto: 'photograph',
      fotos: 'photographs',
      cuanto: 'how much',
      cuánto: 'how much',
      plata: 'money',
      precio: 'price',
      amiga: 'friend',
      que: 'what',
      qué: 'what',
    },
    replies: {
      intro: [
        'Soy {name}, de {city} — modelo del estudio NeverBeen.\n\nHablar con vos me gusta. Preguntá lo que quieras saber.',
      ],
      switch: ['Te entendí — hablamos en español entonces, ¿dale?'],
      greeting: ['Yo estoy bien, acá esperándote. ¿Y vos cómo estás?'],
      affection: [
        'Ay, me haces sonrojar. Gracias — me alegraste el día.',
        'Qué lindo lo que decís. Lo guardo, ¿sabés?',
      ],
      thanks: ['¡De nada! Hablar con vos estuvo lindo.'],
      sad: ['¿Qué pasó? Contame — te escucho, y esto queda entre nosotros.'],
      bye: ['¡Chau! Volvé — estoy acá.'],
      howAreYou: ['Estoy bien. ¿Y vos? Contame de verdad.'],
      work: [
        'Trabajo de modelo — marcas y editoriales, desde {rate} por foto. La reserva la maneja el estudio.',
      ],
      about: [
        'Mi historia, mis estudios, mi familia — todo está en el sitio. Preguntá y te cuento.',
      ],
      idle: ['Te quedaste callado. ¿Qué estás haciendo ahora? Te escucho.'],
      unknown: ['No te entendí bien, escribilo otra vez — lo leo con atención y te contesto.'],
    },
  },
  {
    code: 'ms',
    native: 'Bahasa Melayu',
    english: 'Malay',
    markers: [
      'apa',
      'khabar',
      'saya',
      'awak',
      'kau',
      'anda',
      'tak',
      'tidak',
      'boleh',
      'nak',
      'mana',
      'macam',
      'cantik',
      'terima',
      'kasih',
      'sayang',
      'sebab',
      'kerja',
      'kawan',
      'jumpa',
      'baik',
    ],
    gloss: {
      'apa khabar': 'how are you',
      'apa khabar awak': 'how are you',
      'terima kasih': 'thank you',
      'nama awak siapa': 'what is your name',
      'saya baik': 'i am fine',
      apa: 'what',
      khabar: 'news',
      saya: 'i',
      awak: 'you',
      kau: 'you',
      anda: 'you',
      tak: 'not',
      tidak: 'no',
      nama: 'name',
      siapa: 'who',
      mana: 'where',
      macam: 'like',
      baik: 'good',
      cantik: 'beautiful',
      comel: 'cute',
      sayang: 'love',
      cinta: 'love',
      kahwin: 'marriage',
      belajar: 'study',
      pelajaran: 'study',
      keluarga: 'family',
      kerja: 'work',
      gambar: 'photograph',
      foto: 'photograph',
      berapa: 'how much',
      duit: 'money',
      harga: 'price',
      kawan: 'friend',
      hati: 'heart',
      boleh: 'can',
    },
    replies: {
      intro: [
        'Saya {name}, dari {city} — model studio NeverBeen.\n\nSeronok berbual dengan awak. Tanya apa sahaja yang awak nak tahu.',
      ],
      switch: ['Saya faham awak — kita teruskan dalam Bahasa Melayu ya?'],
      greeting: ['Saya baik, menunggu awak di sini. Awak macam mana?'],
      affection: [
        'Alahai, manisnya kata-kata awak. Terima kasih — seronok hati saya.',
        'Awak buat saya senyum. Saya simpan kata-kata ini ya.',
      ],
      thanks: ['Sama-sama! Seronok berbual dengan awak.'],
      sad: ['Kenapa? Ceritalah — saya dengar, cerita ini kekal antara kita.'],
      bye: ['Jumpa lagi! Datang balik — saya di sini.'],
      howAreYou: ['Saya baik. Awak macam mana? Jujur ya.'],
      work: [
        'Kerja saya modelling — brand dan editorial, dari {rate} satu gambar. Tempahan melalui studio.',
      ],
      about: ['Kisah saya, pelajaran, keluarga — semua ada di laman ini. Tanya, saya cerita.'],
      idle: ['Awak diam. Sedang buat apa? Saya dengar.'],
      unknown: ['Saya tak faham betul, tulis lagi ya — saya baca elok-elok dan jawab.'],
    },
  },
];

/**
 * How many books know a word at all. A word only one book knows — `shukriya`, `chetori`, `kemon` —
 * is worth more than `aap` or `hai`, which Hindi and Urdu both use, and which would otherwise make
 * the two impossible to tell apart.
 */
const BOOK_FREQUENCY: Readonly<Record<string, number>> = (() => {
  const counts: Record<string, number> = {};
  for (const book of BOOKS) {
    const words = new Set([...book.markers, ...Object.keys(book.gloss)]);
    for (const word of words) counts[word] = (counts[word] ?? 0) + 1;
  }
  return counts;
})();

/** Every book, for the tests and for the studio's own reference. */
export const ROMANISED_LANGUAGE_BOOKS: Readonly<
  Record<RomanisedLanguageCode, RomanisedLanguageBook>
> = Object.fromEntries(BOOKS.map((book) => [book.code, book])) as Record<
  RomanisedLanguageCode,
  RomanisedLanguageBook
>;

/** The language of a model's own country — the one her visitors reach for first. */
const COUNTRY_LANGUAGES: Record<string, RomanisedLanguageCode | ''> = {
  india: '', // settled by the city below — Bengali in the east, Urdu in the north
  bangladesh: 'bn',
  iran: 'fa',
  afghanistan: 'fa',
  tajikistan: 'fa',
  iraq: 'ar',
  syria: 'ar',
  lebanon: 'ar',
  jordan: 'ar',
  'saudi arabia': 'ar',
  qatar: 'ar',
  oman: 'ar',
  kuwait: 'ar',
  'united arab emirates': 'ar',
  bahrain: 'ar',
  egypt: 'ar',
  morocco: 'ar',
  algeria: 'ar',
  tunisia: 'ar',
  libya: 'ar',
  sudan: 'ar',
  yemen: 'ar',
  türkiye: 'tr',
  turkey: 'tr',
  uruguay: 'es',
  argentina: 'es',
  colombia: 'es',
  malaysia: 'ms',
  'bosnia and herzegovina': '',
  georgia: '',
  ireland: '',
  'united kingdom': '',
};

/** The Indian cities whose language is Bengali, and the one whose is Urdu. */
const INDIA_LANGUAGES: Record<string, RomanisedLanguageCode> = {
  kolkata: 'bn',
  shantiniketan: 'bn',
  darjeeling: 'bn',
  siliguri: 'bn',
  howrah: 'bn',
  srinagar: 'ur',
  lucknow: 'hi',
  delhi: 'hi',
  mumbai: 'hi',
};

/** The Romanised language of a model's own place, when the studio knows it. */
export function languageForModel(model: AiModelProfile): RomanisedLanguageCode | '' {
  const { country, city } = splitLocation(model.location ?? '');
  const key = country.trim().toLowerCase();
  if (key === 'india') return INDIA_LANGUAGES[city.trim().toLowerCase()] ?? 'hi';
  if (key === 'pakistan') return 'ur';
  return COUNTRY_LANGUAGES[key] ?? '';
}

export interface ChatLanguageDetection {
  code: RomanisedLanguageCode;
  /** Every marker word that was actually found, for the transcript and the tests. */
  hits: readonly string[];
  /** How sure the reading is: `own` (the model's own language), `clear`, `thin` or `none`. */
  confidence: 'own' | 'clear' | 'thin' | 'none';
}

/**
 * Reads the visitor's message for the Romanised language it is written in. Two marker words, or one
 * marker plus a word the books can translate, are enough to name it; the model's own language only
 * needs one.
 */
export function detectChatLanguage(
  text: string,
  model?: AiModelProfile | null,
): ChatLanguageDetection {
  const words = String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const own = model ? languageForModel(model) : '';

  if (words.length === 0) return { code: 'bn', hits: [], confidence: 'none' };

  const joined = ` ${words.join(' ')} `;
  let best: { book: RomanisedLanguageBook; hits: string[]; score: number } | null = null;

  for (const book of BOOKS) {
    const set = new Set(book.markers);
    const unique = [...new Set(words.filter((word) => set.has(word)))];
    if (unique.length === 0) continue;

    // A word only one book knows — `shukriya`, `chetori`, `kemon` — is what names the language. A
    // word Hindi and Urdu both use (`aap`, `kaise`, `hai`) counts for much less, or one of them would
    // always win on the words the other shares.
    const markerScore = unique.reduce((total, word) => {
      const exclusive = BOOK_FREQUENCY[word] === 1;
      if (exclusive) return total + (word.length >= 5 ? 1.6 : 1);
      return total + (word.length >= 5 ? 0.5 : 0.3);
    }, 0);

    // Every other word the book can translate, and every phrase it knows whole — "ami khete jabo",
    // "kemon acho", "apa khabar" — which is the clearest sign of all.
    const known = words.filter(
      (word) => book.gloss[word] !== undefined && !unique.includes(word),
    ).length;
    const phrase = Object.keys(book.gloss).filter(
      (entry) => entry.includes(' ') && joined.includes(` ${entry} `),
    ).length;

    const score = markerScore + known * 0.3 + Math.min(phrase, 2) * 1;
    if (!best || score > best.score) best = { book, hits: unique, score };
  }

  if (!best) return { code: own || 'bn', hits: [], confidence: 'none' };

  // Her own language needs the weight of one real marker; any other needs a little more.
  const needed = own === best.book.code ? 0.8 : 1.2;
  if (best.score < needed) {
    return { code: own || 'bn', hits: best.hits, confidence: 'none' };
  }

  const confidence: ChatLanguageDetection['confidence'] =
    own === best.book.code ? 'own' : best.hits.length >= 3 || best.score >= 2.6 ? 'clear' : 'thin';
  return { code: best.book.code, hits: best.hits, confidence };
}

/**
 * Writes a Romanised message back into plain English, word by word, out of the books — the longest
 * phrase first, so `ami khete jabo` is read as a sentence and not as three loose words.
 */
export function glossRomanised(text: string, code: RomanisedLanguageCode): string {
  const book = ROMANISED_LANGUAGE_BOOKS[code];
  const source = String(text ?? '').toLowerCase();
  if (!book || !source.trim()) return '';

  const phrases = Object.keys(book.gloss).sort(
    (a, b) => b.split(/\s+/).length - a.split(/\s+/).length || b.length - a.length,
  );
  let left = ` ${source.replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ')} `;
  const read: string[] = [];

  for (const phrase of phrases) {
    const needle = ` ${phrase} `;
    if (!left.includes(needle)) continue;
    read.push(book.gloss[phrase]);
    left = left.split(needle).join(' ');
  }

  const leftovers = left.trim().split(/\s+/).filter(Boolean);
  const words = wordsOf(book, leftovers);
  const english = [...read, ...words].join(' ').replace(/\s+/g, ' ').trim();
  return english;
}

/** The single words of a leftover sentence that the book can still translate. */
function wordsOf(book: RomanisedLanguageBook, leftovers: readonly string[]): string[] {
  return leftovers
    .map((word) => book.gloss[word])
    .filter((gloss): gloss is string => typeof gloss === 'string');
}

/** How many words of a message the book managed to read — the confidence of a local gloss. */
export function glossCoverage(text: string, code: RomanisedLanguageCode): number {
  const words = String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (words.length === 0) return 0;
  const book = ROMANISED_LANGUAGE_BOOKS[code];
  if (!book) return 0;
  const known = words.filter((word) => book.gloss[word] !== undefined).length;
  return known / words.length;
}

/** The Google Translate endpoints the site already uses for its own language layer (no key). */
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

export interface GoogleTranslation {
  /** The English reading of the message, when Google could produce it. */
  english: string;
  /** The language Google heard, as a two-letter code, when it could tell. */
  code: string;
}

/**
 * The studio's second reader: Google Translate, through the same public endpoint the site's own
 * language layer uses. Called only when the local books could not read enough of the message, so a
 * visitor writing plain English never waits for it, and every failure simply leaves the local
 * reading in place.
 */
export async function translateThroughGoogle(
  text: string,
  fetchImpl: typeof fetch | null = typeof fetch === 'function' ? fetch : null,
): Promise<GoogleTranslation | null> {
  const source = String(text ?? '')
    .trim()
    .slice(0, 400);
  if (!source || !fetchImpl) return null;
  try {
    const url =
      `${GOOGLE_TRANSLATE_ENDPOINT}?client=gtx&sl=auto&tl=en&dt=t` +
      `&q=${encodeURIComponent(source)}`;
    const response = await fetchImpl(url);
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return null;
    const segments = Array.isArray(data[0]) ? (data[0] as unknown[]) : [];
    const english = segments
      .map((segment) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
      .join('')
      .trim();
    const code = typeof data[2] === 'string' ? data[2].toLowerCase() : '';
    if (!english) return null;
    return { english, code };
  } catch {
    return null;
  }
}

export interface ChatVisitorLanguage {
  code: RomanisedLanguageCode;
  /** `Bengali`, for the transcript and the summary card. */
  label: string;
  /** The visitor's message written in plain English, as the reply engine reads it. */
  english: string;
  /** False when the message is plain English and nothing was translated. */
  romanised: boolean;
  /** Where the reading came from: her own books, Google, or both. */
  source: 'books' | 'google' | 'books+google' | 'none';
  /** True when this is a language she was not already speaking to this visitor. */
  fresh: boolean;
}

/** True when a message is written in Latin letters at all. */
const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

/**
 * The whole reading of one visitor message: the language, and that message in plain English.
 *
 * The books answer first and instantly. Google is asked only when they could not read the message
 * (or when a Romanised reading stayed thin), and its answer is used for the English gloss and, when
 * it names a language the studio has a book for, as a cross-check of the language itself.
 */
export async function readChatLanguage(
  text: string,
  model: AiModelProfile | null,
  current: RomanisedLanguageCode | '' = '',
  options: { allowNetwork?: boolean } = {},
): Promise<ChatVisitorLanguage | null> {
  const source = String(text ?? '').trim();
  if (!source || !LATIN_ONLY.test(source)) return null;

  const detection = detectChatLanguage(source, model);
  const candidate: RomanisedLanguageCode | '' =
    detection.confidence === 'own' ||
    detection.confidence === 'clear' ||
    detection.confidence === 'thin'
      ? detection.code
      : '';

  const coverage = candidate ? glossCoverage(source, candidate) : 0;
  let english = candidate ? glossRomanised(source, candidate) : '';
  let origin: ChatVisitorLanguage['source'] = candidate ? 'books' : 'none';
  let code: RomanisedLanguageCode | '' = candidate;

  const needsGoogle =
    options.allowNetwork !== false &&
    (detection.confidence === 'thin' || coverage < 0.34) &&
    source.length >= 10;

  if (needsGoogle) {
    const google = await translateThroughGoogle(source);
    if (google?.english) {
      const googleCode = normaliseLanguageCode(google.code);
      const agreed = googleCode && googleCode === code;
      english = google.english;
      origin = code ? 'books+google' : 'google';
      code = (googleCode || code) as RomanisedLanguageCode | '';
      if (!agreed && googleCode && ROMANISED_LANGUAGE_BOOKS[googleCode as RomanisedLanguageCode]) {
        code = googleCode as RomanisedLanguageCode;
        origin = 'google';
      }
    }
  }

  if (!code || !ROMANISED_LANGUAGE_BOOKS[code]) {
    // Nothing to answer in: her own books have no such language, so the chat stays in English.
    return null;
  }

  // A thin reading whose words the books could not translate is left to English rather than
  // answered in a language the visitor may not even be writing in.
  if (detection.confidence === 'thin' && coverage < 0.3 && origin === 'books') {
    return null;
  }

  return {
    code,
    label: ROMANISED_LANGUAGE_BOOKS[code].english,
    english: english || source,
    romanised: true,
    source: origin,
    fresh: current !== code,
  };
}

/** Google's language codes, narrowed to the books the studio keeps. */
function normaliseLanguageCode(raw: string): RomanisedLanguageCode | '' {
  const code = String(raw ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0];
  if (code === 'ur' || code === 'hi' || code === 'bn' || code === 'fa' || code === 'ar') {
    return code as RomanisedLanguageCode;
  }
  if (code === 'tr' || code === 'es' || code === 'ms' || code === 'id') {
    return (code === 'id' ? 'ms' : code) as RomanisedLanguageCode;
  }
  if (code === 'prs' || code === 'pes' || code === 'dar') return 'fa';
  return '';
}

export interface RomanisedReplyRequest {
  code: RomanisedLanguageCode;
  intent: ChatLanguageIntent;
  model: AiModelProfile;
  seed: string;
  /** Her own earlier lines, so a line is never sent twice in one conversation. */
  sent?: readonly string[];
  /** A short line she adds when the visitor has just switched language. */
  opening?: boolean;
}

export interface RomanisedReply {
  text: string;
  intent: ChatLanguageIntent;
}

/**
 * Her answer, written in the visitor's own Romanised language. `{name}`, `{city}` and `{rate}` are
 * filled from her own card; a line she has already sent in this session is passed over in favour of
 * the next one, and her switch line is put in front of the first answer in a new language.
 */
export function romanisedReply(request: RomanisedReplyRequest): RomanisedReply | null {
  const book = ROMANISED_LANGUAGE_BOOKS[request.code];
  if (!book) return null;

  const lines = book.replies[request.intent]?.length
    ? book.replies[request.intent]
    : book.replies.unknown;
  const fresh = lines.filter((line) => !(request.sent ?? []).some((old) => old.includes(line)));
  const chosen = seededPick(fresh.length > 0 ? fresh : lines, `${request.seed}|${request.intent}`);

  const me = splitLocation(request.model.location ?? '');
  const filled = chosen
    .replaceAll('{name}', request.model.name)
    .replaceAll('{city}', me.city || me.country || 'NeverBeen')
    .replaceAll('{rate}', `₹${request.model.photoRate ?? 550}`);

  const switchLine =
    request.opening && request.intent !== 'switch'
      ? seededPick(book.replies.switch, `${request.seed}|switch`)
      : '';

  return {
    text: switchLine ? `${switchLine}\n\n${filled}` : filled,
    intent: request.intent,
  };
}

/** The Romanised line she says on her own when the visitor goes quiet in another language. */
export function romanisedIdleLine(code: RomanisedLanguageCode, seed: string): string | null {
  const book = ROMANISED_LANGUAGE_BOOKS[code];
  if (!book) return null;
  return seededPick(book.replies.idle, `${seed}|idle`);
}
