'use strict';

/**@type {{[k: string]: TemplateData}} */
let BattlePokedex = {
naganadel: {
		num: 804,
		species: "Naganadel",
		types: ["Poison", "Dragon"],
		gender: "N",
		baseStats: {hp: 73, atk: 53, def: 83, spa: 179, spd: 83, spe: 129},
		abilities: {0: "Beast Boost"},
		heightm: 3.6,
		weightkg: 150,
		color: "Purple",
		prevo: "poipole",
		evoLevel: 41,
		eggGroups: ["Undiscovered"],
	},
 	mukalola: {
		num: 89,
		species: "Muk-Alola",
		baseSpecies: "Muk",
		forme: "Alola",
		formeLetter: "A",
		types: ["Poison", "Dark"],
		baseStats: {hp: 120, atk: 125, def: 125, spa: 70, spd: 115, spe: 45},
		abilities: {0: "Poison Touch", 1: "Gluttony", H: "Power of Alchemy"},
		heightm: 1,
		weightkg: 52,
		color: "Green",
		prevo: "grimeralola",
		evoLevel: 38,
		eggGroups: ["Amorphous"],
	},
tapukoko: {
		num: 785,
		species: "Tapu Koko",
		types: ["Electric", "Fairy"],
		gender: "N",
		baseStats: {hp: 80, atk: 125, def: 80, spa: 125, spd: 80, spe: 135},
		abilities: {0: "Electric Surge", H: "Telepathy"},
		heightm: 1.8,
		weightkg: 20.5,
		color: "Yellow",
		eggGroups: ["Undiscovered"],
	},
	tapulele: {
		num: 786,
		species: "Tapu Lele",
		types: ["Psychic", "Fairy"],
		gender: "N",
		baseStats: {hp: 105, atk: 70, def: 105, spa: 145, spd: 105, spe: 100},
		abilities: {0: "Psychic Surge", H: "Telepathy"},
		heightm: 1.2,
		weightkg: 18.6,
		color: "Pink",
		eggGroups: ["Undiscovered"],
	},
	tapubulu: {
		num: 787,
		species: "Tapu Bulu",
		types: ["Grass", "Fairy"],
		gender: "N",
		baseStats: {hp: 100, atk: 140, def: 130, spa: 80, spd: 110, spe: 70},
		abilities: {0: "Grassy Surge", H: "Telepathy"},
		heightm: 1.9,
		weightkg: 45.5,
		color: "Red",
		eggGroups: ["Undiscovered"],
	},
	tapufini: {
		num: 788,
		species: "Tapu Fini",
		types: ["Water", "Fairy"],
		gender: "N",
		baseStats: {hp: 100, atk: 70, def: 110, spa: 140, spd: 130, spe: 80},
		abilities: {0: "Misty Surge", H: "Telepathy"},
		heightm: 1.3,
		weightkg: 21.2,
		color: "Purple",
		eggGroups: ["Undiscovered"],
	},
		magnezone: {
		num: 462,
		species: "Magnezone",
		types: ["Electric", "Steel"],
		gender: "N",
		baseStats: {hp: 90, atk: 80, def: 110, spa: 125, spd: 135, spe: 60},
		abilities: {0: "Magnet Pull", 1: "Sturdy", H: "Analytic"},
		heightm: 1.2,
		weightkg: 180,
		color: "Gray",
		prevo: "magneton",
		evoLevel: 31,
		eggGroups: ["Mineral"],
	},
		hooh: {
		num: 250,
		species: "Ho-Oh",
		types: ["Fire", "Flying"],
		gender: "N",
		baseStats: {hp: 115, atk: 130, def: 110, spa: 60, spd: 175, spe: 90},
		abilities: {0: "Pressure", H: "Regenerator"},
		heightm: 3.8,
		weightkg: 199,
		color: "Red",
		eggGroups: ["Undiscovered"],
	},
	klefki: {
		num: 707,
		species: "Klefki",
		types: ["Steel", "Fairy"],
		baseStats: {hp: 83, atk: 72, def: 141, spa: 72, spd: 135, spe: 67},
		abilities: {0: "Prankster", H: "Magician"},
		heightm: 0.2,
		weightkg: 3,
		color: "Gray",
		eggGroups: ["Mineral"],
	},
	necrozmadawnwings: {
		num: 800,
		species: "Necrozma-Dawn-Wings",
		baseSpecies: "Necrozma",
		forme: "Dawn-Wings",
		formeLetter: "D",
		types: ["Psychic", "Ghost"],
		gender: "N",
		baseStats: {hp: 113, atk: 103, def: 127, spa: 157, spd: 127, spe: 73},
		abilities: {0: "Prism Armor"},
		heightm: 4.2,
		weightkg: 350,
		color: "Blue",
		eggGroups: ["Undiscovered"],
	},
	mandibuzz: {
		num: 630,
		species: "Mandibuzz",
		types: ["Dark", "Flying"],
		gender: "F",
		baseStats: {hp: 120, atk: 65, def: 130, spa: 55, spd: 120, spe: 80},
		abilities: {0: "Big Pecks", 1: "Overcoat", H: "Weak Armor"},
		heightm: 1.2,
		weightkg: 39.5,
		color: "Brown",
		prevo: "vullaby",
		evoLevel: 54,
		eggGroups: ["Flying"],
	},
	zapdos: {
		num: 145,
		species: "Zapdos",
		types: ["Electric", "Flying"],
		gender: "N",
		baseStats: {hp: 115, atk: 80, def: 105, spa: 140, spd: 120, spe: 120},
		abilities: {0: "Pressure", H: "Static"},
		heightm: 1.6,
		weightkg: 52.6,
		color: "Yellow",
		eggGroups: ["Undiscovered"],
	},
};

exports.BattlePokedex = BattlePokedex;
