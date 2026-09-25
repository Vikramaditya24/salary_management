/**
 * Small, hand-curated first/last name pools per country, used only to make
 * generated names feel less uniform than one global list repeated 10,000
 * times. Not an attempt at exhaustive or authoritative cultural-naming
 * data — a synthetic-data convenience, deterministic given the PRNG.
 */
export interface NamePool {
  firstNames: readonly string[];
  lastNames: readonly string[];
}

const DEFAULT_POOL: NamePool = {
  firstNames: ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Sam', 'Jamie'],
  lastNames: ['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Davis', 'Miller', 'Wilson'],
};

export const NAME_POOLS: Readonly<Record<string, NamePool>> = {
  US: {
    firstNames: ['James', 'Mary', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'David', 'Linda'],
    lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'],
  },
  IN: {
    firstNames: ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Neha', 'Arjun', 'Kavya'],
    lastNames: ['Sharma', 'Patel', 'Reddy', 'Singh', 'Kumar', 'Iyer', 'Nair', 'Gupta'],
  },
  GB: {
    firstNames: ['Oliver', 'Amelia', 'George', 'Isla', 'Harry', 'Freya', 'Jack', 'Grace'],
    lastNames: ['Taylor', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Clarke', 'Hughes'],
  },
  DE: {
    firstNames: ['Lukas', 'Anna', 'Leon', 'Lea', 'Felix', 'Mia', 'Jonas', 'Emma'],
    lastNames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann'],
  },
  CA: {
    firstNames: ['Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Charlotte', 'Logan', 'Zoe'],
    lastNames: ['Tremblay', 'Roy', 'Cote', 'MacDonald', 'Campbell', 'Stewart', 'Gagnon', 'Clark'],
  },
  FR: {
    firstNames: ['Louis', 'Camille', 'Hugo', 'Manon', 'Gabriel', 'Chloe', 'Jules', 'Ines'],
    lastNames: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Richard', 'Durand'],
  },
  AU: {
    firstNames: ['Jack', 'Charlotte', 'William', 'Ava', 'Thomas', 'Mia', 'James', 'Isla'],
    lastNames: ['Smith', 'Wilson', 'Anderson', 'Taylor', 'Thompson', 'White', 'Martin', 'Walker'],
  },
  BR: {
    firstNames: ['Miguel', 'Sofia', 'Arthur', 'Helena', 'Heitor', 'Valentina', 'Davi', 'Laura'],
    lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida'],
  },
  NL: {
    firstNames: ['Daan', 'Emma', 'Sem', 'Julia', 'Lucas', 'Tess', 'Milan', 'Sophie'],
    lastNames: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'Bakker', 'Visser', 'Smit', 'Meijer'],
  },
  SG: {
    firstNames: ['Wei Jie', 'Hui Ling', 'Jia Hao', 'Xin Yi', 'Zhi Wei', 'Mei Ling', 'Kai Le', 'Si Ying'],
    lastNames: ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Goh', 'Chua', 'Koh'],
  },
  JP: {
    firstNames: ['Haruto', 'Yui', 'Sota', 'Hina', 'Yuto', 'Aoi', 'Ren', 'Sakura'],
    lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura'],
  },
  MX: {
    firstNames: ['Santiago', 'Maria', 'Mateo', 'Valentina', 'Sebastian', 'Ximena', 'Diego', 'Camila'],
    lastNames: ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez'],
  },
  ES: {
    firstNames: ['Hugo', 'Lucia', 'Martin', 'Sofia', 'Mateo', 'Martina', 'Leo', 'Paula'],
    lastNames: ['Garcia', 'Fernandez', 'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Sanchez', 'Perez'],
  },
  IT: {
    firstNames: ['Leonardo', 'Sofia', 'Francesco', 'Giulia', 'Alessandro', 'Aurora', 'Lorenzo', 'Alice'],
    lastNames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci'],
  },
  IE: {
    firstNames: ['Conor', 'Saoirse', 'Sean', 'Aoife', 'Cian', 'Ciara', 'Oisin', 'Niamh'],
    lastNames: ['Murphy', 'Kelly', 'Byrne', 'Ryan', 'OConnor', 'Walsh', 'OBrien', 'Gallagher'],
  },
  SE: {
    firstNames: ['William', 'Alice', 'Oscar', 'Maja', 'Lucas', 'Elsa', 'Axel', 'Wilma'],
    lastNames: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson'],
  },
  CH: {
    firstNames: ['Noah', 'Mia', 'Liam', 'Emma', 'Matteo', 'Elena', 'Luca', 'Laura'],
    lastNames: ['Muller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer'],
  },
  PL: {
    firstNames: ['Jakub', 'Zuzanna', 'Antoni', 'Julia', 'Jan', 'Maja', 'Szymon', 'Zofia'],
    lastNames: ['Nowak', 'Kowalski', 'Wisniewski', 'Wojcik', 'Kowalczyk', 'Kaminski', 'Lewandowski', 'Zielinski'],
  },
  ZA: {
    firstNames: ['Liam', 'Emma', 'Ethan', 'Amahle', 'Sipho', 'Thandiwe', 'Jayden', 'Lerato'],
    lastNames: ['Nkosi', 'Dlamini', 'Van der Merwe', 'Botha', 'Khumalo', 'Mokoena', 'Naidoo', 'Pretorius'],
  },
  AE: {
    firstNames: ['Mohammed', 'Fatima', 'Ahmed', 'Maryam', 'Ali', 'Aisha', 'Omar', 'Layla'],
    lastNames: ['Al Maktoum', 'Al Nahyan', 'Hassan', 'Khan', 'Rahman', 'Al Suwaidi', 'Mahmoud', 'Farooq'],
  },
};

export function namePoolForCountry(countryCode: string): NamePool {
  return NAME_POOLS[countryCode] ?? DEFAULT_POOL;
}
