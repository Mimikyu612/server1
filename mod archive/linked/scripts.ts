export const Scripts: ModdedBattleScriptsData = {
	runMove(moveOrMoveName, pokemon, targetLoc, sourceEffect, zMove, externalMove, maxMove, originalTarget) {
		pokemon.activeMoveActions++;
		let target = this.getTarget(pokemon, maxMove || zMove || moveOrMoveName, targetLoc, originalTarget);
		let baseMove = this.dex.getActiveMove(moveOrMoveName);
		const pranksterBoosted = baseMove.pranksterBoosted;
		if (baseMove.id !== 'struggle' && !zMove && !maxMove && !externalMove) {
			const changedMove = this.runEvent('OverrideAction', pokemon, target, baseMove);
			if (changedMove && changedMove !== true) {
				baseMove = this.dex.getActiveMove(changedMove);
				if (pranksterBoosted) baseMove.pranksterBoosted = pranksterBoosted;
				target = this.getRandomTarget(pokemon, baseMove);
			}
		}
		let move = baseMove;
		if (zMove) {
			move = this.getActiveZMove(baseMove, pokemon);
		} else if (maxMove) {
			move = this.getActiveMaxMove(baseMove, pokemon);
		}

		move.isExternal = externalMove;

		this.setActiveMove(move, pokemon, target);

		/* if (pokemon.moveThisTurn) {
			// THIS IS PURELY A SANITY CHECK
			// DO NOT TAKE ADVANTAGE OF THIS TO PREVENT A POKEMON FROM MOVING;
			// USE this.queue.cancelMove INSTEAD
			this.debug('' + pokemon.id + ' INCONSISTENT STATE, ALREADY MOVED: ' + pokemon.moveThisTurn);
			this.clearActiveMove(true);
			return;
		} */
		const willTryMove = this.runEvent('BeforeMove', pokemon, target, move);
		if (!willTryMove) {
			if (pokemon.volatiles['twoturnmove']?.move === move.id) {
				pokemon.removeVolatile('twoturnmove');
			}
			this.runEvent('MoveAborted', pokemon, target, move);
			this.clearActiveMove(true);
			// The event 'BeforeMove' could have returned false or null
			// false indicates that this counts as a move failing for the purpose of calculating Stomping Tantrum's base power
			// null indicates the opposite, as the Pokemon didn't have an option to choose anything
			pokemon.moveThisTurnResult = willTryMove;
			return;
		}
		if (move.beforeMoveCallback) {
			if (move.beforeMoveCallback.call(this, pokemon, target, move)) {
				this.clearActiveMove(true);
				pokemon.moveThisTurnResult = false;
				return;
			}
		}
		pokemon.lastDamage = 0;
		let lockedMove;
		if (!externalMove) {
			lockedMove = this.runEvent('LockMove', pokemon);
			if (lockedMove === true) lockedMove = false;
			if (!lockedMove) {
				if (!pokemon.deductPP(baseMove, null, target) && (move.id !== 'struggle')) {
					this.add('cant', pokemon, 'nopp', move);
					const gameConsole = [
						null, 'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'DS', 'DS', '3DS', '3DS',
					][this.gen] || 'Switch';
					this.hint(`This is not a bug, this is really how it works on the ${gameConsole}; try it yourself if you don't believe us.`);
					this.clearActiveMove(true);
					pokemon.moveThisTurnResult = false;
					return;
				}
			} else {
				sourceEffect = this.dex.getEffect('lockedmove');
			}
			pokemon.moveUsed(move, targetLoc);
		}

		// Dancer Petal Dance hack
		// TODO: implement properly
		const noLock = externalMove && !pokemon.volatiles.lockedmove;

		if (zMove) {
			if (pokemon.illusion) {
				this.singleEvent('End', this.dex.getAbility('Illusion'), pokemon.abilityData, pokemon);
			}
			this.add('-zpower', pokemon);
			pokemon.side.zMoveUsed = true;
		}
		const moveDidSomething = this.useMove(baseMove, pokemon, target, sourceEffect, zMove, maxMove);
		if (this.activeMove) move = this.activeMove;
		this.singleEvent('AfterMove', move, null, pokemon, target, move);
		this.runEvent('AfterMove', pokemon, target, move);

		// Dancer's activation order is completely different from any other event, so it's handled separately
		if (move.flags['dance'] && moveDidSomething && !move.isExternal) {
			const dancers = [];
			for (const currentPoke of this.getAllActive()) {
				if (pokemon === currentPoke) continue;
				if (currentPoke.hasAbility('dancer') && !currentPoke.isSemiInvulnerable()) {
					dancers.push(currentPoke);
				}
			}
			// Dancer activates in order of lowest speed stat to highest
			// Note that the speed stat used is after any volatile replacements like Speed Swap,
			// but before any multipliers like Agility or Choice Scarf
			// Ties go to whichever Pokemon has had the ability for the least amount of time
			dancers.sort(
				(a, b) => -(b.storedStats['spe'] - a.storedStats['spe']) || b.abilityOrder - a.abilityOrder
			);
			for (const dancer of dancers) {
				if (this.faintMessages()) break;
				if (dancer.fainted) continue;
				this.add('-activate', dancer, 'ability: Dancer');
				// @ts-ignore - the Dancer ability can't trigger on a move where target is null because it does not copy failed moves.
				const dancersTarget = target.side !== dancer.side && pokemon.side === dancer.side ? target : pokemon;
				// @ts-ignore
				this.runMove(move.id, dancer, this.getTargetLoc(dancersTarget, dancer), this.dex.getAbility('dancer'), undefined, true);
			}
		}
		if (noLock && pokemon.volatiles.lockedmove) delete pokemon.volatiles.lockedmove;
	},

	getActionSpeed(action: AnyObject) {
		if (action.choice === 'move') {
			let move = action.move;
			if (action.zmove) {
				const zMoveName = this.getZMove(action.move, action.pokemon, true);
				if (zMoveName) {
					const zMove = this.dex.getActiveMove(zMoveName);
					if (zMove.exists && zMove.isZ) {
						move = zMove;
					}
				}
			}
			if (action.maxMove) {
				const maxMoveName = this.getMaxMove(action.maxMove, action.pokemon);
				if (maxMoveName) {
					const maxMove = this.getActiveMaxMove(action.move, action.pokemon);
					if (maxMove.exists && maxMove.isMax) {
						move = maxMove;
					}
				}
			}
			// take priority from the base move, so abilities like Prankster only apply once
			// (instead of compounding every time `getActionSpeed` is called)
			let priority = this.dex.getMove(move.id).priority;
			// Grassy Glide priority
			priority = this.singleEvent('ModifyPriority', move, null, action.pokemon, null, null, priority);
			priority = this.runEvent('ModifyPriority', action.pokemon, null, move, priority);
			// Linked mod
			const linkedMoves: [string, string] = action.pokemon.getLinkedMoves();
			let linkIndex = -1;
			if (linkedMoves.length && !move.isZ && !move.isMax && (linkIndex = linkedMoves.indexOf(toID(action.move))) >= 0) {
				// @ts-ignore
				const linkedActions = action.linked || linkedMoves.map(moveid => this.dex.getActiveMove(moveid));
				const altMove = linkedActions[1 - linkIndex];
				const thisPriority = this.runEvent('ModifyPriority', action.pokemon, null, linkedActions[linkIndex], priority);
				const thatPriority = this.runEvent('ModifyPriority', action.pokemon, null, altMove, altMove.priority);
				priority = Math.min(thisPriority, thatPriority);
				action.priority = priority + action.fractionalPriority;
				if (this.gen > 5) {
					// Gen 6+: Quick Guard blocks moves with artificially enhanced priority.
					// This also applies to Psychic Terrain.
					linkedActions[linkIndex].priority = priority;
					altMove.priority = priority;
				}
			} else {
				action.priority = priority + action.fractionalPriority;
				// In Gen 6, Quick Guard blocks moves with artificially enhanced priority.
				if (this.gen > 5) action.move.priority = priority;
			}
		}

		if (!action.pokemon) {
			action.speed = 1;
		} else {
			action.speed = action.pokemon.getActionSpeed();
		}
	},

	runAction(action) {
		const pokemonOriginalHP = action.pokemon?.hp;
		// returns whether or not we ended in a callback
		switch (action.choice) {
		case 'start': {
			// I GIVE UP, WILL WRESTLE WITH EVENT SYSTEM LATER
			const format = this.format;

			// Remove Pok??mon duplicates remaining after `team` decisions.
			for (const side of this.sides) {
				side.pokemon = side.pokemon.slice(0, side.pokemonLeft);
			}

			if (format.teamLength && format.teamLength.battle) {
				// Trim the team: not all of the Pok??mon brought to Preview will battle.
				for (const side of this.sides) {
					side.pokemon = side.pokemon.slice(0, format.teamLength.battle);
					side.pokemonLeft = side.pokemon.length;
				}
			}

			this.add('start');
			for (const side of this.sides) {
				for (let pos = 0; pos < side.active.length; pos++) {
					this.switchIn(side.pokemon[pos], pos);
				}
			}
			for (const pokemon of this.getAllPokemon()) {
				this.singleEvent('Start', this.dex.getEffectByID(pokemon.species.id), pokemon.speciesData, pokemon);
			}
			this.midTurn = true;
			break;
		}

		case 'move':
			if (!action.pokemon.isActive) return false;
			if (action.pokemon.fainted) return false;
			// Linked moves
			// @ts-ignore
			if (action.linked) {
				// @ts-ignore
				const linkedMoves: ActiveMove[] = action.linked;
				for (let i = linkedMoves.length - 1; i >= 0; i--) {
					const validTarget = this.validTargetLoc(action.targetLoc, action.pokemon, linkedMoves[i].target);
					const targetLoc = validTarget ? action.targetLoc : 0;
					const pseudoAction: Action = {
						choice: 'move', priority: action.priority, speed: action.speed, pokemon: action.pokemon,
						targetLoc: targetLoc, moveid: linkedMoves[i].id, move: linkedMoves[i], mega: action.mega,
						order: action.order, fractionalPriority: action.fractionalPriority, originalTarget: action.originalTarget,
					};
					this.queue.unshift(pseudoAction);
				}
				return;
			}
			this.runMove(action.move, action.pokemon, action.targetLoc, action.sourceEffect,
				action.zmove, undefined, action.maxMove, action.originalTarget);
			break;
		case 'megaEvo':
			this.runMegaEvo(action.pokemon);
			break;
		case 'runDynamax':
			action.pokemon.addVolatile('dynamax');
			for (const pokemon of action.pokemon.side.pokemon) {
				pokemon.canDynamax = false;
			}
			break;
		case 'beforeTurnMove': {
			if (!action.pokemon.isActive) return false;
			if (action.pokemon.fainted) return false;
			this.debug('before turn callback: ' + action.move.id);
			const target = this.getTarget(action.pokemon, action.move, action.targetLoc);
			if (!target) return false;
			if (!action.move.beforeTurnCallback) throw new Error(`beforeTurnMove has no beforeTurnCallback`);
			action.move.beforeTurnCallback.call(this, action.pokemon, target);
			break;
		}

		case 'event':
			// @ts-ignore - easier than defining a custom event attribute TBH
			this.runEvent(action.event, action.pokemon);
			break;
		case 'team': {
			action.pokemon.side.pokemon.splice(action.index, 0, action.pokemon);
			action.pokemon.position = action.index;
			// we return here because the update event would crash since there are no active pokemon yet
			return;
		}

		case 'pass':
			return;
		case 'instaswitch':
		case 'switch':
			if (action.choice === 'switch' && action.pokemon.status && this.dex.data.Abilities.naturalcure) {
				this.singleEvent('CheckShow', this.dex.getAbility('naturalcure'), null, action.pokemon);
			}
			if (this.switchIn(action.target, action.pokemon.position, action.sourceEffect) === 'pursuitfaint') {
				// a pokemon fainted from Pursuit before it could switch
				if (this.gen <= 4) {
					// in gen 2-4, the switch still happens
					this.hint("Previously chosen switches continue in Gen 2-4 after a Pursuit target faints.");
					action.priority = -101;
					this.queue.unshift(action);
					break;
				} else {
					// in gen 5+, the switch is cancelled
					this.hint("A Pokemon can't switch between when it runs out of HP and when it faints");
					break;
				}
			}
			break;
		case 'runUnnerve':
			this.singleEvent('PreStart', action.pokemon.getAbility(), action.pokemon.abilityData, action.pokemon);
			break;
		case 'runSwitch':
			this.runSwitch(action.pokemon);
			break;
		case 'runPrimal':
			if (!action.pokemon.transformed) {
				this.singleEvent('Primal', action.pokemon.getItem(), action.pokemon.itemData, action.pokemon);
			}
			break;
		case 'shift': {
			if (!action.pokemon.isActive) return false;
			if (action.pokemon.fainted) return false;
			this.swapPosition(action.pokemon, 1);
			break;
		}

		case 'beforeTurn':
			this.eachEvent('BeforeTurn');
			break;
		case 'residual':
			this.add('');
			this.clearActiveMove(true);
			this.updateSpeed();
			const residualPokemon = this.getAllActive().map(pokemon => [pokemon, pokemon.hp] as const);
			this.residualEvent('Residual');
			for (const [pokemon, originalHP] of residualPokemon) {
				if (pokemon.hp && pokemon.hp <= pokemon.maxhp / 2 && originalHP > pokemon.maxhp / 2) {
					this.runEvent('EmergencyExit', pokemon);
				}
			}
			this.add('upkeep');
			break;
		}

		// phazing (Roar, etc)
		for (const side of this.sides) {
			for (const pokemon of side.active) {
				if (pokemon.forceSwitchFlag) {
					if (pokemon.hp) this.dragIn(pokemon.side, pokemon.position);
					pokemon.forceSwitchFlag = false;
				}
			}
		}

		this.clearActiveMove();

		// fainting

		this.faintMessages();
		if (this.ended) return true;

		// switching (fainted pokemon, U-turn, Baton Pass, etc)

		if (!this.queue.peek() || (this.gen <= 3 && ['move', 'residual'].includes(this.queue.peek()!.choice))) {
			// in gen 3 or earlier, switching in fainted pokemon is done after
			// every move, rather than only at the end of the turn.
			this.checkFainted();
		} else if (action.choice === 'megaEvo' && this.gen === 7) {
			this.eachEvent('Update');
			// In Gen 7, the action order is recalculated for a Pok??mon that mega evolves.
			for (const [i, queuedAction] of this.queue.entries()) {
				if (queuedAction.pokemon === action.pokemon && queuedAction.choice === 'move') {
					this.queue.list.splice(i, 1);
					queuedAction.mega = 'done';
					this.queue.insertChoice(queuedAction, true);
					break;
				}
			}
			return false;
		} else if (this.queue.peek()?.choice === 'instaswitch') {
			return false;
		}

		if (this.gen >= 5) {
			this.eachEvent('Update');
		}

		if (action.choice === 'runSwitch') {
			const pokemon = action.pokemon;
			if (pokemon.hp && pokemon.hp <= pokemon.maxhp / 2 && pokemonOriginalHP! > pokemon.maxhp / 2) {
				this.runEvent('EmergencyExit', pokemon);
			}
		}

		const switches = this.sides.map(
			side => side.active.some(pokemon => pokemon && !!pokemon.switchFlag)
		);

		for (let i = 0; i < this.sides.length; i++) {
			if (switches[i] && !this.canSwitch(this.sides[i])) {
				for (const pokemon of this.sides[i].active) {
					pokemon.switchFlag = false;
				}
				switches[i] = false;
			}
		}

		for (const playerSwitch of switches) {
			if (playerSwitch) {
				this.makeRequest('switch');
				return true;
			}
		}

		if (this.gen < 5) this.eachEvent('Update');

		if (this.gen >= 8 && this.queue.peek()?.choice === 'move') {
			// In gen 8, speed is updated dynamically so update the queue's speed properties and sort it.
			this.updateSpeed();
			for (const queueAction of this.queue) {
				if (queueAction.pokemon) this.getActionSpeed(queueAction);
			}
			this.queue.sort();
		}

		return false;
	},
	queue: {
		resolveAction(action, midTurn = false) {
			if (!action) throw new Error(`Action not passed to resolveAction`);
			if (action.choice === 'pass') return [];
			const actions = [action];

			if (!action.side && action.pokemon) action.side = action.pokemon.side;
			if (!action.move && action.moveid) action.move = this.battle.dex.getActiveMove(action.moveid);
			if (!action.order) {
				const orders: {[choice: string]: number} = {
					team: 1,
					start: 2,
					instaswitch: 3,
					beforeTurn: 4,
					beforeTurnMove: 5,

					runUnnerve: 100,
					runSwitch: 101,
					runPrimal: 102,
					switch: 103,
					megaEvo: 104,
					runDynamax: 105,

					shift: 200,
					// default is 200 (for moves)

					residual: 300,
				};
				if (action.choice in orders) {
					action.order = orders[action.choice];
				} else {
					action.order = 200;
					if (!['move', 'event'].includes(action.choice)) {
						throw new Error(`Unexpected orderless action ${action.choice}`);
					}
				}
			}
			if (!midTurn) {
				if (action.choice === 'move') {
					if (!action.maxMove && !action.zmove && action.move.beforeTurnCallback) {
						actions.unshift(...this.resolveAction({
							choice: 'beforeTurnMove', pokemon: action.pokemon, move: action.move, targetLoc: action.targetLoc,
						}));
					}
					if (action.mega) {
						// TODO: Check that the Pok??mon is not affected by Sky Drop.
						// (This is currently being done in `runMegaEvo`).
						actions.unshift(...this.resolveAction({
							choice: 'megaEvo',
							pokemon: action.pokemon,
						}));
					}
					if (action.maxMove && !action.pokemon.volatiles['dynamax']) {
						actions.unshift(...this.resolveAction({
							choice: 'runDynamax',
							pokemon: action.pokemon,
						}));
					}
					action.fractionalPriority = this.battle.runEvent('FractionalPriority', action.pokemon, null, action.move, 0);
					const linkedMoves: [string, string] = action.pokemon.getLinkedMoves();
					if (linkedMoves.length && !action.pokemon.getItem().isChoice && !action.zmove && !action.maxMove) {
						const decisionMove = toID(action.move);
						if (linkedMoves.includes(decisionMove)) {
							// @ts-ignore
							action.linked = linkedMoves.map(moveid => this.battle.dex.getActiveMove(moveid));
							// @ts-ignore
							const linkedOtherMove = action.linked[1 - linkedMoves.indexOf(decisionMove)];
							if (linkedOtherMove.beforeTurnCallback) {
								this.addChoice({
									choice: 'beforeTurnMove',
									pokemon: action.pokemon,
									move: linkedOtherMove,
									targetLoc: action.targetLoc,
								});
							}
						}
					}
				} else if (['switch', 'instaswitch'].includes(action.choice)) {
					if (typeof action.pokemon.switchFlag === 'string') {
						action.sourceEffect = this.battle.dex.getMove(action.pokemon.switchFlag as ID) as any;
					}
					action.pokemon.switchFlag = false;
				}
			}

			const deferPriority = this.battle.gen === 7 && action.mega && action.mega !== 'done';
			if (action.move) {
				let target = null;
				action.move = this.battle.dex.getActiveMove(action.move);

				if (!action.targetLoc) {
					target = this.battle.getRandomTarget(action.pokemon, action.move);
					// TODO: what actually happens here?
					if (target) action.targetLoc = this.battle.getTargetLoc(target, action.pokemon);
				}
				action.originalTarget = this.battle.getAtLoc(action.pokemon, action.targetLoc);
			}
			if (!deferPriority) this.battle.getActionSpeed(action);
			return actions as any;
		},
	},
	pokemon: {
		moveUsed(move, targetLoc) {
			if (!this.moveThisTurn) this.m.lastMoveAbsolute = move;
			this.lastMove = move;
			this.moveThisTurn = move.id;
			this.lastMoveTargetLoc = targetLoc;
		},
		getLinkedMoves(ignoreDisabled) {
			const linkedMoves = this.moveSlots.slice(0, 2);
			if (linkedMoves.length !== 2 || linkedMoves[0].pp <= 0 || linkedMoves[1].pp <= 0) return [];
			const ret = [linkedMoves[0].id, linkedMoves[1].id];
			if (ignoreDisabled) return ret;
			if (!this.ateBerry && ret.includes('belch' as ID)) return [];
			if (this.hasItem('assaultvest') &&
				(this.battle.dex.getMove(ret[0]).category === 'Status' || this.battle.dex.getMove(ret[1]).category === 'Status')) {
				return [];
			}
			return ret;
		},
		hasLinkedMove(moveid) {
			// @ts-ignore
			const linkedMoves: ID[] = this.getLinkedMoves(true);
			if (!linkedMoves.length) return false;
			return linkedMoves.some(x => x === moveid);
		},
	},
};
