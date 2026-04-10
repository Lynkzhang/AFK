import type { GameState, Accessory, Slime } from '../types';
import { ACCESSORY_TEMPLATES, getAccessoryTemplate } from '../data/accessories';

export class AccessorySystem {
  static giveAccessory(state: GameState, templateId: string): Accessory | null {
    const template = getAccessoryTemplate(templateId);
    if (!template) return null;
    const acc: Accessory = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: template.id,
      name: template.name,
      kind: template.kind,
      rarity: template.rarity,
      effect: { ...template.effect },
    };
    state.accessories.push(acc);
    return acc;
  }

  static equip(state: GameState, accessoryId: string, slimeId: string): boolean {
    const acc = state.accessories.find((a) => a.id === accessoryId);
    if (!acc) return false;
    const alreadyEquipped = this.findEquippedBy(state, accessoryId);
    if (alreadyEquipped) return false;
    const slime = state.archivedSlimes.find((s) => s.id === slimeId)
      ?? state.slimes.find((s) => s.id === slimeId);
    if (!slime) return false;
    if (slime.equippedAccessoryId) {
      slime.equippedAccessoryId = undefined;
    }
    slime.equippedAccessoryId = accessoryId;
    return true;
  }

  static unequip(state: GameState, slimeId: string): boolean {
    const slime = state.archivedSlimes.find((s) => s.id === slimeId)
      ?? state.slimes.find((s) => s.id === slimeId);
    if (!slime || !slime.equippedAccessoryId) return false;
    slime.equippedAccessoryId = undefined;
    return true;
  }

  static getAccessories(state: GameState): Accessory[] {
    return state.accessories;
  }

  static getEquipped(state: GameState, slimeId: string): Accessory | undefined {
    const slime = state.archivedSlimes.find((s) => s.id === slimeId)
      ?? state.slimes.find((s) => s.id === slimeId);
    if (!slime?.equippedAccessoryId) return undefined;
    return state.accessories.find((a) => a.id === slime.equippedAccessoryId);
  }

  private static findEquippedBy(state: GameState, accessoryId: string): Slime | undefined {
    return [...state.slimes, ...state.archivedSlimes].find(
      (s) => s.equippedAccessoryId === accessoryId,
    );
  }

  static getUnequipped(state: GameState): Accessory[] {
    const equippedIds = new Set(
      [...state.slimes, ...state.archivedSlimes]
        .filter((s) => s.equippedAccessoryId)
        .map((s) => s.equippedAccessoryId!),
    );
    return state.accessories.filter((a) => !equippedIds.has(a.id));
  }

  static getTemplates(): typeof ACCESSORY_TEMPLATES {
    return ACCESSORY_TEMPLATES;
  }
}
