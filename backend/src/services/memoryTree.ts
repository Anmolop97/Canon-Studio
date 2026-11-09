import { StoryNode, StoryNodeChoice } from '../types/index.js';
import { sampleStoryTree } from '../data/defaultStoryBible.js';

export class MemoryTreeService {
  private nodes: Map<string, StoryNode> = new Map();

  constructor() {
    // Initialize with default canonical tree
    sampleStoryTree.forEach(node => this.nodes.set(node.id, { ...node }));
  }

  public getAllNodes(): StoryNode[] {
    return Array.from(this.nodes.values());
  }

  public getNodeById(id: string): StoryNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Calculates the full inherited state along a branch path
   */
  public resolveBranchState(nodeId: string): StoryNode['activeState'] {
    const targetNode = this.nodes.get(nodeId);
    if (!targetNode) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    return targetNode.activeState;
  }

  /**
   * Creates a new branch dynamically when a user makes an unscripted choice
   */
  public createBranch(
    parentNodeId: string, 
    choiceText: string, 
    newSceneTitle: string, 
    newSummary: string,
    delta: StoryNodeChoice['stateDelta']
  ): StoryNode {
    const parent = this.nodes.get(parentNodeId);
    if (!parent) {
      throw new Error(`Parent node ${parentNodeId} not found`);
    }

    const newNodeId = `node-dyn-${Date.now()}`;
    const choiceId = `choice-dyn-${Date.now()}`;

    // Compute inherited state
    const currentRep = { ...parent.activeState.factionReputation };
    if (delta.factionReputation) {
      Object.entries(delta.factionReputation).forEach(([faction, change]) => {
        currentRep[faction] = (currentRep[faction] || 0) + change;
      });
    }

    let currentInventory = [...parent.activeState.inventory];
    if (delta.inventoryChanges) {
      delta.inventoryChanges.forEach(item => {
        if (item.startsWith('+')) {
          currentInventory.push(item.substring(1));
        } else if (item.startsWith('-')) {
          const toRemove = item.substring(1);
          currentInventory = currentInventory.filter(i => i !== toRemove);
        }
      });
    }

    const currentSecrets = Array.from(new Set([
      ...parent.activeState.unlockedSecrets,
      ...(delta.secretsUnlocked || [])
    ]));

    const currentStatus = {
      ...parent.activeState.characterStatus,
      ...(delta.statusChanges || {})
    };

    const newNode: StoryNode = {
      id: newNodeId,
      episodeNumber: parent.episodeNumber + 1,
      sceneTitle: newSceneTitle,
      summary: newSummary,
      activeState: {
        factionReputation: currentRep,
        inventory: currentInventory,
        unlockedSecrets: currentSecrets,
        characterStatus: currentStatus
      },
      choices: []
    };

    // Attach choice to parent
    parent.choices.push({
      id: choiceId,
      choiceText,
      targetNodeId: newNodeId,
      stateDelta: delta
    });

    this.nodes.set(newNodeId, newNode);
    return newNode;
  }
}

export const memoryTreeService = new MemoryTreeService();
