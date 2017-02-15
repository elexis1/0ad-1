/**
 * If set to true, it will print how many templates would be spawned if the players were not defeated.
 */
const dryRun = false;

/**
 * Spawn new treasure each time this interval has passed.
 */
var treasureTime = 4;

/**
 * When the first wave will be started.
 */
var firstWaveTime = 2 + Math.random() * 3;

/**
 * Least amount of time between two waves.
 */
var minWaveTime = 2;

/**
 * Greatest amount of time between two waves.
 */
var maxWaveTime = 5;

/**
 * Number of attackers on the first wave.
 */
var firstWaveAttackers = 8;

/**
 * Increase the number of attackers exponentially, by this percent value per minute.
 */
var percentPerMinute = 1.03;

/**
 * Greatest number of attacker that can be spawned.
 */
var totalAttackerLimit = 300;

/**
 * Least amount of siege per wave.
 */
var minSiegeFraction = 0.2;

/**
 * Greatest amount of siege per wave.
 */
var maxSiegeFraction = 0.5;

/**
 * Least amount of time to pass until potentially spawning gaia heroes.
 */
var minHeroTime = 20;

/**
 * Definitely spawn heroes after this time.
 */
var maxHeroTime = 60;

/**
 * The following templates can't be built by any player.
 */
var disabledTemplates = (civ) => [
	// Economic structures
	"structures/" + civ + "_corral",
	"structures/" + civ + "_farmstead",
	"structures/" + civ + "_field",
	"structures/" + civ + "_storehouse",
	"structures/" + civ + "_rotarymill",
	"units/maur_support_elephant",

	// Expansions
	"structures/" + civ + "_civil_centre",
	"structures/" + civ + "_military_colony",

	// Walls
	"structures/" + civ + "_wallset_stone",
	"structures/rome_wallset_siege",
	"other/wallset_palisade",

	// Shoreline
	"structures/" + civ + "_dock",
	"structures/brit_crannog",
	"structures/cart_super_dock",
	"structures/ptol_lighthouse"
];

/**
 * Spawn these treasures in regular intervals.
 * TODO: spawn enemy gaia women simultaenously later
 */
var treasures = [
	"gaia/special_treasure_food_barrel",
	"gaia/special_treasure_food_bin",
	"gaia/special_treasure_food_crate",
	"gaia/special_treasure_food_jars",
	"gaia/special_treasure_metal",
	"gaia/special_treasure_stone",
	"gaia/special_treasure_wood",
	"gaia/special_treasure_wood",
	"gaia/special_treasure_wood"
];

var attackerEntityTemplates = {
	"athen": {
		"champions": [
			"athen_champion_infantry",
			"athen_champion_marine",
			"athen_champion_ranged",
		],
		"siege": [
			"athen_mechanical_siege_lithobolos_packed",
			"athen_mechanical_siege_oxybeles_packed",
		],
	},
	"brit": {
		"champions": [
			"brit_champion_cavalry",
			"brit_champion_infantry",
		],
		"siege": [
			"brit_mechanical_siege_ram",
		],
	},
	"cart": {
		"champions": [
			"cart_champion_cavalry",
			"cart_champion_infantry",
			"cart_champion_pikeman",
		],
		"siege": [
			"cart_champion_elephant",
			"cart_mechanical_siege_ballista_packed",
		],
	},
	"gaul": {
		"champions": [
			"gaul_champion_cavalry",
			"gaul_champion_fanatic",
			"gaul_champion_infantry",
		],
		"siege": [
			"gaul_mechanical_siege_ram",
		],
	},
	"iber": {
		"champions": [
			"iber_champion_cavalry",
			"iber_champion_infantry",
		],
		"siege": [
			"iber_mechanical_siege_ram",
		],
	},
	"mace": {
		"champions": [
			"mace_champion_cavalry",
			"mace_champion_infantry_a",
			"mace_champion_infantry_e",
		],
		"siege": [
			"mace_mechanical_siege_lithobolos_packed",
			"mace_mechanical_siege_oxybeles_packed",
		],
	},
	"maur": {
		"champions": [
			"maur_champion_chariot",
			"maur_champion_infantry",
			"maur_champion_maiden",
			"maur_champion_maiden_archer",
		],
		"siege": [
			"maur_champion_elephant",
		],
	},
	"pers": {
		"champions": [
			"pers_champion_cavalry",
			"pers_champion_infantry",
		],
		"siege": [
			"pers_champion_elephant",
		],
	},
	"ptol": {
		"champions": [
			"ptol_champion_cavalry",
		],
		"siege": [
			"ptol_champion_elephant",
		],
	},
	"rome": {
		"champions": [
			"rome_champion_cavalry",
			"rome_champion_infantry",
		],
		"siege": [
			"rome_mechanical_siege_ballista_packed",
			"rome_mechanical_siege_scorpio_packed",
		],
	},
	"sele": {
		"champions": [
			"sele_champion_cavalry",
			"sele_champion_chariot",
			"sele_champion_infantry_pikeman",
			"sele_champion_infantry_swordsman",
		],
		"siege": [
			"sele_champion_elephant",
		],
	},
	"spart": {
		"champions": [
			"spart_champion_infantry_pike",
			"spart_champion_infantry_spear",
			"spart_champion_infantry_sword",
		],
		"siege": [
			"spart_mechanical_siege_ram",
		],
	}
};

Trigger.prototype.StartAnEnemyWave = function()
{
	let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	let currentMin = cmpTimer.GetTime() / 60000;

	let nextWaveTime = Math.round(minWaveTime + Math.random() * (maxWaveTime - minWaveTime));

	// Determine attacker civ
	let civs = Object.keys(attackerEntityTemplates);
	let civ = civs[Math.floor(Math.random() * civs.length)];

	// Determine total attacker count of the wave
	let totalAttackers = Math.ceil(Math.min(totalAttackerLimit,
		firstWaveAttackers * Math.pow(percentPerMinute, currentMin - firstWaveTime) * nextWaveTime/maxWaveTime));

	print("DEBUG [" + Math.round(currentMin) + "]  Spawning " + totalAttackers + " attackers\n");

	let attackerTemplates = [];

	// Add hero
	let spawnHero = currentMin > Math.random() * (maxHeroTime - minHeroTime) + minHeroTime;
	if (spawnHero)
	{
		print("DEBUG   Spawning hero\n");
		attackerTemplates.push({
			"template": attackerEntityTemplates[civ].heroes[Math.floor(Math.random() * attackerEntityTemplates[civ].heroes.length)],
			"count": 1,
			"hero": true
		});
		--totalAttackers;
	}

	// Random siege to champion ratio
	let siegeRatio = Math.random() * (maxSiegeFraction - minSiegeFraction) + minSiegeFraction;
	let siegeCount = Math.round(siegeRatio * totalAttackers);
	print("DEBUG   Siege Ratio: " + Math.round(siegeRatio * 100) + "%\n");
	let attackerTypeCounts = {
		"siege": siegeCount,
		"champions": totalAttackers - siegeCount
	};

	print("DEBUG   Spawning:" + uneval(attackerTypeCounts) + "\n");
	// Random ratio of the given templates
	for (let attackerType in attackerTypeCounts)
	{
		let attackerTypeCount = attackerTypeCounts[attackerType];
		for (let i in attackerEntityTemplates[civ][attackerType])
		{
			let count =
				+i == attackerEntityTemplates[civ][attackerType].length - 1 ?
				attackerTypeCount :
				Math.min(attackerTypeCount, Math.round(Math.random() * attackerTypeCount));

			attackerTemplates.push({
				"template": attackerEntityTemplates[civ][attackerType][i],
				"count": count
			});
			attackerTypeCount -= count;
		}
	}

	// Spawn the templates
	let spawned = false;
	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	for (let point of this.GetTriggerPoints("A"))
	{
		let cmpPlayer = QueryOwnerInterface(point, IID_Player);

		// Trigger point owned by Gaia if the player is defeated
		if (!dryRun && cmpPlayer.GetPlayerID() == 0)
			continue;

		var cmpPosition =  Engine.QueryInterface(this.playerCivicCenter[cmpPlayer.GetPlayerID()], IID_Position);
		var targetPos = cmpPosition.GetPosition();

		for (let attackerTemplate of attackerTemplates)
		{
			// Don't spawn gaia hero if the previous one is still alive
			if (attackerTemplate.hero && this.gaiaHeroes[cmpPlayer.GetPlayerID()])
			{
				let cmpHealth = Engine.QueryInterface(this.gaiaHeroes[cmpPlayer.GetPlayerID()], IID_Health);
				if (cmpHealth && cmpHealth.GetHitpoints() != 0)
				{
					print("DEBUG   Not spawning hero for player " + cmpPlayer.GetPlayerID() + " as the previous one is still alive\n");
					continue;
				}
			}

			if (dryRun)
				continue;

			let entities = TriggerHelper.SpawnUnits(point, "units/" + attackerTemplate.template, attackerTemplate.count, 0);
			ProcessCommand(0, {
				"type": "attack-walk",
				"entities": entities,
				"x": targetPos.x,
				"z": targetPos.z,
				"queued": true,
				"targetClasses": undefined
			});

			if (attackerTemplate.hero)
				this.gaiaHeroes[cmpPlayer.GetPlayerID()] = entities[0];
		}
		spawned = true;
	}

	if (!spawned)
		return;

	let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.PushNotification({
		"message": markForTranslation("An enemy wave is attacking!"),
		"translateMessage": true
	});
	this.DoAfterDelay(nextWaveTime * 60 * 1000, "StartAnEnemyWave", {});
};

Trigger.prototype.InitGame = function()
{
	// Load Hero Templates
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	for (let templateName of cmpTemplateManager.FindAllTemplates(false))
	{
		if (templateName.substring(0,6) != "units/")
			continue;

		let identity = cmpTemplateManager.GetTemplate(templateName).Identity;
		if (GetIdentityClasses(identity).indexOf("Hero") == -1)
			continue;

		if (!attackerEntityTemplates[identity.Civ].heroes)
			attackerEntityTemplates[identity.Civ].heroes = [];

		attackerEntityTemplates[identity.Civ].heroes.push(templateName.substring(6));
	}

	// Remember civic centers and make women invincible
	let numberOfPlayers = TriggerHelper.GetNumberOfPlayers();
	for (let i = 1; i < numberOfPlayers; ++i)
	{
		let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		let playerEntities = cmpRangeManager.GetEntitiesByPlayer(i);

		for (let entity of playerEntities)
		{
			if (TriggerHelper.EntityHasClass(entity, "CivilCentre"))
				this.playerCivicCenter[i] = entity;
			else if (TriggerHelper.EntityHasClass(entity, "Female"))
			{
				let cmpDamageReceiver = Engine.QueryInterface(entity, IID_DamageReceiver);
				cmpDamageReceiver.SetInvulnerability(true);

				let cmpHealth = Engine.QueryInterface(entity, IID_Health);
				cmpHealth.SetUndeletable(true);
			}
		}
	}

	this.PlaceTreasures();

	for (let i = 1; i < numberOfPlayers; ++i)
	{
		let cmpPlayer = QueryPlayerIDInterface(i);
		let civ = cmpPlayer.GetCiv();
		cmpPlayer.SetDisabledTemplates(disabledTemplates(civ));
	}
};

Trigger.prototype.PlaceTreasures = function()
{
	let point = ["B", "C", "D"][Math.floor(Math.random() * 3)];
	let triggerPoints = this.GetTriggerPoints(point);
	for (let point of triggerPoints)
	{
		let template = treasures[Math.floor(Math.random() * treasures.length)];
		TriggerHelper.SpawnUnits(point, template, 1, 0);
	}
	this.DoAfterDelay(treasureTime * 60 * 1000, "PlaceTreasures", {});
};

Trigger.prototype.InitializeEnemyWaves = function()
{
	let time = firstWaveTime * 60 * 1000;
	let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
	cmpGUIInterface.AddTimeNotification({
		"message": markForTranslation("The first wave will start in %(time)s!"),
		"translateMessage": true
	}, time);
	this.DoAfterDelay(time, "StartAnEnemyWave", {});
};

Trigger.prototype.DefeatPlayerOnceCCIsDestroyed = function(data)
{
	if (data.entity == this.playerCivicCenter[data.from])
		TriggerHelper.DefeatPlayer(data.from);
};


{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.playerCivicCenter = [];
	cmpTrigger.gaiaHeroes = [];
	cmpTrigger.DoAfterDelay(1000, "InitializeEnemyWaves", {});
	cmpTrigger.RegisterTrigger("OnInitGame", "InitGame", { "enabled": true });
	cmpTrigger.RegisterTrigger("OnOwnershipChanged", "DefeatPlayerOnceCCIsDestroyed", { "enabled": true });
}
