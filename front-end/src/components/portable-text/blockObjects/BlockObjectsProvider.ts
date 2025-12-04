import type BlockObject from "./BlockObject";
import ImageBlockObject, { type ImageValue } from "./blocks/Image";

export type AllBlockObjectsValuesType = ImageValue;

export default class BlockObjectsProvider {
  BlockObjects: Array<BlockObject<AllBlockObjectsValuesType>>;

  constructor() {
    this.BlockObjects = [];
  }

  registerBlockObject(blockObject: BlockObject<AllBlockObjectsValuesType>) {
    this.BlockObjects.push(blockObject);
  }

  getBlockObjects() {
    if (this.BlockObjects.length === 0) {
      this.registerAll();
    }
    return this.BlockObjects;
  }

  getBlockObjectByNameOrNull(
    name: string
  ): BlockObject<AllBlockObjectsValuesType> | null {
    return this.BlockObjects.find((bo) => bo.name === name) || null;
  }

  registerAll() {
    this.registerBlockObject(ImageBlockObject);
  }

  getBlockTypes() {
    return this.BlockObjects.map((bo) => bo.name);
  }
}
