import { applyOperation } from "./commands";
import type { MindMapDocument, MindMapOperation } from "./types";

export interface HistorySnapshot {
  past: MindMapOperation[];
  future: MindMapOperation[];
}

export class HistoryManager {
  private past: MindMapOperation[] = [];
  private future: MindMapOperation[] = [];

  constructor(private document: MindMapDocument) {}

  get current(): MindMapDocument {
    return this.document;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  record(operation?: MindMapOperation) {
    if (!operation) return;
    this.past.push(operation);
    this.future = [];
    this.document = operation.after;
  }

  undo(): MindMapDocument {
    const operation = this.past.pop();
    if (!operation) return this.document;
    this.future.unshift(operation);
    this.document = applyOperation(operation, "inverse");
    return this.document;
  }

  redo(): MindMapDocument {
    const operation = this.future.shift();
    if (!operation) return this.document;
    this.past.push(operation);
    this.document = applyOperation(operation, "forward");
    return this.document;
  }

  reset(document: MindMapDocument) {
    this.document = document;
    this.past = [];
    this.future = [];
  }

  snapshot(): HistorySnapshot {
    return {
      past: [...this.past],
      future: [...this.future],
    };
  }
}
