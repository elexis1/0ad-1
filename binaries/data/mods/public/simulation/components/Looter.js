function Looter() {}

Looter.prototype.Schema =
	"<empty/>";

Looter.prototype.Serialize = null; // We have no dynamic state to save

/**
 * Try to collect loot from target entity
 */
Looter.prototype.Collect = function(targetEntity)
{
	var cmpLoot = Engine.QueryInterface(targetEntity, IID_Loot);
	if (!cmpLoot)
		return;

	var resources = {};
	for (let type of Resources.GetCodes())
		resources[type] = 0;

	// Loot resources as defined in the templates, affected by techs and auras
	var loot = cmpLoot.GetResources();
	for (let type in loot)
		resources[type] = ApplyValueModificationsToEntity("Looter/Resource/" + type, loot[type], this.entity);

	// Loot resources that killed enemies carried
	var cmpResourceGatherer = Engine.QueryInterface(targetEntity, IID_ResourceGatherer);
	if (cmpResourceGatherer)
		for (let resource of cmpResourceGatherer.GetCarryingStatus())
			resources[resource.type] += resource.amount;

	// Loot resources traders carry
	var cmpTrader = Engine.QueryInterface(targetEntity, IID_Trader);
	if (cmpTrader)
	{
		let carriedGoods = cmpTrader.GetGoods();
		if (carriedGoods.amount)
		{
			resources[carriedGoods.type] +=
				+ (carriedGoods.amount.traderGain || 0)
				+ (carriedGoods.amount.market1Gain || 0)
				+ (carriedGoods.amount.market2Gain || 0);
		}
	}

	// Transfer resources
	var cmpPlayer = QueryOwnerInterface(this.entity);
	cmpPlayer.AddResources(resources);

	// Update statistics
	var cmpStatisticsTracker = QueryOwnerInterface(this.entity, IID_StatisticsTracker);
	if (cmpStatisticsTracker)
		cmpStatisticsTracker.IncreaseLootCollectedCounter(resources);
};

Engine.RegisterComponentType(IID_Looter, "Looter", Looter);
